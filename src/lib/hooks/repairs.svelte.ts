import { setContext, getContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { Car, Repair, ModelStats } from '$lib/types.js';
import { toast } from 'svelte-sonner';
import { useDebounce } from '$lib/utils/reactive.svelte';

class UseRepairs {
	cars = $state<Car[]>([]);
	repairs = $state<Repair[]>([]);
	loading = $state(false);
	searchQuery = $state<string>('');
	lastLoadedAt = $state<Date | null>(null);

	private refreshMs = 60000;
	private timer: number | null = null;

	// Filtered repairs based on search query
	filteredRepairs = $derived.by(() => {
		if (!this.searchQuery.trim()) {
			return this.repairs;
		}

		const query = this.searchQuery.toLowerCase();
		return this.repairs.filter(
			(repair) =>
				repair.title.toLowerCase().includes(query) ||
				repair.description?.toLowerCase().includes(query) ||
				repair.status.toLowerCase().includes(query)
		);
	});

	// Debounced search function
	debouncedSearch = useDebounce((query: string) => {
		this.searchQuery = query;
	}, 300);

	constructor() {
		// Load data from API
		if (typeof window !== 'undefined') {
			this.startLoop();
			this.loadData();
		}
	}

	private onFocus = () => {
		void this.loadData();
	};

	private onVisibility = () => {
		if (document.visibilityState !== 'visible') return;
		void this.loadData();
	};

	private onUnload = () => {
		this.stopLoop();
	};

	private startLoop() {
		if (this.timer) return;

		this.timer = window.setInterval(() => {
			if (document.visibilityState !== 'visible') return;
			void this.loadData();
		}, this.refreshMs);

		window.addEventListener('focus', this.onFocus);
		document.addEventListener('visibilitychange', this.onVisibility);
		window.addEventListener('beforeunload', this.onUnload);
	}

	private stopLoop() {
		if (this.timer) {
			window.clearInterval(this.timer);
			this.timer = null;
		}

		window.removeEventListener('focus', this.onFocus);
		document.removeEventListener('visibilitychange', this.onVisibility);
		window.removeEventListener('beforeunload', this.onUnload);
	}

	async loadData() {
		if (this.loading) return;

		this.loading = true;
		try {
			await Promise.all([this.fetchCars(), this.fetchRepairs()]);
			this.lastLoadedAt = new Date();
		} catch (error) {
			console.error('Failed to load data:', error);
			toast.error('Failed to load data');
		} finally {
			this.loading = false;
		}
	}

	async fetchCars() {
		const response = await fetch('/api/cars');
		if (!response.ok) throw new Error('Failed to fetch cars');
		const result = await response.json();
		this.cars = result.data || result; // Handle both wrapped and unwrapped responses
	}

	async fetchRepairs() {
		const response = await fetch('/api/repairs');
		if (!response.ok) throw new Error('Failed to fetch repairs');
		const result = await response.json();
		this.repairs = result.data || result; // Handle both wrapped and unwrapped responses
	}

	brandStats = $derived.by(() => {
		const statsMap = new SvelteMap<
			string,
			{ repairs: Repair[]; models: SvelteMap<string, Repair[]> }
		>();

		this.repairs.forEach((repair) => {
			const car = this.cars.find((c) => c.id === repair.carId);
			if (!car) return;

			if (!statsMap.has(car.brand)) {
				statsMap.set(car.brand, { repairs: [], models: new SvelteMap() });
			}

			const brandData = statsMap.get(car.brand)!;
			brandData.repairs.push(repair);

			if (!brandData.models.has(car.model)) {
				brandData.models.set(car.model, []);
			}
			brandData.models.get(car.model)!.push(repair);
		});

		return Array.from(statsMap.entries())
			.map(([brand, data]) => {
				const totalCost = data.repairs.reduce((sum, r) => sum + r.totalCost, 0);
				const models: ModelStats[] = Array.from(data.models.entries()).map(([model, repairs]) => {
					const modelCost = repairs.reduce((sum, r) => sum + r.totalCost, 0);
					return {
						model,
						totalRepairs: repairs.length,
						totalCost: modelCost,
						averageCost: modelCost / repairs.length
					};
				});

				return {
					brand,
					totalRepairs: data.repairs.length,
					totalCost,
					averageCost: totalCost / data.repairs.length,
					models: models.sort((a, b) => b.totalRepairs - a.totalRepairs)
				};
			})
			.sort((a, b) => b.totalRepairs - a.totalRepairs);
	});

	addCar = async (car: Omit<Car, 'id' | 'createdAt'>) => {
		try {
			const response = await fetch('/api/cars', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(car)
			});
			if (!response.ok) throw new Error('Failed to create car');
			const result = await response.json();
			const newCar = result.data || result;
			this.cars = [...this.cars, newCar];
			toast.success('Car added successfully');
			return newCar.id;
		} catch (error) {
			console.error('Failed to add car:', error);
			toast.error('Failed to add car');
			throw error;
		}
	};

	updateCar = async (id: string, updates: Partial<Car>) => {
		try {
			const response = await fetch(`/api/cars/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});
			if (!response.ok) throw new Error('Failed to update car');
			const result = await response.json();
			const updatedCar = result.data || result;
			this.cars = this.cars.map((car) => (car.id === id ? updatedCar : car));
			toast.success('Car updated successfully');
		} catch (error) {
			console.error('Failed to update car:', error);
			toast.error('Failed to update car');
			throw error;
		}
	};

	deleteCar = async (id: string) => {
		try {
			const response = await fetch(`/api/cars/${id}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to delete car');
			this.cars = this.cars.filter((car) => car.id !== id);
			this.repairs = this.repairs.filter((repair) => repair.carId !== id);
			toast.success('Car deleted successfully');
		} catch (error) {
			console.error('Failed to delete car:', error);
			toast.error('Failed to delete car');
			throw error;
		}
	};

	addRepair = async (repair: Omit<Repair, 'id' | 'createdAt' | 'totalCost'>) => {
		try {
			const partsCost = repair.parts.reduce((sum, p) => sum + p.totalCost, 0);
			const repairData = {
				...repair,
				totalCost: partsCost + repair.laborCost
			};

			const response = await fetch('/api/repairs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(repairData)
			});
			if (!response.ok) throw new Error('Failed to create repair');
			const result = await response.json();
			const newRepair = result.data || result;
			this.repairs = [...this.repairs, newRepair];
			toast.success('Repair added successfully');
			return newRepair.id;
		} catch (error) {
			console.error('Failed to add repair:', error);
			toast.error('Failed to add repair');
			throw error;
		}
	};

	updateRepair = async (id: string, updates: Partial<Repair>) => {
		try {
			const partsCost = updates.parts?.reduce((sum, p) => sum + p.totalCost, 0) || 0;
			const repairData = {
				...updates,
				totalCost: partsCost + (updates.laborCost || 0)
			};

			const response = await fetch(`/api/repairs/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(repairData)
			});
			if (!response.ok) throw new Error('Failed to update repair');
			const result = await response.json();
			const updatedRepair = result.data || result;
			this.repairs = this.repairs.map((repair) => (repair.id === id ? updatedRepair : repair));
			toast.success('Repair updated successfully');
		} catch (error) {
			console.error('Failed to update repair:', error);
			toast.error('Failed to update repair');
			throw error;
		}
	};

	deleteRepair = async (id: string) => {
		try {
			const response = await fetch(`/api/repairs/${id}`, {
				method: 'DELETE'
			});
			if (!response.ok) throw new Error('Failed to delete repair');
			this.repairs = this.repairs.filter((repair) => repair.id !== id);
			toast.success('Repair deleted successfully');
		} catch (error) {
			console.error('Failed to delete repair:', error);
			toast.error('Failed to delete repair');
			throw error;
		}
	};

	uploadPhotos = async (repairId: string, files: File[]) => {
		try {
			const formData = new FormData();
			formData.append('repairId', repairId);
			files.forEach((file) => formData.append('files', file));

			const response = await fetch('/api/photos', {
				method: 'POST',
				body: formData
			});
			if (!response.ok) throw new Error('Failed to upload photos');
			const result = await response.json();
			const uploadedPhotos = result.data || result;
			const photoCount = Array.isArray(uploadedPhotos) ? uploadedPhotos.length : 1;
			toast.success(`${photoCount} photo(s) uploaded successfully`);
			return uploadedPhotos;
		} catch (error) {
			console.error('Failed to upload photos:', error);
			toast.error('Failed to upload photos');
			throw error;
		}
	};
}

export const setRepairs = () => setContext('repairsState', new UseRepairs());
export const useRepairs = () => getContext<ReturnType<typeof setRepairs>>('repairsState');
