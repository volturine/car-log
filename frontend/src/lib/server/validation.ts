import { z } from 'zod';

// Car validation schema
export const carSchema = z.object({
	brand: z.string().min(1, 'Brand is required').max(100),
	model: z.string().min(1, 'Model is required').max(100),
	year: z.number().int().min(1900).max(new Date().getFullYear() + 2),
	vin: z.string().max(17).optional().nullable(),
	licensePlate: z.string().min(1).max(20).optional().nullable(),
	ownerName: z.string().min(1).max(200).optional().nullable(),
	ownerPhone: z.string().max(20).optional().nullable(),
	color: z.string().max(50).optional().nullable()
});

// Repair validation schema
export const repairSchema = z.object({
	carId: z.string().uuid('Invalid car ID'),
	title: z.string().min(1, 'Title is required').max(200),
	description: z.string().max(5000).optional().nullable(),
	status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
	laborCost: z.number().min(0).max(1000000).default(0),
	laborHours: z.number().min(0).max(10000).default(0),
	totalCost: z.number().min(0).max(1000000).default(0),
	startDate: z.string().datetime().optional().nullable(),
	completedDate: z.string().datetime().optional().nullable(),
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

// File upload validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
	if (file.size === 0) {
		return { valid: false, error: 'File is empty' };
	}

	if (file.size > MAX_FILE_SIZE) {
		return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
	}

	if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: `File type ${file.type} not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
		};
	}

	return { valid: true };
}

// Environment variable validation
export function validateEnv() {
	const requiredEnvVars = ['BETTER_AUTH_SECRET'];
	const missing = requiredEnvVars.filter((v) => !process.env[v]);

	if (missing.length > 0) {
		console.warn(
			`Warning: Missing environment variables: ${missing.join(', ')}. Using fallback values.`
		);
	}

	// Validate secret length
	const secret = process.env.BETTER_AUTH_SECRET;
	if (secret && secret.length < 32) {
		console.warn('Warning: BETTER_AUTH_SECRET should be at least 32 characters long.');
	}
}
