import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import {
	requireAuth,
	requireRole,
	validateBody,
	successResponse,
	verifyShopAccess
} from '$lib/server/api-utils';
import { shopSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { error } from '@sveltejs/kit';

const logger = apiLogger.child('shops');

// GET /api/shops/[id] - Get shop details with members
export const GET: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	logger.debug('Fetching shop details', { shopId: params.id, userId: user.id });

	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	// Get shop members
	const members = await db
		.select({
			userId: schema.shopMembers.userId,
			role: schema.shopMembers.role,
			joinedAt: schema.shopMembers.joinedAt,
			userName: schema.users.name,
			userEmail: schema.users.email
		})
		.from(schema.shopMembers)
		.leftJoin(schema.users, eq(schema.shopMembers.userId, schema.users.id))
		.where(eq(schema.shopMembers.shopId, params.id));

	logger.debug('Shop details fetched', { shopId: params.id, membersCount: members.length });

	return json(
		successResponse({
			...shop,
			members
		})
	);
};

// PUT /api/shops/[id] - Update shop details (owner only)
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// Verify shop access - only owner can update
	await verifyShopAccess(params.id, user.id, user.role || 'customer');

	// Additional check: only owner or admin can update
	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner can update shop details');
	}

	// Validate request body
	const validatedData = await validateBody(request, shopSchema);

	logger.info('Updating shop', { shopId: params.id, userId: user.id });

	const updatedShop = {
		name: validatedData.name,
		email: validatedData.email || null,
		phone: validatedData.phone || null,
		address: validatedData.address || null,
		city: validatedData.city || null,
		state: validatedData.state || null,
		zipCode: validatedData.zipCode || null,
		businessHours: validatedData.businessHours || null,
		specialties: validatedData.specialties ? JSON.stringify(validatedData.specialties) : null,
		updatedAt: new Date()
	};

	await db.update(schema.shops).set(updatedShop).where(eq(schema.shops.id, params.id));

	logger.info('Shop updated', { shopId: params.id, userId: user.id });

	return json(successResponse({ ...shop, ...updatedShop }));
};

// DELETE /api/shops/[id] - Delete shop (owner or admin only)
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireRole(locals, [USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN]);

	// Verify shop access
	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only shop owner or admin can delete shop');
	}

	logger.info('Deleting shop', { shopId: params.id, userId: user.id });

	// Delete shop (cascade will delete shop members)
	await db.delete(schema.shops).where(eq(schema.shops.id, params.id));

	logger.info('Shop deleted', { shopId: params.id, userId: user.id });

	return json(successResponse({ deleted: true }));
};
