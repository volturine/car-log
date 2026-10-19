import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ROLE } from '$lib/constants';
import { bootstrapDatabase } from '$lib/server/db/bootstrap';
import * as schema from '$lib/server/db/schema';

let sqlite: InstanceType<typeof Database> | undefined;
let testDb: BetterSQLite3Database<typeof schema> | undefined;

function getDb(): BetterSQLite3Database<typeof schema> {
	if (!testDb) {
		throw new Error('Test database has not been initialized');
	}

	return testDb;
}

beforeEach(() => {
	vi.resetModules();
	sqlite = new Database(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON;');
	bootstrapDatabase(sqlite);
	testDb = drizzle(sqlite, { schema });

	getDb()
		.insert(schema.users)
		.values([
			{ id: 'owner-a', email: 'owner-a@example.test' },
			{ id: 'owner-b', email: 'owner-b@example.test' },
			{
				id: 'abcdefghijklmnopqrstuvwxyz123456',
				email: 'mechanic-a@example.test',
				role: USER_ROLE.MECHANIC
			},
			{ id: 'mechanic-b', email: 'mechanic-b@example.test', role: USER_ROLE.MECHANIC },
			{ id: 'customer-member', email: 'customer@example.test', role: USER_ROLE.CUSTOMER }
		])
		.run();
	getDb()
		.insert(schema.shops)
		.values([
			{ id: 'shop-a', name: 'Shop A', ownerId: 'owner-a' },
			{ id: 'shop-b', name: 'Shop B', ownerId: 'owner-b' }
		])
		.run();
	getDb()
		.insert(schema.shopMembers)
		.values([
			{ userId: 'abcdefghijklmnopqrstuvwxyz123456', shopId: 'shop-a' },
			{ userId: 'mechanic-b', shopId: 'shop-b' },
			{ userId: 'customer-member', shopId: 'shop-a' }
		])
		.run();

	vi.doMock('$lib/server/db', () => ({ db: getDb(), schema }));
});

afterEach(() => {
	sqlite?.close();
	sqlite = undefined;
	testDb = undefined;
});

describe('verifyAssignedMechanic', () => {
	it('accepts a mechanic who belongs to the selected shop', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(
			verifyAssignedMechanic('shop-a', 'abcdefghijklmnopqrstuvwxyz123456')
		).resolves.toBeUndefined();
	});

	it('rejects a mechanic who belongs to a different shop', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(verifyAssignedMechanic('shop-a', 'mechanic-b')).rejects.toMatchObject({
			status: 400,
			body: { message: 'Assigned mechanic must belong to the selected shop' }
		});
	});

	it('rejects a shop member whose user role is customer', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(verifyAssignedMechanic('shop-a', 'customer-member')).rejects.toMatchObject({
			status: 400,
			body: { message: 'Assigned mechanic must belong to the selected shop' }
		});
	});

	it('rejects an unknown user', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(verifyAssignedMechanic('shop-a', 'unknown-user')).rejects.toMatchObject({
			status: 400,
			body: { message: 'Assigned mechanic must belong to the selected shop' }
		});
	});

	it('requires a shop when a mechanic is assigned', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(verifyAssignedMechanic(null, 'mechanic-a')).rejects.toMatchObject({
			status: 400,
			body: { message: 'Shop ID is required when assigning a mechanic' }
		});
	});

	it('permits clearing the mechanic assignment', async () => {
		const { verifyAssignedMechanic } = await import('./repair-access');

		await expect(verifyAssignedMechanic('shop-a', null)).resolves.toBeUndefined();
	});
});
