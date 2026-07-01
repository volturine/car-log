import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, validateBody } from '$lib/server/api-utils';
import { carSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';

const logger = apiLogger.child('cars-detail');

export const GET: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const carIdResult = await verifyOwnership(schema.cars, params.id, user.id, 'Car');
	if (carIdResult.isErr()) {
		return json(
			{ success: false, error: carIdResult.error.message },
			{ status: carIdResult.error.status }
		);
	}

	logger.debug('Fetching car details', { carId: params.id, userId: user.id });

	const carResult = await db
		.select()
		.from(schema.cars)
		.where(eq(schema.cars.id, params.id))
		.limit(1);
	if (!carResult[0]) {
		return json({ success: false, error: 'Car not found' }, { status: 404 });
	}

	const car = carResult[0];
	return json({ success: true, data: car });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const ownershipResult = await verifyOwnership(schema.cars, params.id, user.id, 'Car');
	if (ownershipResult.isErr()) {
		return json(
			{ success: false, error: ownershipResult.error.message },
			{ status: ownershipResult.error.status }
		);
	}

	const validation = await validateBody(request, carSchema);
	if (validation.isErr()) {
		return json(
			{ success: false, error: validation.error.message },
			{ status: validation.error.status }
		);
	}

	logger.info('Updating car', { carId: params.id, userId: user.id });

	const updated = { ...validation.value, updatedAt: new Date() };
	await db.update(schema.cars).set(updated).where(eq(schema.cars.id, params.id));

	const [updatedCar] = await db.select().from(schema.cars).where(eq(schema.cars.id, params.id));

	logger.info('Car updated', { carId: params.id, userId: user.id });
	return json({ success: true, data: updatedCar });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const ownershipResult = await verifyOwnership(schema.cars, params.id, user.id, 'Car');
	if (ownershipResult.isErr()) {
		return json(
			{ success: false, error: ownershipResult.error.message },
			{ status: ownershipResult.error.status }
		);
	}

	logger.info('Deleting car', { carId: params.id, userId: user.id });

	await db.delete(schema.cars).where(eq(schema.cars.id, params.id));

	logger.info('Car deleted', { carId: params.id, userId: user.id });
	return json({ success: true, data: { deleted: true } });
};
