import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { and, eq, or } from 'drizzle-orm';
import {
	requireAuth,
	verifyOwnership,
	validateBody,
	successResponse,
	isShopMember,
	findUserShop,
	fetchById
} from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { getFilePath } from '$lib/server/storage';
import { unlink } from 'fs/promises';
import { USER_ROLE } from '$lib/constants';
import { toError } from '$lib/utils';

const logger = apiLogger.child('cars');

// GET /api/cars/[id] - Get a specific car
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	logger.debug('Fetching car', { carId: params.id, userId: user.id });

	if (user.role === USER_ROLE.ADMIN) {
		const car = await fetchById(schema.cars, params.id);

		if (!car) {
			throw error(404, 'Car not found');
		}

		return json(successResponse(car));
	}

	if (isShopMember(user)) {
		const shop = await findUserShop(user);

		if (shop) {
			const [car] = await db
				.select()
				.from(schema.cars)
				.leftJoin(schema.repairs, eq(schema.repairs.carId, schema.cars.id))
				.where(
					and(
						eq(schema.cars.id, params.id),
						or(eq(schema.repairs.shopId, shop.id), eq(schema.repairs.assignedMechanicId, user.id))
					)
				)
				.limit(1);

			if (car?.cars.id === params.id) {
				return json(successResponse(car.cars));
			}
		}

		const owned = await verifyOwnership(schema.cars, params.id, user.id, 'Car');
		return json(successResponse(owned));
	}

	const car = await verifyOwnership(schema.cars, params.id, user.id, 'Car');

	return json(successResponse(car));
};

// PUT /api/cars/[id] - Update a car
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Verify ownership
	await verifyOwnership(schema.cars, params.id, user.id, 'Car');

	// Validate request body
	const validatedData = await validateBody(request, carSchema);

	logger.info('Updating car', { carId: params.id, userId: user.id });

	const updatedCar = {
		...validatedData,
		updatedAt: new Date()
	};

	await db.update(schema.cars).set(updatedCar).where(eq(schema.cars.id, params.id));

	logger.info('Car updated', { carId: params.id, userId: user.id });

	return json(successResponse({ id: params.id, ...updatedCar }));
};

// DELETE /api/cars/[id] - Delete a car
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	// Verify ownership
	await verifyOwnership(schema.cars, params.id, user.id, 'Car');

	logger.info('Deleting car', { carId: params.id, userId: user.id });

	// Get all repairs for this car BEFORE deleting
	const repairs = await db.select().from(schema.repairs).where(eq(schema.repairs.carId, params.id));

	// Get all photos for all repairs BEFORE deleting
	const allPhotos = [];
	for (const repair of repairs) {
		const photos = await db
			.select()
			.from(schema.photos)
			.where(eq(schema.photos.repairId, repair.id));
		allPhotos.push(...photos);
	}

	// Delete car from database (cascade will delete repairs, parts, and photos)
	await db.delete(schema.cars).where(eq(schema.cars.id, params.id));

	// Clean up photo files from disk
	const fileCleanupPromises = allPhotos.map(async (photo) => {
		const filePath = getFilePath(photo.path);
		try {
			await unlink(filePath);
			logger.debug('Photo file deleted', { photoId: photo.id, path: photo.path });
		} catch (err) {
			// Log warning but don't fail the deletion
			logger.warn('Failed to delete photo file', {
				photoId: photo.id,
				path: photo.path,
				error: toError(err).message
			});
		}
	});

	// Wait for all file deletions (but don't fail if some fail)
	await Promise.allSettled(fileCleanupPromises);

	logger.info('Car deleted', {
		carId: params.id,
		userId: user.id,
		repairsDeleted: repairs.length,
		photosCleaned: allPhotos.length
	});

	return json(successResponse({ deleted: true }));
};
