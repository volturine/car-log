import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, validateBody, fetchById } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { USER_ROLE } from '$lib/constants';
import { z } from 'zod';

const logger = apiLogger.child('shop-members-invite');

const inviteSchema = z.object({
	email: z.string().email(),
	role: z.enum(['mechanic', 'owner']).default('mechanic')
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const shopResult = await fetchById(schema.shops, params.id);
	if (shopResult.isErr()) {
		return json({ success: false, error: 'Shop not found' }, { status: 404 });
	}
	const shop = shopResult.value;

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		return json({ success: false, error: 'Only shop owner can invite members' }, { status: 403 });
	}

	const validationErr = await validateBody(request, inviteSchema);
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const { email, role } = validationErr.value;

	const [target] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);

	if (!target) {
		return json({ success: false, error: 'No user found with that email' }, { status: 404 });
	}

	const validRoles: Array<string> = [USER_ROLE.MECHANIC, USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN];
	if (!validRoles.includes(target.role)) {
		return json(
			{ success: false, error: 'User must have mechanic or shop_owner role' },
			{ status: 400 }
		);
	}

	const [existing] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, target.id)))
		.limit(1);

	if (existing) {
		return json({ success: false, error: 'User is already a member' }, { status: 400 });
	}

	const member = { userId: target.id, shopId: params.id, role, joinedAt: new Date() };
	await db.insert(schema.shopMembers).values(member);

	if (target.role === USER_ROLE.MECHANIC) {
		await db.update(schema.users).set({ shopId: params.id }).where(eq(schema.users.id, target.id));
	}

	logger.info('Member invited by email', { shopId: params.id, email });

	return json(
		{ success: true, data: { ...member, userName: target.name, userEmail: target.email } },
		{ status: 201 }
	);
};
