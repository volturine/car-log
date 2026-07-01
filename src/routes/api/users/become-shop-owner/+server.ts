import { requireAuth } from '$lib/server/api-utils';
import { auth } from '$lib/server/auth';
import { db, schema } from '$lib/server/db';
import { apiLogger } from '$lib/server/logger';
import { eq } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';
import { USER_ROLE } from '$lib/constants';

const logger = apiLogger.child('users');

export const POST: RequestHandler = async ({ locals, request }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	if (user.role !== USER_ROLE.CUSTOMER) {
		return json(
			{ success: false, error: 'Only customers can become shop owners' },
			{ status: 403 }
		);
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

	return json(
		{ success: true, data: { role: USER_ROLE.SHOP_OWNER } },
		{
			status: 200,
			headers: session.headers
		}
	);
};
