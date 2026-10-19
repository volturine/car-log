import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const results: unknown[][] = [];
	const select = vi.fn(() => {
		const limit = vi.fn(async () => results.shift() ?? []);
		const where = vi.fn(() => ({ limit }));
		return { from: vi.fn(() => ({ where })) };
	});
	const values = vi.fn((value: unknown) => ({ kind: 'insert', value }));
	const insert = vi.fn(() => ({ values }));
	const updateWhere = vi.fn(() => ({ kind: 'update' }));
	const set = vi.fn(() => ({ where: updateWhere }));
	const update = vi.fn(() => ({ set }));
	const requireAuth = vi.fn(() => ({ id: 'owner-1', role: 'shop_owner' }));
	const validateBody = vi.fn(
		async (request: Request, schema: { parse: (data: unknown) => unknown }) =>
			schema.parse(await request.json())
	);
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const writeBatch = vi.fn(async () => undefined);
	const fetchById = vi.fn(async (_table: unknown, id: string) => {
		if (id === 'shop-1') return { id, ownerId: 'owner-1' };
		return undefined;
	});
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		results,
		select,
		values,
		insert,
		updateWhere,
		set,
		update,
		requireAuth,
		validateBody,
		successResponse,
		writeBatch,
		fetchById,
		logger
	};
});

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			select: state.select,
			insert: state.insert,
			update: state.update
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	validateBody: state.validateBody,
	successResponse: state.successResponse,
	writeBatch: state.writeBatch,
	fetchById: state.fetchById
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('POST /api/shops/[id]/members/invite', () => {
	beforeEach(() => {
		vi.resetModules();
		state.results.length = 0;
		state.requireAuth.mockClear();
		state.validateBody.mockClear();
		state.successResponse.mockClear();
		state.writeBatch.mockClear();
		state.fetchById.mockClear();
		state.select.mockClear();
		state.values.mockClear();
		state.insert.mockClear();
		state.updateWhere.mockClear();
		state.set.mockClear();
		state.update.mockClear();
		state.logger.info.mockClear();
	});

	it('batches the invite and mechanic shop selection without logging the email', async () => {
		const email = 'alex@test.com';
		const userId = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
		state.results.push([{ id: userId, role: 'mechanic', name: 'Alex Mechanic', email }], []);
		const { POST } = await import('../routes/api/shops/[id]/members/invite/+server');
		const response = await POST({
			params: { id: 'shop-1' },
			request: new Request('http://test.local/api/shops/shop-1/members/invite', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email })
			}),
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);

		expect(response.status).toBe(201);
		expect(state.writeBatch).toHaveBeenCalledOnce();
		expect(state.writeBatch).toHaveBeenCalledWith([
			expect.objectContaining({ kind: 'insert', value: expect.objectContaining({ userId }) }),
			expect.objectContaining({ kind: 'update' })
		]);
		expect(state.logger.info).toHaveBeenCalledWith('Member invited', {
			shopId: 'shop-1',
			userId
		});
		expect(state.logger.info).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ email })
		);
	});
});
