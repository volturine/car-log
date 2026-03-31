import { z } from 'zod';

// Car validation schema
export const carSchema = z.object({
	brand: z.string().min(1, 'Brand is required').max(100),
	model: z.string().min(1, 'Model is required').max(100),
	year: z
		.number()
		.int()
		.min(1900)
		.max(new Date().getFullYear() + 2),
	vin: z.string().max(17).optional().nullable(),
	licensePlate: z.string().min(1).max(20).optional().nullable(),
	ownerName: z.string().min(1).max(200).optional().nullable(),
	ownerPhone: z.string().max(20).optional().nullable(),
	color: z.string().max(50).optional().nullable()
});

// Shop validation schema
export const shopSchema = z.object({
	name: z.string().min(1, 'Shop name is required').max(200),
	email: z.string().email('Invalid email').optional().nullable(),
	phone: z.string().max(20).optional().nullable(),
	address: z.string().max(500).optional().nullable(),
	city: z.string().max(100).optional().nullable(),
	state: z.string().max(50).optional().nullable(),
	zipCode: z.string().max(10).optional().nullable(),
	businessHours: z.string().optional().nullable(), // JSON string
	specialties: z.array(z.string()).optional().default([])
});

// Repair validation schema
export const repairSchema = z.object({
	carId: z.string().uuid('Invalid car ID'),
	shopId: z.string().uuid('Invalid shop ID').optional().nullable(),
	assignedMechanicId: z.string().uuid('Invalid mechanic ID').optional().nullable(),
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().max(5000).optional().nullable(),
	status: z
		.enum(['estimate_pending', 'estimate_approved', 'in_progress', 'completed', 'paid', 'pending'])
		.default('estimate_pending'),
	// Estimate fields
	estimatedCost: z.number().min(0).max(1000000).default(0),
	estimatedHours: z.number().min(0).max(10000).default(0),
	estimateNotes: z.string().max(2000).optional().nullable(),
	// Actual fields
	laborCost: z.number().min(0).max(1000000).default(0),
	laborHours: z.number().min(0).max(10000).default(0),
	totalCost: z.number().min(0).max(1000000).default(0),
	// Dates
	startDate: z.string().datetime().optional().nullable(),
	completedDate: z.string().datetime().optional().nullable(),
	// Parts
	parts: z
		.array(
			z.object({
				name: z.string().min(1).max(200),
				description: z.string().max(1000).optional().nullable(),
				quantity: z.number().int().min(1).max(10000).default(1),
				unitCost: z.number().min(0).max(1000000),
				totalCost: z.number().min(0).max(1000000),
				sourceUrl: z.string().url().max(500).optional().nullable()
			})
		)
		.optional()
		.default([])
});

const devUrl = 'http://localhost:3000';

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

		warn(`BETTER_AUTH_URL is missing. Using development fallback URL ${devUrl}.`);
	}

	if (url && !URL.canParse(url)) {
		if (prod) {
			throw new Error('BETTER_AUTH_URL must be a valid absolute URL in production.');
		}

		warn(`BETTER_AUTH_URL must be a valid absolute URL. Using development fallback URL ${devUrl}.`);
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
