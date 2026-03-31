import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	requireAuth,
	validateBody,
	successResponse,
	fetchById,
	verifyShopAccess
} from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { z } from 'zod';

const logger = apiLogger.child('shop-members');

const addMemberSchema = z.object({
	userId: z.string().uuid(),
	role: z.enum(['mechanic', 'owner']).default('mechanic')
});

// Helper: Verify shop ownership
async function verifyShopOwner(shopId: string, userId: string, userRole: string) {
	const shop = await fetchById(schema.shops, shopId);
	if (!shop) throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	if (shop.ownerId !== userId && userRole !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner can manage members');
	}
	return shop;
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	await verifyShopAccess(params.id, user.id, user.role || USER_ROLE.CUSTOMER);

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

	return json(successResponse(members));
};

// POST /api/shops/[id]/members - Add member to shop
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	await verifyShopOwner(params.id, user.id, user.role || 'customer');

	const { userId, role } = await validateBody(request, addMemberSchema);

	// Verify user exists and has valid role
	const memberUser = await fetchById(schema.users, userId);
	if (!memberUser) throw error(API_ERRORS.NOT_FOUND.status, 'User not found');

	const validRoles: Array<string> = [USER_ROLE.MECHANIC, USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN];
	if (!validRoles.includes(memberUser.role)) {
		throw error(API_ERRORS.VALIDATION_ERROR.status, 'User must be mechanic or shop owner');
	}

	// Check if already member
	const [existing] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)))
		.limit(1);

	if (existing) throw error(API_ERRORS.VALIDATION_ERROR.status, 'Already a member');

	// Add member
	const newMember = { userId, shopId: params.id, role, joinedAt: new Date() };
	await db.insert(schema.shopMembers).values(newMember);

	// Update mechanic's shopId
	if (memberUser.role === USER_ROLE.MECHANIC) {
		await db.update(schema.users).set({ shopId: params.id }).where(eq(schema.users.id, userId));
	}

	logger.info('Member added', { shopId: params.id, userId });

	return json(
		successResponse({ ...newMember, userName: memberUser.name, userEmail: memberUser.email }, 201),
		{ status: 201 }
	);
};

// DELETE /api/shops/[id]/members - Remove member from shop
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	const shop = await verifyShopOwner(params.id, user.id, user.role || 'customer');

	const { userId } = await validateBody(request, z.object({ userId: z.string().uuid() }));

	if (shop.ownerId === userId) {
		throw error(API_ERRORS.VALIDATION_ERROR.status, 'Cannot remove shop owner');
	}

	// Verify member exists
	const [member] = await db
		.select()
		.from(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)))
		.limit(1);

	if (!member) throw error(API_ERRORS.NOT_FOUND.status, 'Member not found');

	// Remove member
	await db
		.delete(schema.shopMembers)
		.where(and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, userId)));

	await db.update(schema.users).set({ shopId: null }).where(eq(schema.users.id, userId));

	logger.info('Member removed', { shopId: params.id, userId });

	return json(successResponse({ deleted: true }));
};
