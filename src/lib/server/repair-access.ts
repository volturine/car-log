import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { USER_ROLE } from '$lib/constants';
import { db, schema } from './db';

export async function verifyAssignedMechanic(
	shopId: string | null | undefined,
	mechanicId: string | null | undefined
): Promise<void> {
	if (mechanicId === null || mechanicId === undefined) return;

	if (!shopId) {
		throw error(400, 'Shop ID is required when assigning a mechanic');
	}

	const [mechanic] = await db
		.select({ id: schema.users.id })
		.from(schema.users)
		.innerJoin(schema.shopMembers, eq(schema.shopMembers.userId, schema.users.id))
		.where(
			and(
				eq(schema.users.id, mechanicId),
				eq(schema.users.role, USER_ROLE.MECHANIC),
				eq(schema.shopMembers.shopId, shopId)
			)
		)
		.limit(1);

	if (!mechanic) {
		throw error(400, 'Assigned mechanic must belong to the selected shop');
	}
}
