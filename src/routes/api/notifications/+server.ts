import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, successResponse } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';

const logger = apiLogger.child('notifications');

// GET /api/notifications - Get all notifications for the current user
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	const unreadOnly = url.searchParams.get('unread') === 'true';

	logger.debug('Fetching notifications', { userId: user.id, unreadOnly });

	let query = db
		.select()
		.from(schema.notifications)
		.where(eq(schema.notifications.userId, user.id))
		.orderBy(desc(schema.notifications.createdAt));

	if (unreadOnly) {
		query = query.where(eq(schema.notifications.read, false));
	}

	const notifications = await query;

	logger.debug('Notifications fetched', { count: notifications.length, userId: user.id });

	return json(successResponse(notifications));
};
