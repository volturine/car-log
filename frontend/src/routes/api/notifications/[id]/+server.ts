import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership, successResponse } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';

const logger = apiLogger.child('notifications');

// PUT /api/notifications/[id] - Mark notification as read
export const PUT: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	// Verify notification belongs to user
	await verifyOwnership(schema.notifications, params.id, user.id, 'Notification');

	logger.info('Marking notification as read', { notificationId: params.id, userId: user.id });

	await db
		.update(schema.notifications)
		.set({
			read: true,
			readAt: new Date()
		})
		.where(eq(schema.notifications.id, params.id));

	logger.info('Notification marked as read', { notificationId: params.id, userId: user.id });

	return json(successResponse({ read: true }));
};

// DELETE /api/notifications/[id] - Delete notification
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	// Verify notification belongs to user
	await verifyOwnership(schema.notifications, params.id, user.id, 'Notification');

	logger.info('Deleting notification', { notificationId: params.id, userId: user.id });

	await db.delete(schema.notifications).where(eq(schema.notifications.id, params.id));

	logger.info('Notification deleted', { notificationId: params.id, userId: user.id });

	return json(successResponse({ deleted: true }));
};
