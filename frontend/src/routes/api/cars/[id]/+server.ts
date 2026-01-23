import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, validateBody, successResponse } from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';

const logger = apiLogger.child('cars');

// GET /api/cars/[id] - Get a specific car
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	logger.debug('Fetching car', { carId: params.id, userId: user.id });

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

	// Cascade delete will handle repairs and photos
	await db.delete(schema.cars).where(eq(schema.cars.id, params.id));

	logger.info('Car deleted', { carId: params.id, userId: user.id });

	return json(successResponse({ deleted: true }));
};
