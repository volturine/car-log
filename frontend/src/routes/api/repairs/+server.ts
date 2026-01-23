import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	requireAuth,
	verifyOwnership,
	validateBody,
	successResponse,
	transaction,
	formatPhotosForResponse
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils/helpers';

const logger = apiLogger.child('repairs');

// GET /api/repairs - List all repairs for the authenticated user
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	const carId = url.searchParams.get('carId');

	logger.debug('Fetching repairs', { userId: user.id, carId });

	let query = db.select().from(schema.repairs).where(eq(schema.repairs.userId, user.id));

	if (carId) {
		// Verify car belongs to user first
		await verifyOwnership(schema.cars, carId, user.id, 'Car');

		query = db
			.select()
			.from(schema.repairs)
			.where(and(eq(schema.repairs.userId, user.id), eq(schema.repairs.carId, carId)));
	}

	const repairs = await query;

	// Get repair parts and photos for each repair
	const repairsWithParts = await Promise.all(
		repairs.map(async (repair) => {
			const parts = await db
				.select()
				.from(schema.repairParts)
				.where(eq(schema.repairParts.repairId, repair.id));

			const photos = await db
				.select()
				.from(schema.photos)
				.where(eq(schema.photos.repairId, repair.id));

			return {
				...repair,
				parts,
				photos: formatPhotosForResponse(photos)
			};
		})
	);

	logger.debug('Repairs fetched', { count: repairsWithParts.length, userId: user.id });

	return json(successResponse(repairsWithParts));
};

// POST /api/repairs - Create a new repair
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	// Validate request body
	const validatedData = await validateBody(request, repairSchema);

	// Verify car belongs to user
	await verifyOwnership(schema.cars, validatedData.carId, user.id, 'Car');

	logger.info('Creating repair', { userId: user.id, carId: validatedData.carId });

	// Use transaction to ensure atomicity
	const result = await transaction(async () => {
		const repairId = generateId();

		const newRepair = {
			id: repairId,
			carId: validatedData.carId,
			userId: user.id,
			title: validatedData.title,
			description: validatedData.description || null,
			status: validatedData.status,
			laborCost: validatedData.laborCost,
			laborHours: validatedData.laborHours,
			totalCost: validatedData.totalCost,
			startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
			completedDate: validatedData.completedDate
				? new Date(validatedData.completedDate)
				: null,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		await db.insert(schema.repairs).values(newRepair);

		// Add parts if provided
		const insertedParts = [];
		if (validatedData.parts && validatedData.parts.length > 0) {
			for (const part of validatedData.parts) {
				const partData = {
					id: generateId(),
					repairId,
					name: part.name,
					description: part.description || null,
					quantity: part.quantity,
					unitCost: part.unitCost,
					totalCost: part.totalCost,
					sourceUrl: part.sourceUrl || null,
					createdAt: new Date()
				};

				await db.insert(schema.repairParts).values(partData);
				insertedParts.push(partData);
			}
		}

		return { ...newRepair, parts: insertedParts };
	});

	logger.info('Repair created', { repairId: result.id, userId: user.id });

	return json(successResponse(result, 201), { status: 201 });
};
