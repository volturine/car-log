import { error, type NumericRange } from '@sveltejs/kit';
import { db, schema } from './db';
import { eq, and } from 'drizzle-orm';
import type { AnySQLiteColumn, AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { API_ERRORS } from '$lib/constants';
import { z } from 'zod';

type User = NonNullable<App.Locals['user']>;
type IdTable = AnySQLiteTable<{ columns: { id: AnySQLiteColumn } }> & { id: AnySQLiteColumn };
type OwnedTable = AnySQLiteTable<{ columns: { id: AnySQLiteColumn; userId: AnySQLiteColumn } }> & {
	id: AnySQLiteColumn;
	userId: AnySQLiteColumn;
};
type Row<TTable extends AnySQLiteTable> = TTable['$inferSelect'];
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer TTx) => unknown ? TTx : never;

export function requireAuth(locals: App.Locals): User {
	if (!locals.user) {
		throw error(API_ERRORS.UNAUTHORIZED.status, API_ERRORS.UNAUTHORIZED.message);
	}

	return locals.user;
}

export function requireRole(locals: App.Locals, allowedRoles: string[]): User {
	const user = requireAuth(locals);

	if (!allowedRoles.includes(user.role || 'customer')) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Insufficient permissions');
	}

	return user;
}

export function isShopMember(user: User): boolean {
	return user.role === 'shop_owner' || user.role === 'mechanic';
}

export async function fetchById<TTable extends IdTable>(
	table: TTable,
	id: Row<TTable>['id']
): Promise<Row<TTable> | undefined> {
	const [record] = await db.select().from(table).where(eq(table.id, id)).limit(1);
	return record;
}

export async function verifyShopAccess(shopId: string, userId: string, userRole: string) {
	const shop = await fetchById(schema.shops, shopId);
	if (!shop) throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');

	if (shop.ownerId === userId) return shop;

	if (userRole === 'mechanic') {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(and(eq(schema.shopMembers.shopId, shopId), eq(schema.shopMembers.userId, userId)))
			.limit(1);
		if (membership) return shop;
	}

	throw error(API_ERRORS.FORBIDDEN.status, 'You do not have access to this shop');
}

export async function verifyOwnership<TTable extends OwnedTable>(
	table: TTable,
	resourceId: Row<TTable>['id'],
	userId: Row<TTable>['userId'],
	resourceName: string = 'Resource'
): Promise<Row<TTable>> {
	const record = await fetchById(table, resourceId);
	if (!record || record.userId !== userId) {
		throw error(API_ERRORS.NOT_FOUND.status, `${resourceName} not found`);
	}
	return record;
}

export async function validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
	try {
		const data = await request.json();
		return schema.parse(data);
	} catch (err) {
		if (err instanceof z.ZodError) {
			const errorMessage = err.issues
				.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
				.join(', ');
			throw error(API_ERRORS.VALIDATION_ERROR.status, errorMessage);
		}
		throw error(400, 'Invalid request body');
	}
}

export function successResponse<T>(data: T, status: NumericRange<200, 299> = 200) {
	return {
		success: true as const,
		data,
		status
	};
}

export function transaction<T>(callback: (tx: Tx) => T): T {
	return db.transaction((tx) => {
		return callback(tx);
	});
}

export function formatPhotosForResponse(
	photos: Array<{ id: string }>
): Array<{ id: string; url: string }> {
	return photos.map((p) => ({
		id: p.id,
		url: `/api/photos/${p.id}`
	}));
}
