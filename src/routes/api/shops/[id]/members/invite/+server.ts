import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	requireAuth,
	validateBody,
	successResponse,
	writeBatch,
	fetchById
} from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { z } from 'zod';

const logger = apiLogger.child('shop-members-invite');

const inviteSchema = z.object({
	email: z.string().email(),
	role: z.enum(['mechanic', 'owner']).default('mechanic')
});

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	const shop = await fetchById(schema.shops, params.id);
	if (!shop) throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner can invite members');
	}

	const { email, role } = await validateBody(request, inviteSchema);

	const [target] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);

	if (!target) throw error(API_ERRORS.NOT_FOUND.status, 'No user found with that email');

	const validRoles: Array<string> = [USER_ROLE.MECHANIC, USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN];
	if (!validRoles.includes(target.role)) {
		throw error(API_ERRORS.VALIDATION_ERROR.status, 'User must have mechanic or shop_owner role');
	}

	const [existing] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, target.id)))
		.limit(1);

	if (existing) throw error(API_ERRORS.VALIDATION_ERROR.status, 'User is already a member');

	const member = { userId: target.id, shopId: params.id, role, joinedAt: new Date() };
	const insert = db.insert(schema.shopMembers).values(member);
	const statements =
		target.role === USER_ROLE.MECHANIC
			? ([
					insert,
					db.update(schema.users).set({ shopId: params.id }).where(eq(schema.users.id, target.id))
				] as const)
			: ([insert] as const);
	await writeBatch(statements);

	logger.info('Member invited', { shopId: params.id, userId: target.id });

	return json(successResponse({ ...member, userName: target.name, userEmail: target.email }, 201), {
		status: 201
	});
};
