import { error, type NumericRange } from '@sveltejs/kit';
import { db, schema } from './db';
import { eq, and } from 'drizzle-orm';
import type { AnySQLiteColumn, AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
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
	return user.role === USER_ROLE.SHOP_OWNER || user.role === USER_ROLE.MECHANIC;
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
	if (userRole === USER_ROLE.ADMIN) return shop;

	if (userRole === USER_ROLE.MECHANIC || userRole === USER_ROLE.SHOP_OWNER) {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(and(eq(schema.shopMembers.shopId, shopId), eq(schema.shopMembers.userId, userId)))
			.limit(1);
		if (membership) return shop;
	}

	throw error(API_ERRORS.FORBIDDEN.status, 'You do not have access to this shop');
}

export async function findUserShop(user: User): Promise<typeof schema.shops.$inferSelect | null> {
	if (!isShopMember(user)) {
		return null;
	}

	if (user.shopId) {
		const shop = await fetchById(schema.shops, user.shopId);
		if (shop) {
			return shop;
		}
	}

	const [member] = await db
		.select({ shopId: schema.shopMembers.shopId })
		.from(schema.shopMembers)
		.where(eq(schema.shopMembers.userId, user.id))
		.limit(1);

	if (member) {
		const shop = await fetchById(schema.shops, member.shopId);
		if (shop) {
			return shop;
		}
	}

	if (user.role !== USER_ROLE.SHOP_OWNER) {
		return null;
	}

	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.ownerId, user.id))
		.limit(1);

	return shop ?? null;
}

export async function verifyRepairAccess(
	repairId: string,
	user: User
): Promise<typeof schema.repairs.$inferSelect> {
	const repair = await fetchById(schema.repairs, repairId);

	if (!repair) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Repair not found');
	}

	if (repair.userId === user.id || user.role === USER_ROLE.ADMIN) {
		return repair;
	}

	if (!repair.shopId || !isShopMember(user)) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Repair not found');
	}

	await verifyShopAccess(repair.shopId, user.id, user.role || USER_ROLE.CUSTOMER);

	return repair;
}

export async function verifyPhotoAccess(
	photoId: string,
	user: User
): Promise<typeof schema.photos.$inferSelect> {
	const photo = await fetchById(schema.photos, photoId);

	if (!photo) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Photo not found');
	}

	if (photo.userId === user.id || user.role === USER_ROLE.ADMIN) {
		return photo;
	}

	await verifyRepairAccess(photo.repairId, user);

	return photo;
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

export type Mechanic = {
	id: string;
	name: string | null;
	email: string;
};

export async function getMechanic(id: string | null): Promise<Mechanic | null> {
	if (!id) {
		return null;
	}

	const [user] = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email
		})
		.from(schema.users)
		.where(eq(schema.users.id, id))
		.limit(1);

	return user ?? null;
}
