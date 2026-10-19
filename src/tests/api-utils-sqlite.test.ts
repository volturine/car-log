import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapDatabase } from '../lib/server/db/bootstrap';
import * as schema from '../lib/server/db/schema';

const state = vi.hoisted(() => ({ database: undefined as unknown }));

vi.mock('$platform', () => ({
	platform: {
		db: () => state.database,
		batch: vi.fn(async () => undefined)
	}
}));

function createDatabase() {
	return new Database(':memory:');
}

let sqlite: ReturnType<typeof createDatabase>;
let database: BetterSQLite3Database<typeof schema>;

beforeEach(() => {
	sqlite = createDatabase();
	bootstrapDatabase(sqlite);
	sqlite.exec('PRAGMA foreign_keys = ON;');
	database = drizzle(sqlite, { schema });
	state.database = database;
});

afterEach(() => {
	sqlite.close();
});

describe('findUserShop against SQLite', () => {
	it('rejects revoked hints, falls back to membership, and finds owned shops', async () => {
		await database.insert(schema.users).values([
			{ id: 'mechanic-1', email: 'mechanic@test.com', role: 'mechanic', shopId: 'shop-revoked' },
			{ id: 'other-owner', email: 'other@test.com', role: 'shop_owner' },
			{ id: 'owner-1', email: 'owner@test.com', role: 'shop_owner', shopId: 'shop-revoked' }
		]);
		await database.insert(schema.shops).values([
			{ id: 'shop-revoked', name: 'Revoked', ownerId: 'other-owner' },
			{ id: 'shop-current', name: 'Current', ownerId: 'other-owner' },
			{ id: 'shop-owned', name: 'Owned', ownerId: 'owner-1' }
		]);
		await database
			.insert(schema.shopMembers)
			.values({ userId: 'mechanic-1', shopId: 'shop-current', role: 'mechanic' });

		const { findUserShop } = await import('../lib/server/api-utils');
		const mechanic = {
			id: 'mechanic-1',
			role: 'mechanic',
			shopId: 'shop-revoked'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];
		const ownerWithStaleHint = {
			id: 'owner-1',
			role: 'shop_owner',
			shopId: 'shop-revoked'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];
		const ownerWithOwnedHint = {
			id: 'owner-1',
			role: 'shop_owner',
			shopId: 'shop-owned'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];

		await expect(findUserShop(mechanic)).resolves.toMatchObject({ id: 'shop-current' });
		await database.delete(schema.shopMembers);
		await expect(findUserShop(mechanic)).resolves.toBeNull();
		await expect(findUserShop(ownerWithStaleHint)).resolves.toMatchObject({ id: 'shop-owned' });
		await expect(findUserShop(ownerWithOwnedHint)).resolves.toMatchObject({ id: 'shop-owned' });
	});
});
