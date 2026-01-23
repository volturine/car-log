import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';

// GET /api/cars - List all cars for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const cars = await db
		.select()
		.from(schema.cars)
		.where(eq(schema.cars.userId, locals.user.id));

	return json(cars);
};

// POST /api/cars - Create a new car
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();

	const newCar = {
		id: crypto.randomUUID(),
		userId: locals.user.id,
		brand: data.brand,
		model: data.model,
		year: data.year,
		vin: data.vin || null,
		licensePlate: data.licensePlate || null,
		ownerName: data.ownerName || null,
		ownerPhone: data.ownerPhone || null,
		color: data.color || null,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(schema.cars).values(newCar);

	return json(newCar, { status: 201 });
};
