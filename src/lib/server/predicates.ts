import { and, eq, type SQL } from 'drizzle-orm';
import { notifications, shopMembers } from '$lib/server/db/schema';

export function notificationWhere(userId: string, unreadOnly: boolean): SQL | undefined {
	if (!unreadOnly) {
		return eq(notifications.userId, userId);
	}

	return and(eq(notifications.userId, userId), eq(notifications.read, false));
}

export function memberWhere(shopId: string, userId: string): SQL | undefined {
	return and(eq(shopMembers.shopId, shopId), eq(shopMembers.userId, userId));
}
