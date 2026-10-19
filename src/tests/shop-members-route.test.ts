import { beforeEach, describe, expect, it, vi } from 'vitest';

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
	const memberRows: unknown[] = [];
	const getWhere = vi.fn(async () => rows);
	const limit = vi.fn(async () => memberRows);
	const memberWhere = vi.fn(() => ({ limit }));
	const leftJoin = vi.fn(() => ({ where: getWhere }));
	const from = vi.fn(() => ({ leftJoin, where: memberWhere }));
	const select = vi.fn(() => ({ from }));
	const values = vi.fn((value: unknown) => ({ kind: 'insert', value }));
	const insert = vi.fn(() => ({ values }));
	const deleteWhere = vi.fn((where: unknown) => ({ kind: 'delete', where }));
	const remove = vi.fn(() => ({ where: deleteWhere }));
	const updateWhere = vi.fn((where: unknown) => ({ kind: 'update', where }));
	const set = vi.fn((value: unknown) => ({ where: updateWhere, value }));
	const update = vi.fn(() => ({ set }));
	const requireAuth = vi.fn(() => ({ id: 'owner-1', role: 'shop_owner' }));
	const validateBody = vi.fn(
		async (request: Request, schema: { parse: (data: unknown) => unknown }) =>
			schema.parse(await request.json())
	);
	const verifyShopAccess = vi.fn(async () => ({ id: 'shop-1' }));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const writeBatch = vi.fn(async () => undefined);
	const fetchById = vi.fn(async (_table: unknown, id: string) => {
		if (id === 'shop-1') return { id, ownerId: 'owner-1' };
		if (id === 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6') {
			return { id, role: 'mechanic', name: 'Alex Mechanic', email: 'alex@test.com' };
		}
		return undefined;
	});
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
	const eq = vi.fn((column: unknown, value: unknown) => ({ kind: 'eq', column, value }));
	const and = vi.fn((...conditions: unknown[]) => ({ kind: 'and', conditions }));

	return {
		rows,
		memberRows,
		getWhere,
		limit,
		memberWhere,
		leftJoin,
		from,
		select,
		values,
		insert,
		deleteWhere,
		remove,
		updateWhere,
		set,
		update,
		requireAuth,
		validateBody,
		verifyShopAccess,
		successResponse,
		writeBatch,
		fetchById,
		logger,
		eq,
		and
	};
});

vi.mock('drizzle-orm', async (importOriginal) => {
	const actual = await importOriginal<typeof import('drizzle-orm')>();
	return { ...actual, eq: state.eq, and: state.and };
});

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			select: state.select,
			insert: state.insert,
			delete: state.remove,
			update: state.update
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	verifyShopAccess: state.verifyShopAccess,
	successResponse: state.successResponse,
	validateBody: state.validateBody,
	writeBatch: state.writeBatch,
	fetchById: state.fetchById
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('/api/shops/[id]/members', () => {
	beforeEach(() => {
		vi.resetModules();
		state.memberRows.length = 0;
		state.select.mockClear();
		state.from.mockClear();
		state.leftJoin.mockClear();
		state.memberWhere.mockClear();
		state.limit.mockClear();
		state.requireAuth.mockClear();
		state.verifyShopAccess.mockClear();
		state.successResponse.mockClear();
		state.validateBody.mockClear();
		state.writeBatch.mockClear();
		state.fetchById.mockClear();
		state.values.mockClear();
		state.insert.mockClear();
		state.deleteWhere.mockClear();
		state.remove.mockClear();
		state.updateWhere.mockClear();
		state.set.mockClear();
		state.update.mockClear();
		state.logger.debug.mockClear();
		state.logger.info.mockClear();
		state.eq.mockClear();
		state.and.mockClear();
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

	it('accepts a Better Auth user ID and batches membership with mechanic shop selection', async () => {
		const userId = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
		const { POST } = await import('../routes/api/shops/[id]/members/+server');
		const response = await POST({
			params: { id: 'shop-1' },
			request: new Request('http://test.local/api/shops/shop-1/members', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId })
			}),
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);

		expect(response.status).toBe(201);
		expect(state.writeBatch).toHaveBeenCalledOnce();
		expect(state.writeBatch).toHaveBeenCalledWith([
			expect.objectContaining({ kind: 'insert', value: expect.objectContaining({ userId }) }),
			expect.objectContaining({ kind: 'update' })
		]);
		expect(state.set).toHaveBeenCalledWith({ shopId: 'shop-1' });
	});

	it('accepts a Better Auth user ID and clears only the removed shop selection in the batch', async () => {
		const userId = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
		state.memberRows.push({ userId, shopId: 'shop-1', role: 'mechanic' });
		const { schema } = await import('$lib/server/db');
		const { DELETE } = await import('../routes/api/shops/[id]/members/+server');
		const response = await DELETE({
			params: { id: 'shop-1' },
			request: new Request('http://test.local/api/shops/shop-1/members', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId })
			}),
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);

		expect(response.status).toBe(200);
		expect(state.writeBatch).toHaveBeenCalledOnce();
		expect(state.writeBatch).toHaveBeenCalledWith([
			expect.objectContaining({ kind: 'delete' }),
			expect.objectContaining({ kind: 'update' })
		]);
		expect(state.set).toHaveBeenCalledWith({ shopId: null });
		expect(state.updateWhere).toHaveBeenCalledWith({
			kind: 'and',
			conditions: [
				{ kind: 'eq', column: schema.users.id, value: userId },
				{ kind: 'eq', column: schema.users.shopId, value: 'shop-1' }
			]
		});
	});
});
