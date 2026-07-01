import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { requireAuth, verifyOwnership } from '$lib/server/api-utils';
import { apiLogger } from '$lib/server/logger';

const logger = apiLogger.child('notifications');

export const PUT: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const ownershipResult = await verifyOwnership(
		schema.notifications,
		params.id,
		user.id,
		'Notification'
	);
	if (ownershipResult.isErr()) {
		return json(
			{ success: false, error: ownershipResult.error.message },
			{ status: ownershipResult.error.status }
		);
	}

	logger.info('Marking notification as read', { notificationId: params.id, userId: user.id });

	await db
		.update(schema.notifications)
		.set({
			read: true,
			readAt: new Date()
		})
		.where(eq(schema.notifications.id, params.id));

	logger.info('Notification marked as read', { notificationId: params.id, userId: user.id });

	return json({ success: true, data: { read: true } });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) {
		return json(
			{ success: false, error: userResult.error.message },
			{ status: userResult.error.status }
		);
	}

	const user = userResult.value;

	const ownershipResult = await verifyOwnership(
		schema.notifications,
		params.id,
		user.id,
		'Notification'
	);
	if (ownershipResult.isErr()) {
		return json(
			{ success: false, error: ownershipResult.error.message },
			{ status: ownershipResult.error.status }
		);
	}

	logger.info('Deleting notification', { notificationId: params.id, userId: user.id });

	await db.delete(schema.notifications).where(eq(schema.notifications.id, params.id));

	logger.info('Notification deleted', { notificationId: params.id, userId: user.id });

	return json({ success: true, data: { deleted: true } });
};
