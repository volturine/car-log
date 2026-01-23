import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, validateBody, successResponse } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

const logger = apiLogger.child('shop-members');

const addMemberSchema = z.object({
	userId: z.string().uuid('Invalid user ID'),
	role: z.enum(['mechanic', 'owner']).default('mechanic')
});

const removeMemberSchema = z.object({
	userId: z.string().uuid('Invalid user ID')
});

// POST /api/shops/[id]/members - Add member to shop (owner only)
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Verify shop ownership
	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner can add members');
	}

	const validatedData = await validateBody(request, addMemberSchema);

	logger.info('Adding member to shop', {
		shopId: params.id,
		userId: user.id,
		newMemberId: validatedData.userId
	});

	// Check if user exists and is a mechanic
	const [memberUser] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.id, validatedData.userId))
		.limit(1);

	if (!memberUser) {
		throw error(API_ERRORS.NOT_FOUND.status, 'User not found');
	}

	// Only mechanics or shop owners can be added to shops
	if (
		memberUser.role !== USER_ROLE.MECHANIC &&
		memberUser.role !== USER_ROLE.SHOP_OWNER &&
		memberUser.role !== USER_ROLE.ADMIN
	) {
		throw error(
			API_ERRORS.VALIDATION_ERROR.status,
			'Only users with mechanic or shop_owner role can be added to shops'
		);
	}

	// Check if already a member
	const [existingMember] = await db
		.select()
		.from(schema.shopMembers)
		.where(
			and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, validatedData.userId))
		)
		.limit(1);

	if (existingMember) {
		throw error(API_ERRORS.VALIDATION_ERROR.status, 'User is already a member of this shop');
	}

	const newMember = {
		userId: validatedData.userId,
		shopId: params.id,
		role: validatedData.role,
		joinedAt: new Date()
	};

	await db.insert(schema.shopMembers).values(newMember);

	// Update user's shopId if they're a mechanic
	if (memberUser.role === USER_ROLE.MECHANIC) {
		await db
			.update(schema.users)
			.set({ shopId: params.id })
			.where(eq(schema.users.id, validatedData.userId));
	}

	logger.info('Member added to shop', { shopId: params.id, newMemberId: validatedData.userId });

	return json(
		successResponse(
			{
				...newMember,
				userName: memberUser.name,
				userEmail: memberUser.email
			},
			201
		),
		{ status: 201 }
	);
};

// DELETE /api/shops/[id]/members - Remove member from shop (owner only)
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Verify shop ownership
	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner can remove members');
	}

	const validatedData = await validateBody(request, removeMemberSchema);

	logger.info('Removing member from shop', {
		shopId: params.id,
		userId: user.id,
		removeMemberId: validatedData.userId
	});

	// Cannot remove the owner
	if (shop.ownerId === validatedData.userId) {
		throw error(API_ERRORS.VALIDATION_ERROR.status, 'Cannot remove shop owner from shop');
	}

	// Check if member exists
	const [member] = await db
		.select()
		.from(schema.shopMembers)
		.where(
			and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, validatedData.userId))
		)
		.limit(1);

	if (!member) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Member not found in this shop');
	}

	// Remove member
	await db
		.delete(schema.shopMembers)
		.where(
			and(eq(schema.shopMembers.shopId, params.id), eq(schema.shopMembers.userId, validatedData.userId))
		);

	// Clear user's shopId
	await db
		.update(schema.users)
		.set({ shopId: null })
		.where(eq(schema.users.id, validatedData.userId));

	logger.info('Member removed from shop', { shopId: params.id, removedMemberId: validatedData.userId });

	return json(successResponse({ deleted: true }));
};
