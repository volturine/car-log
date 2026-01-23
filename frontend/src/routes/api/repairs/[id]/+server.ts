import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';

// GET /api/repairs/[id] - Get a specific repair
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [repair] = await db
		.select()
		.from(schema.repairs)
		.where(and(eq(schema.repairs.id, params.id), eq(schema.repairs.userId, locals.user.id)))
		.limit(1);

	if (!repair) {
		throw error(404, 'Repair not found');
	}

	// Get parts
	const parts = await db
		.select()
		.from(schema.repairParts)
		.where(eq(schema.repairParts.repairId, params.id));

	// Get photos
	const photos = await db
		.select()
		.from(schema.photos)
		.where(eq(schema.photos.repairId, params.id));

	return json({
		...repair,
		parts,
		photos: photos.map((p) => ({ id: p.id, url: `/api/photos/${p.id}` }))
	});
};

// PUT /api/repairs/[id] - Update a repair
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const data = await request.json();

	const [existingRepair] = await db
		.select()
		.from(schema.repairs)
		.where(and(eq(schema.repairs.id, params.id), eq(schema.repairs.userId, locals.user.id)))
		.limit(1);

	if (!existingRepair) {
		throw error(404, 'Repair not found');
	}

	const updatedRepair = {
		title: data.title,
		description: data.description || null,
		status: data.status || 'pending',
		laborCost: data.laborCost || 0,
		laborHours: data.laborHours || 0,
		totalCost: data.totalCost || 0,
		startDate: data.startDate ? new Date(data.startDate) : null,
		completedDate: data.completedDate ? new Date(data.completedDate) : null,
		updatedAt: new Date()
	};

	await db.update(schema.repairs).set(updatedRepair).where(eq(schema.repairs.id, params.id));

	// Update parts - delete old ones and insert new ones
	if (data.parts && Array.isArray(data.parts)) {
		await db.delete(schema.repairParts).where(eq(schema.repairParts.repairId, params.id));

		for (const part of data.parts) {
			await db.insert(schema.repairParts).values({
				id: crypto.randomUUID(),
				repairId: params.id,
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

	return json({ ...updatedRepair, id: params.id, parts: data.parts || [] });
};

// DELETE /api/repairs/[id] - Delete a repair
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const [existingRepair] = await db
		.select()
		.from(schema.repairs)
		.where(and(eq(schema.repairs.id, params.id), eq(schema.repairs.userId, locals.user.id)))
		.limit(1);

	if (!existingRepair) {
		throw error(404, 'Repair not found');
	}

	await db.delete(schema.repairs).where(eq(schema.repairs.id, params.id));

	return json({ success: true });
};
