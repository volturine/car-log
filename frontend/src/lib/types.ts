export type RepairStatus = "pending" | "in-progress" | "completed";

export interface Car {
	id: string;
	brand: string;
	model: string;
	year: number;
	vin: string;
	licensePlate: string;
	ownerName: string;
	ownerPhone: string;
	color: string;
	createdAt: Date;
}

export interface RepairPart {
	id: string;
	name: string;
	description: string;
	quantity: number;
	unitCost: number;
	totalCost: number;
	sourceUrl: string;
}

export interface Photo {
	id: string;
	url: string;
}

export interface Repair {
	id: string;
	carId: string;
	title: string;
	description: string;
	status: RepairStatus;
	photos?: Photo[];
	parts: RepairPart[];
	laborCost: number;
	laborHours: number;
	totalCost: number;
	startDate: Date;
	completedDate?: Date;
	createdAt: Date;
}

export interface BrandStats {
	brand: string;
	totalRepairs: number;
	totalCost: number;
	averageCost: number;
	models: ModelStats[];
}

export interface ModelStats {
	model: string;
	totalRepairs: number;
	totalCost: number;
	averageCost: number;
}