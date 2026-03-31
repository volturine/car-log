import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import { requireAuth, successResponse } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { notificationWhere } from '$lib/server/predicates';

const logger = apiLogger.child('notifications');

// GET /api/notifications - Get all notifications for the current user
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	const unreadOnly = url.searchParams.get('unread') === 'true';

	logger.debug('Fetching notifications', { userId: user.id, unreadOnly });

	const notifications = await db
		.select()
		.from(schema.notifications)
		.where(notificationWhere(user.id, unreadOnly))
		.orderBy(desc(schema.notifications.createdAt));

	logger.debug('Notifications fetched', { count: notifications.length, userId: user.id });

	return json(successResponse(notifications));
};
