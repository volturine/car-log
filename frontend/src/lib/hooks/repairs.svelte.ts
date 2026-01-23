import { setContext, getContext } from "svelte";
import type { Car, Repair, RepairPart, BrandStats, ModelStats } from "$lib/types.js";
import { toast } from "svelte-sonner";

class UseRepairs {
	cars = $state<Car[]>([]);
	repairs = $state<Repair[]>([]);
	selectedCarId = $state<string | null>(null);
	selectedRepairId = $state<string | null>(null);
	currentView = $state<"cars" | "car-details" | "analytics" | "calendar">("cars");
	loading = $state(false);

	constructor() {
		// Load data from API
		if (typeof window !== "undefined") {
			this.loadData();
		}
	}

	async loadData() {
		this.loading = true;
		try {
			await Promise.all([this.fetchCars(), this.fetchRepairs()]);
		} catch (error) {
			console.error("Failed to load data:", error);
			toast.error("Failed to load data");
		} finally {
			this.loading = false;
		}
	}

	async fetchCars() {
		const response = await fetch("/api/cars");
		if (!response.ok) throw new Error("Failed to fetch cars");
		this.cars = await response.json();
	}

	async fetchRepairs() {
		const response = await fetch("/api/repairs");
		if (!response.ok) throw new Error("Failed to fetch repairs");
		this.repairs = await response.json();
	}

	selectedCar = $derived(this.cars.find(c => c.id === this.selectedCarId));
	
	carRepairs = $derived(
		this.selectedCarId 
			? this.repairs.filter(r => r.carId === this.selectedCarId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			: []
	);

	selectedRepair = $derived(this.repairs.find(r => r.id === this.selectedRepairId));

	brandStats = $derived.by(() => {
		const statsMap = new Map<string, { repairs: Repair[]; models: Map<string, Repair[]> }>();

		this.repairs.forEach(repair => {
			const car = this.cars.find(c => c.id === repair.carId);
			if (!car) return;

			if (!statsMap.has(car.brand)) {
				statsMap.set(car.brand, { repairs: [], models: new Map() });
			}

			const brandData = statsMap.get(car.brand)!;
			brandData.repairs.push(repair);

			if (!brandData.models.has(car.model)) {
				brandData.models.set(car.model, []);
			}
			brandData.models.get(car.model)!.push(repair);
		});

		return Array.from(statsMap.entries()).map(([brand, data]) => {
			const totalCost = data.repairs.reduce((sum, r) => sum + r.totalCost, 0);
			const models: ModelStats[] = Array.from(data.models.entries()).map(([model, repairs]) => {
				const modelCost = repairs.reduce((sum, r) => sum + r.totalCost, 0);
				return {
					model,
					totalRepairs: repairs.length,
					totalCost: modelCost,
					averageCost: modelCost / repairs.length,
				};
			});

			return {
				brand,
				totalRepairs: data.repairs.length,
				totalCost,
				averageCost: totalCost / data.repairs.length,
				models: models.sort((a, b) => b.totalRepairs - a.totalRepairs),
			};
		}).sort((a, b) => b.totalRepairs - a.totalRepairs);
	});

	addCar = async (car: Omit<Car, "id" | "createdAt">) => {
		try {
			const response = await fetch("/api/cars", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(car),
			});
			if (!response.ok) throw new Error("Failed to create car");
			const newCar = await response.json();
			this.cars = [...this.cars, newCar];
			toast.success("Car added successfully");
			return newCar.id;
		} catch (error) {
			console.error("Failed to add car:", error);
			toast.error("Failed to add car");
			throw error;
		}
	};

	updateCar = async (id: string, updates: Partial<Car>) => {
		try {
			const response = await fetch(`/api/cars/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});
			if (!response.ok) throw new Error("Failed to update car");
			const updatedCar = await response.json();
			this.cars = this.cars.map(car => (car.id === id ? updatedCar : car));
			toast.success("Car updated successfully");
		} catch (error) {
			console.error("Failed to update car:", error);
			toast.error("Failed to update car");
			throw error;
		}
	};

	deleteCar = async (id: string) => {
		try {
			const response = await fetch(`/api/cars/${id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete car");
			this.cars = this.cars.filter(car => car.id !== id);
			this.repairs = this.repairs.filter(repair => repair.carId !== id);
			if (this.selectedCarId === id) {
				this.selectedCarId = null;
				this.currentView = "cars";
			}
			toast.success("Car deleted successfully");
		} catch (error) {
			console.error("Failed to delete car:", error);
			toast.error("Failed to delete car");
			throw error;
		}
	};

	addRepair = async (repair: Omit<Repair, "id" | "createdAt" | "totalCost">) => {
		try {
			const partsCost = repair.parts.reduce((sum, p) => sum + p.totalCost, 0);
			const repairData = {
				...repair,
				totalCost: partsCost + repair.laborCost,
			};

			const response = await fetch("/api/repairs", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(repairData),
			});
			if (!response.ok) throw new Error("Failed to create repair");
			const newRepair = await response.json();
			this.repairs = [...this.repairs, newRepair];
			toast.success("Repair added successfully");
			return newRepair.id;
		} catch (error) {
			console.error("Failed to add repair:", error);
			toast.error("Failed to add repair");
			throw error;
		}
	};

	updateRepair = async (id: string, updates: Partial<Repair>) => {
		try {
			const partsCost = updates.parts?.reduce((sum, p) => sum + p.totalCost, 0) || 0;
			const repairData = {
				...updates,
				totalCost: partsCost + (updates.laborCost || 0),
			};

			const response = await fetch(`/api/repairs/${id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(repairData),
			});
			if (!response.ok) throw new Error("Failed to update repair");
			const updatedRepair = await response.json();
			this.repairs = this.repairs.map(repair => (repair.id === id ? updatedRepair : repair));
			toast.success("Repair updated successfully");
		} catch (error) {
			console.error("Failed to update repair:", error);
			toast.error("Failed to update repair");
			throw error;
		}
	};

	deleteRepair = async (id: string) => {
		try {
			const response = await fetch(`/api/repairs/${id}`, {
				method: "DELETE",
			});
			if (!response.ok) throw new Error("Failed to delete repair");
			this.repairs = this.repairs.filter(repair => repair.id !== id);
			if (this.selectedRepairId === id) {
				this.selectedRepairId = null;
			}
			toast.success("Repair deleted successfully");
		} catch (error) {
			console.error("Failed to delete repair:", error);
			toast.error("Failed to delete repair");
			throw error;
		}
	};

	uploadPhotos = async (repairId: string, files: File[]) => {
		try {
			const formData = new FormData();
			formData.append("repairId", repairId);
			files.forEach(file => formData.append("files", file));

			const response = await fetch("/api/photos", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error("Failed to upload photos");
			const uploadedPhotos = await response.json();
			toast.success(`${uploadedPhotos.length} photo(s) uploaded successfully`);
			return uploadedPhotos;
		} catch (error) {
			console.error("Failed to upload photos:", error);
			toast.error("Failed to upload photos");
			throw error;
		}
	};

	selectCar = (id: string) => {
		this.selectedCarId = id;
		this.currentView = "car-details";
	};

	goToCars = () => {
		this.selectedCarId = null;
		this.selectedRepairId = null;
		this.currentView = "cars";
	};

	goToAnalytics = () => {
		this.currentView = "analytics";
	};

	goToCalendar = () => {
		this.currentView = "calendar";
	};
}

export const setRepairs = () => setContext("repairsState", new UseRepairs());
export const useRepairs = () => getContext<ReturnType<typeof setRepairs>>("repairsState");