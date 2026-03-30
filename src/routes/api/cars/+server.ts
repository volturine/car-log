import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, validateBody, successResponse } from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils/helpers';

const logger = apiLogger.child('cars');

// GET /api/cars - List all cars for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals);

	logger.info('Fetching cars', { userId: user.id });

	const cars = await db.select().from(schema.cars).where(eq(schema.cars.userId, user.id));

	logger.debug('Cars fetched', { count: cars.length, userId: user.id });

	return json(successResponse(cars));
};

// POST /api/cars - Create a new car
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	// Validate request body
	const validatedData = await validateBody(request, carSchema);

	logger.info('Creating car', { userId: user.id, brand: validatedData.brand });

	const newCar = {
		id: generateId(),
		userId: user.id,
		...validatedData,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(schema.cars).values(newCar);

	logger.info('Car created', { carId: newCar.id, userId: user.id });

	return json(successResponse(newCar, 201), { status: 201 });
};
