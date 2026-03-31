import { db, schema } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import { findUserShop, isShopMember } from '$lib/server/api-utils';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user;

	if (!user) {
		return {};
	}

	if (isShopMember(user)) {
		const shop = await findUserShop(user);

		if (shop) {
			const [car] = await db
				.select({ id: schema.cars.id })
				.from(schema.cars)
				.leftJoin(schema.repairs, eq(schema.repairs.carId, schema.cars.id))
				.where(
					and(
						eq(schema.cars.id, params.id),
						or(eq(schema.repairs.shopId, shop.id), eq(schema.repairs.assignedMechanicId, user.id))
					)
				)
				.limit(1);

			if (car) {
				return {};
			}
		}
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
