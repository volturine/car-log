import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { requireAuth, fetchById, successResponse } from '$lib/server/api-utils';
import { db, schema } from '$lib/server/db';
import { apiLogger } from '$lib/server/logger';
import { and, eq, like, notInArray, or } from 'drizzle-orm';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

const logger = apiLogger.child('users');

const querySchema = z.object({
	shopId: z.string().uuid(),
	query: z.string().trim().min(2).max(320)
});

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	if (user.role !== USER_ROLE.SHOP_OWNER && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owners or admins can search users');
	}

	const result = querySchema.safeParse({
		shopId: url.searchParams.get('shopId'),
		query: url.searchParams.get('query')
	});

	if (!result.success) {
		const message = result.error.issues.map((issue) => issue.message).join(', ');
		throw error(API_ERRORS.VALIDATION_ERROR.status, message);
	}

	const input = result.data;
	const shop = await fetchById(schema.shops, input.shopId);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	if (user.role !== USER_ROLE.ADMIN && shop.ownerId !== user.id) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owners or admins can search users');
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

	return json(successResponse(users));
};
