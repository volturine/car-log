import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';

vi.mock('zod', () => {
	const text = {
		uuid: vi.fn(() => text),
		trim: vi.fn(() => text),
		min: vi.fn(() => text),
		max: vi.fn(() => text)
	};
	const obj = {
		safeParse: vi.fn((data: { shopId: string; query: string }) => ({
			success: true as const,
			data
		}))
	};

	return {
		z: {
			object: vi.fn(() => obj),
			string: vi.fn(() => text)
		}
	};
});

const state = vi.hoisted(() => {
	const shop = {
		id: 'shop-1',
		ownerId: 'owner-1'
	};
	const members = [{ userId: 'member-1' }];
	const users = [
		{
			id: 'user-2',
			email: 'alex@test.com',
			name: 'Alex Mechanic',
			image: null,
			role: 'mechanic'
		}
	];
	const limit = vi.fn(async () => users);
	const whereUsers = vi.fn(() => ({ limit }));
	const fromUsers = vi.fn(() => ({ where: whereUsers }));
	const whereMembers = vi.fn(async () => members);
	const fromMembers = vi.fn(() => ({ where: whereMembers }));
	const select = vi
		.fn()
		.mockImplementationOnce(() => ({ from: fromMembers }))
		.mockImplementationOnce(() => ({ from: fromUsers }));
	const requireAuth = vi.fn(() => ok({ id: 'owner-1', role: 'shop_owner' }));
	const fetchById = vi.fn(async () => ok(shop));
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		members,
		users,
		limit,
		whereUsers,
		fromUsers,
		whereMembers,
		fromMembers,
		select,
		requireAuth,
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
			select: state.select
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	fetchById: state.fetchById
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('GET /api/users', () => {
	beforeEach(() => {
		vi.resetModules();
		state.select.mockReset();
		state.select
			.mockImplementationOnce(() => ({ from: state.fromMembers }))
			.mockImplementationOnce(() => ({ from: state.fromUsers }));
		state.requireAuth.mockClear();
		state.fetchById.mockClear();
	});

	it('returns invite candidates for shop owners', async () => {
		const { GET } = await import('../routes/api/users/+server');
		const response = await GET({
			locals: { user: { id: 'owner-1', role: 'shop_owner' } },
			url: new URL('http://test.local/api/users?shopId=shop-1&query=alex')
		} as never);
		const body = await response.json();

		expect(state.fetchById).toHaveBeenCalledWith(expect.anything(), 'shop-1');
		expect(body).toMatchObject({
			success: true,
			data: [
				{
					id: 'user-2',
					email: 'alex@test.com',
					role: 'mechanic'
				}
			]
		});
	});
});
