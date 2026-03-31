import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	requireAuth,
	validateBody,
	successResponse,
	transaction,
	fetchById,
	formatPhotosForResponse,
	verifyRepairAccess,
	isShopMember
} from '$lib/server/api-utils';
import { repairSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
import { getFilePath } from '$lib/server/storage';
import { unlink } from 'fs/promises';
import { USER_ROLE } from '$lib/constants';
import type { z } from 'zod';

const logger = apiLogger.child('repairs');
type RepairInput = Partial<z.infer<typeof repairSchema>>;
type RepairUpdate = Partial<typeof schema.repairs.$inferInsert> & {
	parts?: RepairInput['parts'];
};

// GET /api/repairs/[id] - Get a specific repair
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	const repair = await verifyRepairAccess(params.id, user);

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
	const repair = await verifyRepairAccess(params.id, user);
	const isShop = isShopMember(user);

	// Validate request body
	const validatedData = await validateBody(request, repairSchema.partial());

	logger.info('Updating repair', { repairId: params.id, userId: user.id });

	if (!isShop && repair.shopId) {
		throw error(403, 'Only the shop can update this repair');
	}

	const updates = isShop
		? getShopRepairUpdate(validatedData)
		: getCustomerRepairUpdate(validatedData);
	const { parts, ...repairUpdates } = updates;

	const updatedRepair = {
		...repair,
		...repairUpdates,
		startDate: repairUpdates.startDate ?? repair.startDate,
		completedDate: repairUpdates.completedDate ?? repair.completedDate,
		updatedAt: new Date()
	};

	const result = transaction((tx) => {
		tx.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id)).run();

		// Update parts if provided
		if (isShop && parts) {
			tx.delete(schema.repairParts).where(eq(schema.repairParts.repairId, params.id)).run();
			parts.forEach((part) => {
				tx.insert(schema.repairParts)
					.values({
						id: generateId(),
						repairId: params.id,
						...part,
						totalCost: part.totalCost ?? part.quantity * part.unitCost,
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
	const repair = await verifyRepairAccess(params.id, user);

	if (
		repair.userId !== user.id &&
		user.role !== USER_ROLE.ADMIN &&
		user.role !== USER_ROLE.SHOP_OWNER
	) {
		throw error(403, 'Only the repair owner, shop owner, or admin can delete this repair');
	}

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

function getShopRepairUpdate(data: RepairInput): RepairUpdate {
	return {
		...data,
		shopId: data.shopId ?? undefined,
		assignedMechanicId: data.assignedMechanicId ?? undefined,
		estimateNotes: data.estimateNotes ?? undefined,
		description: data.description ?? undefined,
		completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
		startDate: data.startDate ? new Date(data.startDate) : undefined,
		parts: data.parts
	};
}

function getCustomerRepairUpdate(data: RepairInput): RepairUpdate {
	const next: RepairUpdate = {};

	if (typeof data.title === 'string') {
		next.title = data.title;
	}

	if (typeof data.description === 'string' || data.description === null) {
		next.description = data.description ?? null;
	}

	return next;
}
