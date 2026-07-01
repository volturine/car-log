import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, inArray } from 'drizzle-orm';
import { requireAuth, validateBody, isShopMember, findUserShop } from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';

const logger = apiLogger.child('cars');

export const GET: RequestHandler = async ({ locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	if (isShopMember(user)) {
		const shop = await findUserShop(user);

		if (!shop) {
			return json({ success: true, data: [] });
		}

		const repairs = await db
			.select({ carId: schema.repairs.carId })
			.from(schema.repairs)
			.where(eq(schema.repairs.shopId, shop.id));

		const carIds = [...new Set(repairs.map((repair) => repair.carId))];

		if (carIds.length === 0) {
			return json({ success: true, data: [] });
		}

		const cars = await db
			.select()
			.from(schema.cars)
			.where(carIds.length === 1 ? eq(schema.cars.id, carIds[0]) : inArray(schema.cars.id, carIds));

		logger.debug('Shop cars fetched', { count: cars.length, userId: user.id, shopId: shop.id });

		return json({ success: true, data: cars });
	}

	const cars = await db.select().from(schema.cars).where(eq(schema.cars.userId, user.id));
	logger.debug('Cars fetched', { count: cars.length, userId: user.id });

	return json({ success: true, data: cars });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const validationResult = await validateBody(request, carSchema);
	if (validationResult.isErr()) {
		return json(
			{ success: false, error: validationResult.error.message },
			{ status: validationResult.error.status }
		);
	}

	const validatedData = validationResult.value;
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

	return json({ success: true, data: newCar }, { status: 201 });
};
