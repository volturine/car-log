import { REPAIR_STATUS_VALUES, VALIDATION_LIMITS } from '$lib/constants';
import { getDevUrl } from '$lib/server/env';
import { z } from 'zod';

// Car validation schema
export const carSchema = z.object({
	brand: z.string().min(1, 'Brand is required').max(VALIDATION_LIMITS.CAR.BRAND_MAX_LENGTH),
	model: z.string().min(1, 'Model is required').max(VALIDATION_LIMITS.CAR.MODEL_MAX_LENGTH),
	year: z.number().int().min(VALIDATION_LIMITS.CAR.YEAR_MIN).max(VALIDATION_LIMITS.CAR.YEAR_MAX),
	vin: z.string().max(VALIDATION_LIMITS.CAR.VIN_MAX_LENGTH).optional().nullable(),
	licensePlate: z
		.string()
		.min(1)
		.max(VALIDATION_LIMITS.CAR.LICENSE_PLATE_MAX_LENGTH)
		.optional()
		.nullable(),
	ownerName: z
		.string()
		.min(1)
		.max(VALIDATION_LIMITS.CAR.OWNER_NAME_MAX_LENGTH)
		.optional()
		.nullable(),
	ownerPhone: z.string().max(VALIDATION_LIMITS.CAR.OWNER_PHONE_MAX_LENGTH).optional().nullable(),
	color: z.string().max(VALIDATION_LIMITS.CAR.COLOR_MAX_LENGTH).optional().nullable()
});

// Shop validation schema
export const shopSchema = z.object({
	name: z.string().min(1, 'Shop name is required').max(VALIDATION_LIMITS.SHOP.NAME_MAX_LENGTH),
	email: z
		.string()
		.email('Invalid email')
		.max(VALIDATION_LIMITS.SHOP.EMAIL_MAX_LENGTH)
		.optional()
		.nullable(),
	phone: z.string().max(VALIDATION_LIMITS.SHOP.PHONE_MAX_LENGTH).optional().nullable(),
	address: z.string().max(VALIDATION_LIMITS.SHOP.ADDRESS_MAX_LENGTH).optional().nullable(),
	city: z.string().max(VALIDATION_LIMITS.SHOP.CITY_MAX_LENGTH).optional().nullable(),
	state: z.string().max(VALIDATION_LIMITS.SHOP.STATE_MAX_LENGTH).optional().nullable(),
	zipCode: z.string().max(VALIDATION_LIMITS.SHOP.ZIP_CODE_MAX_LENGTH).optional().nullable(),
	businessHours: z
		.string()
		.max(VALIDATION_LIMITS.SHOP.BUSINESS_HOURS_MAX_LENGTH)
		.optional()
		.nullable(),
	specialties: z
		.array(z.string().max(VALIDATION_LIMITS.SHOP.SPECIALTY_MAX_LENGTH))
		.max(VALIDATION_LIMITS.SHOP.MAX_SPECIALTIES)
		.optional()
		.default([])
});

// Repair validation schema
export const repairSchema = z.object({
	carId: z.string().uuid('Invalid car ID'),
	shopId: z.string().uuid('Invalid shop ID').optional().nullable(),
	assignedMechanicId: z.string().uuid('Invalid mechanic ID').optional().nullable(),
	title: z.string().min(1, 'Title is required').max(VALIDATION_LIMITS.REPAIR.TITLE_MAX_LENGTH),
	description: z
		.string()
		.max(VALIDATION_LIMITS.REPAIR.DESCRIPTION_MAX_LENGTH)
		.optional()
		.nullable(),
	status: z.enum(REPAIR_STATUS_VALUES).default('estimate_pending'),
	// Estimate fields
	estimatedCost: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_COST).default(0),
	estimatedHours: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_HOURS).default(0),
	estimateNotes: z.string().max(2000).optional().nullable(),
	// Actual fields
	laborCost: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_COST).default(0),
	laborHours: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_HOURS).default(0),
	totalCost: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_COST).default(0),
	// Dates
	appointmentAt: z.string().datetime().optional().nullable(),
	startDate: z.string().datetime().optional().nullable(),
	completedDate: z.string().datetime().optional().nullable(),
	// Parts
	parts: z
		.array(
			z.object({
				name: z.string().min(1).max(VALIDATION_LIMITS.PART.NAME_MAX_LENGTH),
				description: z
					.string()
					.max(VALIDATION_LIMITS.PART.DESCRIPTION_MAX_LENGTH)
					.optional()
					.nullable(),
				quantity: z.number().int().min(1).max(VALIDATION_LIMITS.PART.MAX_QUANTITY).default(1),
				unitCost: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_COST),
				totalCost: z.number().min(0).max(VALIDATION_LIMITS.REPAIR.MAX_COST),
				sourceUrl: z
					.string()
					.url()
					.max(VALIDATION_LIMITS.PART.SOURCE_URL_MAX_LENGTH)
					.optional()
					.nullable()
			})
		)
		.optional()
		.default([])
});

function warn(msg: string): void {
	console.warn(`Warning: ${msg}`);
}

// Environment variable validation
export function validateEnv(): void {
	const prod = process.env.NODE_ENV === 'production';
	const secret = process.env.BETTER_AUTH_SECRET;

	if (!secret) {
		if (prod) {
			throw new Error('BETTER_AUTH_SECRET is required in production.');
		}

		warn('BETTER_AUTH_SECRET is missing. Using development fallback secret.');
	}

	if (secret && secret.length < 32) {
		if (prod) {
			throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long in production.');
		}

		warn('BETTER_AUTH_SECRET should be at least 32 characters long.');
	}

	const url = process.env.BETTER_AUTH_URL;

	if (!url) {
		if (prod) {
			throw new Error('BETTER_AUTH_URL is required in production.');
		}

		warn(`BETTER_AUTH_URL is missing. Using development fallback URL ${getDevUrl()}.`);
	}

	if (url && !URL.canParse(url)) {
		if (prod) {
			throw new Error('BETTER_AUTH_URL must be a valid absolute URL in production.');
		}

		warn(
			`BETTER_AUTH_URL must be a valid absolute URL. Using development fallback URL ${getDevUrl()}.`
		);
	}

	if (url && URL.canParse(url) && prod && new URL(url).protocol !== 'https:') {
		throw new Error('BETTER_AUTH_URL must use https in production.');
	}

	const hasGoogleClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
	const hasGoogleClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);

	if (hasGoogleClientId === hasGoogleClientSecret) {
		return;
	}

	console.warn(
		'Warning: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set to enable Google authentication.'
	);
}
