import { and, eq, type SQL } from 'drizzle-orm';
import { notifications, shopMembers } from '$lib/server/db/schema';

export function notificationWhere(userId: string, unreadOnly: boolean): SQL<unknown> {
	if (!unreadOnly) {
		return eq(notifications.userId, userId);
	}

	const where = and(eq(notifications.userId, userId), eq(notifications.read, false));

	if (!where) {
		throw new Error('Invalid notification predicate');
	}

	return where;
}

export function memberWhere(shopId: string, userId: string): SQL<unknown> {
	const where = and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId));

	if (!where) {
		throw new Error('Invalid membership predicate');
	}

	return where;
}
