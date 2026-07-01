import type { PaymentMethod, PaymentStatus, RepairStatus } from '$lib/constants';

export type { PaymentMethod, PaymentStatus, RepairStatus };

export interface Car {
	id: string;
	brand: string;
	model: string;
	year: number;
	vin?: string | null;
	licensePlate?: string | null;
	ownerName?: string | null;
	ownerPhone?: string | null;
	color?: string | null;
	createdAt: Date;
}

export interface RepairPart {
	id: string;
	name: string;
	description?: string | null;
	quantity: number;
	unitCost: number;
	totalCost: number;
	sourceUrl?: string | null;
}

export interface Photo {
	id: string;
	url: string;
}

export interface Payment {
	id: string;
	repairId: string;
	amount: number;
	method: PaymentMethod;
	notes: string | null;
	recordedBy: string;
	paidAt: string | Date;
	createdAt: string | Date;
}

export interface Repair {
	id: string;
	carId: string;
	title: string;
	description: string;
	status: RepairStatus;
	photos?: Photo[];
	parts: RepairPart[];
	shopId?: string;
	assignedMechanicId?: string;
	appointmentAt?: string | Date | null;
	estimatedCost?: number;
	estimatedHours?: number;
	estimateNotes?: string;
	customerApproved?: boolean;
	approvedAt?: Date;
	paymentStatus?: PaymentStatus;
	amountPaid?: number;
	payments?: Payment[];
	laborCost: number;
	laborHours: number;
	totalCost: number;
	startDate: Date;
	completedDate?: Date;
	createdAt: Date;
	assignedMechanic?: {
		id: string;
		name: string | null;
		email: string;
	} | null;
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

export interface Shop {
	id: string;
	name: string;
	ownerId: string;
	email?: string | null;
	phone?: string | null;
	address?: string | null;
	city?: string | null;
	state?: string | null;
	zipCode?: string | null;
	businessHours?: string | null;
	specialties?: string | null;
	logo?: string | null;
	rating?: number | null;
	totalReviews?: number | null;
}
