import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
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
import { getFilePath } from '$lib/server/storage';
import { unlink } from 'fs/promises';

const logger = apiLogger.child('repairs');

// GET /api/repairs/[id] - Get a specific repair
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	const repair = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

	logger.debug('Fetching repair details', { repairId: params.id, userId: user.id });

	// Get parts
	const parts = await db
		.select()
		.from(schema.repairParts)
		.where(eq(schema.repairParts.repairId, params.id));

	// Get photos
	const photos = await db.select().from(schema.photos).where(eq(schema.photos.repairId, params.id));

	// Get shop info if shopId exists
	let shopInfo = null;
	if (repair.shopId) {
		const [shop] = await db
			.select()
			.from(schema.shops)
			.where(eq(schema.shops.id, repair.shopId))
			.limit(1);
		shopInfo = shop || null;
	}

	// Get car info
	const [car] = await db.select().from(schema.cars).where(eq(schema.cars.id, repair.carId)).limit(1);

	return json(
		successResponse({
			...repair,
			parts,
			photos: formatPhotosForResponse(photos),
			shop: shopInfo,
			car: car || null
		})
	);
};

// PUT /api/repairs/[id] - Update a repair
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	const repair = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

	// Validate request body
	const validatedData = await validateBody(request, repairSchema.partial());

	logger.info('Updating repair', { repairId: params.id, userId: user.id });

	// Use transaction for atomicity
	const result = await transaction(async () => {
		const updatedRepair = {
			title: validatedData.title || repair.title,
			description: validatedData.description !== undefined ? validatedData.description : repair.description,
			status: validatedData.status || repair.status,
			// Shop fields
			shopId: validatedData.shopId !== undefined ? validatedData.shopId : repair.shopId,
			assignedMechanicId: validatedData.assignedMechanicId !== undefined ? validatedData.assignedMechanicId : repair.assignedMechanicId,
			// Estimate fields
			estimatedCost: validatedData.estimatedCost !== undefined ? validatedData.estimatedCost : repair.estimatedCost,
			estimatedHours: validatedData.estimatedHours !== undefined ? validatedData.estimatedHours : repair.estimatedHours,
			estimateNotes: validatedData.estimateNotes !== undefined ? validatedData.estimateNotes : repair.estimateNotes,
			// Actual fields
			laborCost: validatedData.laborCost !== undefined ? validatedData.laborCost : repair.laborCost,
			laborHours: validatedData.laborHours !== undefined ? validatedData.laborHours : repair.laborHours,
			totalCost: validatedData.totalCost !== undefined ? validatedData.totalCost : repair.totalCost,
			// Dates
			startDate: validatedData.startDate ? new Date(validatedData.startDate) : repair.startDate,
			completedDate: validatedData.completedDate ? new Date(validatedData.completedDate) : repair.completedDate,
			updatedAt: new Date()
		};

		await db.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id));

		// Update parts if provided - delete old ones and insert new ones
		let updatedParts = [];
		if (validatedData.parts && Array.isArray(validatedData.parts)) {
			await db.delete(schema.repairParts).where(eq(schema.repairParts.repairId, params.id));

			for (const part of validatedData.parts) {
				const partData = {
					id: generateId(),
					repairId: params.id,
					name: part.name,
					description: part.description || null,
					quantity: part.quantity || 1,
					unitCost: part.unitCost || 0,
					totalCost: part.totalCost || 0,
					sourceUrl: part.sourceUrl || null,
					createdAt: new Date()
				};
				await db.insert(schema.repairParts).values(partData);
				updatedParts.push(partData);
			}
		} else {
			// Keep existing parts
			updatedParts = await db
				.select()
				.from(schema.repairParts)
				.where(eq(schema.repairParts.repairId, params.id));
		}

		return { ...updatedRepair, id: params.id, parts: updatedParts };
	});

	logger.info('Repair updated', { repairId: params.id, userId: user.id });

	return json(successResponse(result));
};

// DELETE /api/repairs/[id] - Delete a repair
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	const repair = await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

	logger.info('Deleting repair', { repairId: params.id, userId: user.id });

	// Get all photos for this repair BEFORE deleting from database
	const photos = await db.select().from(schema.photos).where(eq(schema.photos.repairId, params.id));

	// Delete repair from database (cascade will delete parts and photos)
	await db.delete(schema.repairs).where(eq(schema.repairs.id, params.id));

	// Clean up photo files from disk
	const fileCleanupPromises = photos.map(async (photo) => {
		const filePath = getFilePath(photo.path);
		try {
			await unlink(filePath);
			logger.debug('Photo file deleted', { photoId: photo.id, path: photo.path });
		} catch (err) {
			// Log warning but don't fail the deletion
			logger.warn('Failed to delete photo file', {
				photoId: photo.id,
				path: photo.path,
				error: (err as Error).message
			});
		}
	});

	// Wait for all file deletions (but don't fail if some fail)
	await Promise.allSettled(fileCleanupPromises);

	logger.info('Repair deleted', { repairId: params.id, userId: user.id, photosCleaned: photos.length });

	return json(successResponse({ deleted: true }));
};
