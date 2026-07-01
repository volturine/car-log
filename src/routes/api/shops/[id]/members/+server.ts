import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, validateBody, fetchById, verifyShopAccess } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { USER_ROLE } from '$lib/constants';
import { z } from 'zod';

const logger = apiLogger.child('shop-members');

const addMemberSchema = z.object({
	userId: z.string().uuid(),
	role: z.enum(['mechanic', 'owner']).default('mechanic')
});

export const GET: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const accessResult = await verifyShopAccess(params.id, user.id, user.role || USER_ROLE.CUSTOMER);
	if (accessResult.isErr()) {
		return json(
			{ success: false, error: accessResult.error.message },
			{ status: accessResult.error.status }
		);
	}

	const members = await db
		.select({
			userId: schema.shopMembers.userId,
			role: schema.shopMembers.role,
			joinedAt: schema.shopMembers.joinedAt,
			userName: schema.users.name,
			userEmail: schema.users.email,
			userImage: schema.users.image
		})
		.from(schema.shopMembers)
		.leftJoin(schema.users, eq(schema.shopMembers.userId, schema.users.id))
		.where(eq(schema.shopMembers.shopId, params.id));

	logger.debug('Members fetched', { shopId: params.id, userId: user.id, count: members.length });

	return json({ success: true, data: members });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const shopResult = await fetchShopOwner(params.id, user.id, user.role || 'customer');
	if (!shopResult.ok) {
		return json(
			{ success: false, error: shopResult.error.message },
			{ status: shopResult.error.status }
		);
	}

	const validationErr = await validateBody(request, addMemberSchema);
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const { userId, role } = validationErr.value;

	const memberUserResult = await fetchById(schema.users, userId);
	if (memberUserResult.isErr()) {
		return json({ success: false, error: 'User not found' }, { status: 404 });
	}
	const memberUser = memberUserResult.value;

	const validRoles: Array<string> = [USER_ROLE.MECHANIC, USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN];
	if (!validRoles.includes(memberUser.role)) {
		return json({ success: false, error: 'User must be mechanic or shop owner' }, { status: 400 });
	}

	const [existing] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)))
		.limit(1);

	if (existing) {
		return json({ success: false, error: 'Already a member' }, { status: 400 });
	}

	const newMember = { userId, shopId: params.id, role, joinedAt: new Date() };
	await db.insert(schema.shopMembers).values(newMember);

	if (memberUser.role === USER_ROLE.MECHANIC) {
		await db.update(schema.users).set({ shopId: params.id }).where(eq(schema.users.id, userId));
	}

	logger.info('Member added', { shopId: params.id, userId });

	return json(
		{
			success: true,
			data: { ...newMember, userName: memberUser.name, userEmail: memberUser.email }
		},
		{ status: 201 }
	);
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const shopResult = await fetchShopOwner(params.id, user.id, user.role || 'customer');
	if (!shopResult.ok) {
		return json(
			{ success: false, error: shopResult.error.message },
			{ status: shopResult.error.status }
		);
	}
	const shop = shopResult.value;

	const validationErr = await validateBody(request, z.object({ userId: z.string().uuid() }));
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const { userId } = validationErr.value;

	if (shop.ownerId === userId) {
		return json({ success: false, error: 'Cannot remove shop owner' }, { status: 400 });
	}

	const [member] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)))
		.limit(1);

	if (!member) {
		return json({ success: false, error: 'Member not found' }, { status: 404 });
	}

	await db
		.delete(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)));

	await db.update(schema.users).set({ shopId: null }).where(eq(schema.users.id, userId));

	logger.info('Member removed', { shopId: params.id, userId });

	return json({ success: true, data: { deleted: true } });
};

async function fetchShopOwner(
	shopId: string,
	userId: string,
	userRole: string
): Promise<
	| { ok: true; value: typeof schema.shops.$inferSelect }
	| { ok: false; error: { message: string; status: number } }
> {
	const shopResult = await fetchById(schema.shops, shopId);
	if (shopResult.isErr()) {
		return { ok: false, error: { message: 'Shop not found', status: 404 } };
	}
	const shop = shopResult.value;
	if (shop.ownerId !== userId && userRole !== USER_ROLE.ADMIN) {
		return { ok: false, error: { message: 'Only shop owner can manage members', status: 403 } };
	}
	return { ok: true, value: shop };
}
