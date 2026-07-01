import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';

vi.mock('zod', () => {
	const text = {
		uuid: vi.fn(() => text)
	};
	const role = {
		default: vi.fn(() => role)
	};
	const obj = {};

	return {
		z: {
			object: vi.fn(() => obj),
			string: vi.fn(() => text),
			enum: vi.fn(() => role)
		}
	};
});

const state = vi.hoisted(() => {
	const rows = [
		{
			userId: 'member-1',
			role: 'mechanic',
			joinedAt: new Date('2026-03-01T10:00:00.000Z'),
			userName: 'Alex Mechanic',
			userEmail: 'alex@test.com',
			userImage: null
		}
	];
	const where = vi.fn(async () => rows);
	const leftJoin = vi.fn(() => ({ where }));
	const from = vi.fn(() => ({ leftJoin }));
	const select = vi.fn(() => ({ from }));
	const requireAuth = vi.fn(() => ok({ id: 'owner-1', role: 'shop_owner' }));
	const verifyShopAccess = vi.fn(async () => ok({ id: 'shop-1' }));
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		rows,
		where,
		leftJoin,
		from,
		select,
		requireAuth,
		verifyShopAccess,
		logger
	};
});

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			select: state.select
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	verifyShopAccess: state.verifyShopAccess,
	validateBody: vi.fn(),
	fetchById: vi.fn()
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('GET /api/shops/[id]/members', () => {
	beforeEach(() => {
		vi.resetModules();
		state.select.mockClear();
		state.from.mockClear();
		state.leftJoin.mockClear();
		state.where.mockClear();
		state.requireAuth.mockClear();
		state.verifyShopAccess.mockClear();
		state.logger.debug.mockClear();
	});

	it('returns the authorized shop member list', async () => {
		const { GET } = await import('../routes/api/shops/[id]/members/+server');
		const response = await GET({
			params: { id: 'shop-1' },
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);
		const body = await response.json();

		expect(state.verifyShopAccess).toHaveBeenCalledWith('shop-1', 'owner-1', 'shop_owner');
		expect(body).toMatchObject({
			success: true,
			data: [
				{
					userId: 'member-1',
					role: 'mechanic',
					userEmail: 'alex@test.com'
				}
			]
		});
	});
});
