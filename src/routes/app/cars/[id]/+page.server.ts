import { db, schema } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;

	if (!user) {
		return {};
	}

	const [car] = await db
		.select({ id: schema.cars.id })
		.from(schema.cars)
		.where(and(eq(schema.cars.id, params.id), eq(schema.cars.userId, user.id)))
		.limit(1);

	if (!car) {
		throw error(404, 'Car not found');
	}

	return {};
};
