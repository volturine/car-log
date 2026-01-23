import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

// GET /api/cars/[id] - Get a specific car
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [car] = await db
		.select()
		.from(schema.cars)
		.where(and(eq(schema.cars.id, params.id), eq(schema.cars.userId, locals.user.id)))
		.limit(1);

	if (!car) {
		throw error(404, 'Car not found');
	}

	return json(car);
};

// PUT /api/cars/[id] - Update a car
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();

	const [existingCar] = await db
		.select()
		.from(schema.cars)
		.where(and(eq(schema.cars.id, params.id), eq(schema.cars.userId, locals.user.id)))
		.limit(1);

	if (!existingCar) {
		throw error(404, 'Car not found');
	}

	const updatedCar = {
		...data,
		id: params.id,
		userId: locals.user.id,
		updatedAt: new Date()
	};

	await db
		.update(schema.cars)
		.set(updatedCar)
		.where(eq(schema.cars.id, params.id));

	return json(updatedCar);
};

// DELETE /api/cars/[id] - Delete a car
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [existingCar] = await db
		.select()
		.from(schema.cars)
		.where(and(eq(schema.cars.id, params.id), eq(schema.cars.userId, locals.user.id)))
		.limit(1);

	if (!existingCar) {
		throw error(404, 'Car not found');
	}

	await db.delete(schema.cars).where(eq(schema.cars.id, params.id));

	return json({ success: true });
};
