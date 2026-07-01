import { ok as _ok, err as _err } from 'neverthrow';

export const ok = _ok;
export const err = _err;
import { db, schema } from './db';
import { eq, and, inArray } from 'drizzle-orm';
import type { AnySQLiteColumn, AnySQLiteTable } from 'drizzle-orm/sqlite-core';
import { API_ERRORS, USER_ROLE } from '$lib/constants';
import { z } from 'zod';

export type ApiError =
	| { type: 'validation'; message: string; status: 400 }
	| { type: 'unauthorized'; message: string; status: 401 }
	| { type: 'forbidden'; message: string; status: 403 }
	| { type: 'not_found'; message: string; status: 404 };

type User = NonNullable<App.Locals['user']>;
type IdTable = AnySQLiteTable<{ columns: { id: AnySQLiteColumn } }> & { id: AnySQLiteColumn };
type OwnedTable = AnySQLiteTable<{ columns: { id: AnySQLiteColumn; userId: AnySQLiteColumn } }> & {
	id: AnySQLiteColumn;
	userId: AnySQLiteColumn;
};
type Row<TTable extends AnySQLiteTable> = TTable['$inferSelect'];
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer TTx) => unknown ? TTx : never;

export function requireAuth(locals: App.Locals) {
	if (!locals.user) {
		return err({ type: 'unauthorized', message: API_ERRORS.UNAUTHORIZED.message, status: 401 });
	}

	return ok(locals.user);
}

export function requireRole(locals: App.Locals, allowedRoles: string[]) {
	const userResult = requireAuth(locals);
	if (userResult.isErr()) return userResult;

	const user = userResult.value;

	if (!allowedRoles.includes(user.role || 'customer')) {
		return err({ type: 'forbidden', message: 'Insufficient permissions', status: 403 });
	}

	return ok(user);
}

export function isShopMember(user: User): boolean {
	return user.role === USER_ROLE.SHOP_OWNER || user.role === USER_ROLE.MECHANIC;
}

export async function fetchById<TTable extends IdTable>(table: TTable, id: Row<TTable>['id']) {
	const [record] = await db.select().from(table).where(eq(table.id, id)).limit(1);
	if (!record) {
		return err({ type: 'not_found', message: 'Not found', status: 404 });
	}

	return ok(record);
}

export async function verifyShopAccess(shopId: string, userId: string, userRole: string) {
	const shopResult = await fetchById(schema.shops, shopId);
	if (shopResult.isErr()) return shopResult;

	const shop = shopResult.value;

	if (shop.ownerId === userId) return ok(shop);
	if (userRole === USER_ROLE.ADMIN) return ok(shop);

	if (userRole === USER_ROLE.MECHANIC || userRole === USER_ROLE.SHOP_OWNER) {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(and(eq(schema.shopMembers.shopId, shopId), eq(schema.shopMembers.userId, userId)))
			.limit(1);
		if (membership) return ok(shop);
	}

	return err({ type: 'forbidden', message: 'You do not have access to this shop', status: 403 });
}

export async function findUserShop(user: User) {
	if (!isShopMember(user)) {
		return null;
	}

	if (user.shopId) {
		const shopResult = await fetchById(schema.shops, user.shopId);
		if (shopResult.isOk()) {
			return shopResult.value;
		}
	}

	const [member] = await db
		.select({ shopId: schema.shopMembers.shopId })
		.from(schema.shopMembers)
		.where(eq(schema.shopMembers.userId, user.id))
		.limit(1);

	if (member) {
		const shopResult = await fetchById(schema.shops, member.shopId);
		if (shopResult.isOk()) {
			return shopResult.value;
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

export async function verifyRepairAccess(repairId: string, user: User) {
	const repairResult = await fetchById(schema.repairs, repairId);
	if (repairResult.isErr()) return repairResult;

	const repair = repairResult.value;

	if (repair.userId === user.id || user.role === USER_ROLE.ADMIN) {
		return ok(repair);
	}

	if (!repair.shopId || !isShopMember(user)) {
		return err({ type: 'not_found', message: 'Repair not found', status: 404 });
	}

	const shopAccessResult = await verifyShopAccess(
		repair.shopId,
		user.id,
		user.role || USER_ROLE.CUSTOMER
	);
	if (shopAccessResult.isErr()) return shopAccessResult;

	return ok(repair);
}

export async function verifyPhotoAccess(photoId: string, user: User) {
	const photoResult = await fetchById(schema.photos, photoId);
	if (photoResult.isErr()) return photoResult;

	const photo = photoResult.value;

	if (photo.userId === user.id || user.role === USER_ROLE.ADMIN) {
		return ok(photo);
	}

	const repairResult = await verifyRepairAccess(photo.repairId, user);
	if (repairResult.isErr()) return repairResult;

	return ok(photo);
}

export async function verifyOwnership<TTable extends OwnedTable>(
	table: TTable,
	resourceId: Row<TTable>['id'],
	userId: Row<TTable>['userId'],
	resourceName: string = 'Resource'
) {
	const recordResult = await fetchById(table, resourceId);
	if (recordResult.isErr())
		return err({ type: 'not_found', message: `${resourceName} not found`, status: 404 });

	const record = recordResult.value;
	if (record.userId !== userId) {
		return err({ type: 'not_found', message: `${resourceName} not found`, status: 404 });
	}

	return ok(record);
}

export async function validateBody<T>(request: Request, schema: z.ZodSchema<T>) {
	try {
		const data = await request.json();
		const validated = schema.parse(data);
		return ok(validated);
	} catch (validationErr) {
		if (validationErr instanceof z.ZodError) {
			const message = validationErr.issues
				.map((e) => `${e.path.join('.')}: ${e.message}`)
				.join(', ');
			return err({ type: 'validation', message, status: 400 });
		}

		return err({ type: 'validation', message: 'Invalid request body', status: 400 });
	}
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

export async function getMechanicsByIds(ids: string[]): Promise<Mechanic[]> {
	if (ids.length === 0) {
		return [];
	}

	const unique = Array.from(new Set(ids));

	return db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			email: schema.users.email
		})
		.from(schema.users)
		.where(inArray(schema.users.id, unique));
}
