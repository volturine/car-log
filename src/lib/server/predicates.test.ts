import { describe, expect, it } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { memberWhere, notificationWhere } from './predicates';

const dialect = new SQLiteSyncDialect();

function render(where: Parameters<SQLiteSyncDialect['sqlToQuery']>[0]) {
	return dialect.sqlToQuery(where);
}

describe('notificationWhere', () => {
	it('keeps the user filter when unreadOnly is false', () => {
		const query = render(notificationWhere('user-1', false));

		expect(query.sql).toBe('"notifications"."user_id" = ?');
		expect(query.params).toEqual(['user-1']);
	});

	it('keeps the user filter when unreadOnly is true', () => {
		const query = render(notificationWhere('user-1', true));

		expect(query.sql).toBe('("notifications"."user_id" = ? and "notifications"."read" = ?)');
		expect(query.params).toEqual(['user-1', 0]);
	});
});

describe('memberWhere', () => {
	it('builds a combined membership predicate', () => {
		const query = render(memberWhere('shop-1', 'user-1'));

		expect(query.sql).toBe('("shop_members"."shop_id" = ? and "shop_members"."user_id" = ?)');
		expect(query.params).toEqual(['shop-1', 'user-1']);
	});
});
