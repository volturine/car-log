import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, requireRole, validateBody, verifyShopAccess } from '$lib/server/api-utils';
import { shopSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { USER_ROLE } from '$lib/constants';

const logger = apiLogger.child('shops');

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

	logger.debug('Fetching shop details', { shopId: params.id, userId: user.id });

	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		return json({ success: false, error: 'Shop not found' }, { status: 404 });
	}

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

	return json({ success: true, data: { ...shop, members } });
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const accessResult = await verifyShopAccess(params.id, user.id, user.role || 'customer');
	if (accessResult.isErr()) {
		return json(
			{ success: false, error: accessResult.error.message },
			{ status: accessResult.error.status }
		);
	}

	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		return json({ success: false, error: 'Shop not found' }, { status: 404 });
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		return json(
			{ success: false, error: 'Only shop owner can update shop details' },
			{ status: 403 }
		);
	}

	const validationErr = await validateBody(request, shopSchema);
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const validatedData = validationErr.value;

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

	return json({ success: true, data: { ...shop, ...updatedShop } });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userResult = requireRole(locals, [USER_ROLE.SHOP_OWNER, USER_ROLE.ADMIN]);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, params.id))
		.limit(1);

	if (!shop) {
		return json({ success: false, error: 'Shop not found' }, { status: 404 });
	}

	if (shop.ownerId !== user.id && user.role !== USER_ROLE.ADMIN) {
		return json(
			{ success: false, error: 'Only shop owner or admin can delete shop' },
			{ status: 403 }
		);
	}

	logger.info('Deleting shop', { shopId: params.id, userId: user.id });

	await db.delete(schema.shops).where(eq(schema.shops.id, params.id));

	logger.info('Shop deleted', { shopId: params.id, userId: user.id });

	return json({ success: true, data: { deleted: true } });
};
