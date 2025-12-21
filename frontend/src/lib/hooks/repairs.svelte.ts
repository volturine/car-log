import { setContext, getContext } from "svelte";
import type { Car, Repair, RepairPart, BrandStats, ModelStats } from "$lib/types.js";

class UseRepairs {
	cars = $state<Car[]>([]);
	repairs = $state<Repair[]>([]);
	selectedCarId = $state<string | null>(null);
	selectedRepairId = $state<string | null>(null);
	currentView = $state<"cars" | "car-details" | "analytics" | "calendar">("cars");

	constructor() {
		// Load from localStorage
		if (typeof window !== "undefined") {
			const savedCars = localStorage.getItem("cars");
			const savedRepairs = localStorage.getItem("repairs");
			if (savedCars) this.cars = JSON.parse(savedCars);
			if (savedRepairs) this.repairs = JSON.parse(savedRepairs);
		}

		// Save to localStorage whenever data changes
		$effect(() => {
			if (typeof window !== "undefined") {
				localStorage.setItem("cars", JSON.stringify(this.cars));
			}
		});

		$effect(() => {
			if (typeof window !== "undefined") {
				localStorage.setItem("repairs", JSON.stringify(this.repairs));
			}
		});
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

	addCar = (car: Omit<Car, "id" | "createdAt">) => {
		const newCar: Car = {
			...car,
			id: crypto.randomUUID(),
			createdAt: new Date(),
		};
		this.cars = [...this.cars, newCar];
		return newCar.id;
	};

	updateCar = (id: string, updates: Partial<Car>) => {
		this.cars = this.cars.map(car => (car.id === id ? { ...car, ...updates } : car));
	};

	deleteCar = (id: string) => {
		this.cars = this.cars.filter(car => car.id !== id);
		this.repairs = this.repairs.filter(repair => repair.carId !== id);
		if (this.selectedCarId === id) {
			this.selectedCarId = null;
			this.currentView = "cars";
		}
	};

	addRepair = (repair: Omit<Repair, "id" | "createdAt" | "totalCost">) => {
		const partsCost = repair.parts.reduce((sum, p) => sum + p.totalCost, 0);
		const newRepair: Repair = {
			...repair,
			id: crypto.randomUUID(),
			totalCost: partsCost + repair.laborCost,
			createdAt: new Date(),
		};
		this.repairs = [...this.repairs, newRepair];
		return newRepair.id;
	};

	updateRepair = (id: string, updates: Partial<Repair>) => {
		this.repairs = this.repairs.map(repair => {
			if (repair.id !== id) return repair;
			const updated = { ...repair, ...updates };
			const partsCost = updated.parts.reduce((sum, p) => sum + p.totalCost, 0);
			updated.totalCost = partsCost + updated.laborCost;
			return updated;
		});
	};

	deleteRepair = (id: string) => {
		this.repairs = this.repairs.filter(repair => repair.id !== id);
		if (this.selectedRepairId === id) {
			this.selectedRepairId = null;
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