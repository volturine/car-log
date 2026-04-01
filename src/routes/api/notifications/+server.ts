import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireAuth, successResponse } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { notificationWhere } from '$lib/server/predicates';

const logger = apiLogger.child('notifications');

// GET /api/notifications - Get all notifications for the current user
export const GET: RequestHandler = async ({ locals, url }) => {
	const user = requireAuth(locals);

	const unreadOnly = url.searchParams.get('unread') === 'true';

	logger.debug('Fetching notifications', { userId: user.id, unreadOnly });

	const rows = await db
		.select()
		.from(schema.notifications)
		.where(notificationWhere(user.id, unreadOnly))
		.orderBy(desc(schema.notifications.createdAt));

	const repairIds = rows
		.filter((n) => n.relatedType === 'repair' && n.relatedId)
		.map((n) => n.relatedId!);

	const uniqueIds = [...new Set(repairIds)];

	const repairCarMap = new Map<string, string>();
	if (uniqueIds.length > 0) {
		const repairs = await db
			.select({ id: schema.repairs.id, carId: schema.repairs.carId })
			.from(schema.repairs)
			.where(inArray(schema.repairs.id, uniqueIds));

		for (const r of repairs) {
			repairCarMap.set(r.id, r.carId);
		}
	}

	const notifications = rows.map((n) => ({
		...n,
		carId:
			n.relatedType === 'repair' && n.relatedId ? (repairCarMap.get(n.relatedId) ?? null) : null
	}));

	logger.debug('Notifications fetched', { count: notifications.length, userId: user.id });

	return json(successResponse(notifications));
};

// PUT /api/notifications - Mark all unread notifications as read for current user
export const PUT: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals);

	const where = and(eq(schema.notifications.userId, user.id), eq(schema.notifications.read, false));

	if (!where) {
		return json(successResponse({ updated: 0 }));
	}

	const unread = await db
		.select({ id: schema.notifications.id })
		.from(schema.notifications)
		.where(where);

	if (unread.length === 0) {
		return json(successResponse({ updated: 0 }));
	}

	await db.update(schema.notifications).set({ read: true, readAt: new Date() }).where(where);

	logger.info('Marked all notifications as read', { userId: user.id, updated: unread.length });

	return json(successResponse({ updated: unread.length }));
};
