import type { PaymentMethod, PaymentStatus, RepairStatus } from '$lib/constants';

export type { PaymentMethod, PaymentStatus, RepairStatus };

/** HTTP status codes 200-299, the range valid for success responses. */
export type SuccessStatus =
	| 200
	| 201
	| 202
	| 203
	| 204
	| 205
	| 206
	| 207
	| 208
	| 209
	| 210
	| 211
	| 212
	| 213
	| 214
	| 215
	| 216
	| 217
	| 218
	| 219
	| 220
	| 221
	| 222
	| 223
	| 224
	| 225
	| 226
	| 227
	| 228
	| 229
	| 230
	| 231
	| 232
	| 233
	| 234
	| 235
	| 236
	| 237
	| 238
	| 239
	| 240
	| 241
	| 242
	| 243
	| 244
	| 245
	| 246
	| 247
	| 248
	| 249
	| 250
	| 251
	| 252
	| 253
	| 254
	| 255
	| 256
	| 257
	| 258
	| 259
	| 260
	| 261
	| 262
	| 263
	| 264
	| 265
	| 266
	| 267
	| 268
	| 269
	| 270
	| 271
	| 272
	| 273
	| 274
	| 275
	| 276
	| 277
	| 278
	| 279
	| 280
	| 281
	| 282
	| 283
	| 284
	| 285
	| 286
	| 287
	| 288
	| 289
	| 290
	| 291
	| 292
	| 293
	| 294
	| 295
	| 296
	| 297
	| 298
	| 299;

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
	specialties?: string | null;
}

export interface ShopMember {
	userId: string;
	role: string;
	joinedAt: Date | string | null;
	userName: string | null;
	userEmail: string;
}
