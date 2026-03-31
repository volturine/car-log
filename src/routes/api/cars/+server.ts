import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, inArray } from 'drizzle-orm';
import {
	requireAuth,
	validateBody,
	successResponse,
	isShopMember,
	findUserShop
} from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';

const logger = apiLogger.child('cars');

// GET /api/cars - List all cars for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals);

	logger.info('Fetching cars', { userId: user.id });

	if (isShopMember(user)) {
		const shop = await findUserShop(user);

		if (!shop) {
			return json(successResponse([]));
		}

		const repairs = await db
			.select({ carId: schema.repairs.carId })
			.from(schema.repairs)
			.where(eq(schema.repairs.shopId, shop.id));

		const carIds = [...new Set(repairs.map((repair) => repair.carId))];

		if (carIds.length === 0) {
			return json(successResponse([]));
		}

		const cars = await db
			.select()
			.from(schema.cars)
			.where(carIds.length === 1 ? eq(schema.cars.id, carIds[0]) : inArray(schema.cars.id, carIds));

		logger.debug('Shop cars fetched', { count: cars.length, userId: user.id, shopId: shop.id });

		return json(successResponse(cars));
	}

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
