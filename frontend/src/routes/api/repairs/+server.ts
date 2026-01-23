import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

// GET /api/repairs - List all repairs for the authenticated user
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const carId = url.searchParams.get('carId');

	let query = db.select().from(schema.repairs).where(eq(schema.repairs.userId, locals.user.id));

	if (carId) {
		query = db
			.select()
			.from(schema.repairs)
			.where(and(eq(schema.repairs.userId, locals.user.id), eq(schema.repairs.carId, carId)));
	}

	const repairs = await query;

	// Get repair parts for each repair
	const repairsWithParts = await Promise.all(
		repairs.map(async (repair) => {
			const parts = await db
				.select()
				.from(schema.repairParts)
				.where(eq(schema.repairParts.repairId, repair.id));

			const photos = await db
				.select()
				.from(schema.photos)
				.where(eq(schema.photos.repairId, repair.id));

			return {
				...repair,
				parts,
				photos: photos.map((p) => ({ id: p.id, url: `/api/photos/${p.id}` }))
			};
		})
	);

	return json(repairsWithParts);
};

// POST /api/repairs - Create a new repair
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();

	// Verify car belongs to user
	const [car] = await db
		.select()
		.from(schema.cars)
		.where(and(eq(schema.cars.id, data.carId), eq(schema.cars.userId, locals.user.id)))
		.limit(1);

	if (!car) {
		throw error(404, 'Car not found');
	}

	const repairId = crypto.randomUUID();

	const newRepair = {
		id: repairId,
		carId: data.carId,
		userId: locals.user.id,
		title: data.title,
		description: data.description || null,
		status: data.status || 'pending',
		laborCost: data.laborCost || 0,
		laborHours: data.laborHours || 0,
		totalCost: data.totalCost || 0,
		startDate: data.startDate ? new Date(data.startDate) : null,
		completedDate: data.completedDate ? new Date(data.completedDate) : null,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(schema.repairs).values(newRepair);

	// Add parts if provided
	if (data.parts && Array.isArray(data.parts)) {
		for (const part of data.parts) {
			await db.insert(schema.repairParts).values({
				id: crypto.randomUUID(),
				repairId,
				name: part.name,
				description: part.description || null,
				quantity: part.quantity || 1,
				unitCost: part.unitCost || 0,
				totalCost: part.totalCost || 0,
				sourceUrl: part.sourceUrl || null,
				createdAt: new Date()
			});
		}
	}

	return json({ ...newRepair, parts: data.parts || [] }, { status: 201 });
};
