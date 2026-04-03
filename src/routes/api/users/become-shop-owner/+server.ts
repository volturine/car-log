import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { requireAuth, successResponse } from '$lib/server/api-utils';
import { auth } from '$lib/server/auth';
import { db, schema } from '$lib/server/db';
import { apiLogger } from '$lib/server/logger';
import { eq } from 'drizzle-orm';
import { error, json, type RequestHandler } from '@sveltejs/kit';

const logger = apiLogger.child('users');

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requireAuth(locals);

	if (user.role !== USER_ROLE.CUSTOMER) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Only customers can become shop owners');
	}

	await db
		.update(schema.users)
		.set({ role: USER_ROLE.SHOP_OWNER, updatedAt: new Date() })
		.where(eq(schema.users.id, user.id));

	const session = await auth.api.getSession({
		headers: request.headers,
		query: {
			disableCookieCache: true
		},
		returnHeaders: true
	});

	logger.info('User became shop owner', { userId: user.id });

	return json(successResponse({ role: USER_ROLE.SHOP_OWNER }), {
		headers: session.headers
	});
};
