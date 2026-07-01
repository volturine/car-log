import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { requireRole, validateBody, transaction } from '$lib/server/api-utils';
import { shopSchema } from '$lib/server/validation';
import { apiLogger } from '$lib/server/logger';
import { generateId } from '$lib/utils';
import { eq } from 'drizzle-orm';

const logger = apiLogger.child('shops');

export const GET: RequestHandler = async () => {
	logger.debug('Fetching all shops');

	const shops = await db.select().from(schema.shops);

	logger.debug('Shops fetched', { count: shops.length });

	return json({ success: true, data: shops });
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const userResult = requireRole(locals, ['shop_owner', 'admin']);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const validationErr = await validateBody(request, shopSchema);
	if (validationErr.isErr()) {
		return json({ success: false, error: validationErr.error.message }, { status: 400 });
	}

	const validatedData = validationErr.value;

	logger.info('Creating shop', { userId: user.id, shopName: validatedData.name });

	const shopId = generateId();
	const now = new Date();

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
		specialties: validatedData.specialties ? JSON.stringify(validatedData.specialties) : null,
		logo: null,
		rating: 0,
		totalReviews: 0,
		createdAt: now,
		updatedAt: now
	};

	transaction((tx) => {
		tx.insert(schema.shops).values(newShop).run();
		tx.update(schema.users).set({ shopId }).where(eq(schema.users.id, user.id)).run();

		tx.insert(schema.shopMembers)
			.values({
				userId: user.id,
				shopId,
				role: 'owner',
				joinedAt: now
			})
			.run();
	});

	logger.info('Shop created', { shopId, userId: user.id });

	return json({ success: true, data: newShop }, { status: 201 });
};
