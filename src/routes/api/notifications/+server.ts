import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';
import { notificationWhere } from '$lib/server/predicates';

const logger = apiLogger.child('notifications');

export const GET: RequestHandler = async ({ locals, url }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

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
		carId: n.relatedType === 'repair' && n.relatedId ? repairCarMap.get(n.relatedId) : null
	}));

	logger.debug('Notifications fetched', { count: notifications.length, userId: user.id });

	return json({ success: true, data: notifications });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const { ids, read } = (await request.json()) as { ids?: string[]; read?: boolean };

	if (ids && ids.length > 0) {
		await db
			.update(schema.notifications)
			.set({ read: true, readAt: new Date() })
			.where(and(eq(schema.notifications.userId, user.id), inArray(schema.notifications.id, ids)));

		logger.info('Notifications marked as read', { userId: user.id });
	} else if (read !== undefined) {
		await db
			.update(schema.notifications)
			.set({ read: true, readAt: new Date() })
			.where(and(eq(schema.notifications.userId, user.id), eq(schema.notifications.read, !read)));

		logger.info('All notifications marked', { read, userId: user.id });
	}

	return json({ success: true, data: { updated: true } });
};
