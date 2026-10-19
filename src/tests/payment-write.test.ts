import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapDatabase } from '../lib/server/db/bootstrap';
import * as schema from '../lib/server/db/schema';
import type { WriteBatch } from '../lib/server/platform/types';

const state = vi.hoisted(() => ({
	db: undefined as unknown,
	writeBatch: vi.fn<(statements: WriteBatch) => Promise<void>>()
}));

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');
	const db = new Proxy(
		{},
		{
			get(_target, property) {
				const current = state.db;
				if (!current || typeof current !== 'object') {
					throw new Error('Test database has not been initialized');
				}

				const value = Reflect.get(current, property);
				return typeof value === 'function' ? value.bind(current) : value;
			}
		}
	);

	return { db, schema };
});

vi.mock('$lib/server/api-utils', () => ({
	writeBatch: state.writeBatch
}));

let sqlite: InstanceType<typeof Database> | undefined;
let testDb: BetterSQLite3Database<typeof schema> | undefined;

function getDb(): BetterSQLite3Database<typeof schema> {
	if (!testDb) {
		throw new Error('Test database has not been initialized');
	}

	return testDb;
}

async function currentRepair(): Promise<typeof schema.repairs.$inferSelect> {
	const [repair] = await getDb()
		.select()
		.from(schema.repairs)
		.where(eq(schema.repairs.id, 'repair-1'));
	if (!repair) {
		throw new Error('Test repair was not created');
	}

	return repair;
}

function makePayment(
	id: string,
	repair: typeof schema.repairs.$inferSelect
): typeof schema.payments.$inferInsert {
	const now = new Date('2026-10-19T12:00:00.000Z');

	return {
		id,
		repairId: repair.id,
		amount: 25,
		method: 'cash',
		notes: null,
		recordedBy: repair.userId,
		paidAt: now,
		createdAt: now
	};
}

function makeUpdate(repair: typeof schema.repairs.$inferSelect) {
	return {
		amountPaid: (repair.amountPaid ?? 0) + 25,
		paymentStatus: 'partial',
		status: 'completed',
		updatedAt: new Date('2026-10-19T12:00:00.000Z')
	} satisfies Pick<
		typeof schema.repairs.$inferInsert,
		'amountPaid' | 'paymentStatus' | 'status' | 'updatedAt'
	>;
}

beforeEach(async () => {
	vi.resetModules();
	sqlite = new Database(':memory:');
	sqlite.exec('PRAGMA foreign_keys = ON;');
	bootstrapDatabase(sqlite);
	testDb = drizzle(sqlite, { schema });
	state.db = testDb;
	state.writeBatch.mockReset();
	state.writeBatch.mockImplementation(async (statements) => {
		if (!sqlite) {
			throw new Error('Test database has not been initialized');
		}

		sqlite.transaction(() => {
			for (const statement of statements) {
				statement.run();
			}
		})();
	});

	await getDb().insert(schema.users).values({ id: 'owner-1', email: 'owner@example.test' });
	await getDb()
		.insert(schema.cars)
		.values({ id: 'car-1', userId: 'owner-1', brand: 'Skoda', model: 'Octavia', year: 2020 });
	await getDb().insert(schema.repairs).values({
		id: 'repair-1',
		carId: 'car-1',
		userId: 'owner-1',
		title: 'Oil change',
		status: 'completed',
		totalCost: 100,
		amountPaid: 0
	});
});

afterEach(() => {
	sqlite?.close();
	sqlite = undefined;
	testDb = undefined;
});

describe('recordPaymentIfUnchanged', () => {
	it('allows only one write from the same repair snapshot', async () => {
		const { recordPaymentIfUnchanged } = await import('../lib/server/payments');
		const repair = await currentRepair();

		const [first, second] = await Promise.all([
			recordPaymentIfUnchanged(repair, makePayment('payment-1', repair), makeUpdate(repair)),
			recordPaymentIfUnchanged(repair, makePayment('payment-2', repair), makeUpdate(repair))
		]);

		expect(first?.id).toBe('payment-1');
		expect(second).toBeNull();
		const ledger = await getDb()
			.select({ id: schema.payments.id, amount: schema.payments.amount })
			.from(schema.payments);
		const finalRepair = await currentRepair();

		expect(ledger).toEqual([{ id: 'payment-1', amount: 25 }]);
		expect(finalRepair.amountPaid).toBe(ledger.reduce((total, row) => total + row.amount, 0));
	});

	it('rolls the inserted ledger row back if repair totals cannot be updated', async () => {
		const { recordPaymentIfUnchanged } = await import('../lib/server/payments');
		const repair = await currentRepair();
		sqlite?.exec(`
			CREATE TRIGGER reject_payment_repair_update
			BEFORE UPDATE ON repairs
			BEGIN
				SELECT RAISE(ABORT, 'forced repair update failure');
			END;
		`);

		await expect(
			recordPaymentIfUnchanged(repair, makePayment('payment-1', repair), makeUpdate(repair))
		).rejects.toThrow('forced repair update failure');

		expect(await getDb().select().from(schema.payments)).toEqual([]);
		expect((await currentRepair()).amountPaid).toBe(0);
	});
});
