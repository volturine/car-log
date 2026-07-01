import { requireAuth, fetchById } from '$lib/server/api-utils';
import { db, schema } from '$lib/server/db';
import { apiLogger } from '$lib/server/logger';
import { and, eq, like, notInArray, or } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';
import { USER_ROLE } from '$lib/constants';

const logger = apiLogger.child('users');

const querySchema = z.object({
	shopId: z.string().uuid(),
	query: z.string().trim().min(2).max(320)
});

export const GET: RequestHandler = async ({ locals, url }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	if (user.role !== USER_ROLE.SHOP_OWNER && user.role !== USER_ROLE.ADMIN) {
		return json(
			{ success: false, error: 'Only shop owners or admins can search users' },
			{ status: 403 }
		);
	}

	const result = querySchema.safeParse({
		shopId: url.searchParams.get('shopId'),
		query: url.searchParams.get('query')
	});

	if (!result.success) {
		const message = result.error.issues.map((issue) => issue.message).join(', ');
		return json({ success: false, error: message }, { status: 400 });
	}

	const input = result.data;
	const shopResult = await fetchById(schema.shops, input.shopId);
	if (shopResult.isErr()) {
		return json({ success: false, error: 'Shop not found' }, { status: 404 });
	}
	const shop = shopResult.value;

	if (user.role !== USER_ROLE.ADMIN && shop.ownerId !== user.id) {
		return json(
			{ success: false, error: 'Only shop owners or admins can search users' },
			{ status: 403 }
		);
	}

	const term = `%${input.query}%`;
	const members = await db
		.select({ userId: schema.shopMembers.userId })
		.from(schema.shopMembers)
		.where(eq(schema.shopMembers.shopId, input.shopId));
	const memberIds = members.map((member) => member.userId);
	const query = memberIds.length
		? and(
				or(like(schema.users.email, term), like(schema.users.name, term)),
				or(
					eq(schema.users.role, USER_ROLE.MECHANIC),
					eq(schema.users.role, USER_ROLE.SHOP_OWNER),
					eq(schema.users.role, USER_ROLE.ADMIN)
				),
				notInArray(schema.users.id, memberIds)
			)
		: and(
				or(like(schema.users.email, term), like(schema.users.name, term)),
				or(
					eq(schema.users.role, USER_ROLE.MECHANIC),
					eq(schema.users.role, USER_ROLE.SHOP_OWNER),
					eq(schema.users.role, USER_ROLE.ADMIN)
				)
			);

	const users = await db
		.select({
			id: schema.users.id,
			email: schema.users.email,
			name: schema.users.name,
			image: schema.users.image,
			role: schema.users.role
		})
		.from(schema.users)
		.where(query)
		.limit(10);

	logger.debug('Invite candidates fetched', {
		shopId: input.shopId,
		userId: user.id,
		count: users.length
	});

	return json({ success: true, data: users });
};
