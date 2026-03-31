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
	fetchById,
	formatPhotosForResponse
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
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

	// Get shop and car info
	const shopInfo = repair.shopId ? await fetchById(schema.shops, repair.shopId) : null;
	const car = await fetchById(schema.cars, repair.carId);

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

	// Update repair and parts
	const updatedRepair = {
		...repair,
		...validatedData,
		startDate: validatedData.startDate ? new Date(validatedData.startDate) : repair.startDate,
		completedDate: validatedData.completedDate
			? new Date(validatedData.completedDate)
			: repair.completedDate,
		updatedAt: new Date()
	};

	const result = transaction((tx) => {
		tx.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id)).run();

		// Update parts if provided
		if (validatedData.parts?.length) {
			tx.delete(schema.repairParts).where(eq(schema.repairParts.repairId, params.id)).run();
			validatedData.parts.forEach((part) => {
				tx.insert(schema.repairParts)
					.values({
						id: generateId(),
						repairId: params.id,
						...part,
						totalCost: part.totalCost || part.quantity * part.unitCost,
						createdAt: new Date()
					})
					.run();
			});
		}

		return { ...updatedRepair, id: params.id };
	});

	// Fetch updated parts outside transaction
	const updatedParts = await db
		.select()
		.from(schema.repairParts)
		.where(eq(schema.repairParts.repairId, params.id));

	logger.info('Repair updated', { repairId: params.id, userId: user.id });

	return json(successResponse({ ...result, parts: updatedParts }));
};

// DELETE /api/repairs/[id] - Delete a repair
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	await verifyOwnership(schema.repairs, params.id, user.id, 'Repair');

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

	logger.info('Repair deleted', {
		repairId: params.id,
		userId: user.id,
		photosCleaned: photos.length
	});

	return json(successResponse({ deleted: true }));
};
