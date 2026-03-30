import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	requireAuth,
	requireRole,
	validateBody,
	successResponse
} from '$lib/server/api-utils';
import { shopSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils/helpers';

const logger = apiLogger.child('shops');

// GET /api/shops - List all shops (public)
export const GET: RequestHandler = async () => {
	logger.debug('Fetching all shops');

	const shops = await db.select().from(schema.shops);

	logger.debug('Shops fetched', { count: shops.length });

	return json(successResponse(shops));
};

// POST /api/shops - Create a new shop (shop_owner only)
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireRole(locals, ['shop_owner', 'admin']);

	// Validate request body
	const validatedData = await validateBody(request, shopSchema);

	logger.info('Creating shop', { userId: user.id, shopName: validatedData.name });

	const shopId = generateId();

	const newShop = {
		id: shopId,
		ownerId: user.id,
		name: validatedData.name,
		email: validatedData.email || null,
		phone: validatedData.phone || null,
		address: validatedData.address || null,
		city: validatedData.city || null,
		state: validatedData.state || null,
		zipCode: validatedData.zipCode || null,
		businessHours: validatedData.businessHours || null,
		specialties: validatedData.specialties
			? JSON.stringify(validatedData.specialties)
			: null,
		logo: null,
		rating: 0,
		totalReviews: 0,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	await db.insert(schema.shops).values(newShop);

	// Add owner as shop member
	await db.insert(schema.shopMembers).values({
		userId: user.id,
		shopId: shopId,
		role: 'owner',
		joinedAt: new Date()
	});

	logger.info('Shop created', { shopId, userId: user.id });

	return json(successResponse(newShop, 201), { status: 201 });
};
