import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';

vi.mock('$lib/server/validation', () => ({
	carSchema: {}
}));

const state = vi.hoisted(() => {
	const requireAuth = vi.fn();
	const verifyOwnership = vi.fn();
	const fetchById = vi.fn();
	const dbSelect = vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(() => ({
				limit: vi.fn(async () => [{ id: 'car-1', userId: 'owner-1' }])
			}))
		}))
	}));
	const logger = {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	};

	return {
		requireAuth,
		verifyOwnership,
		fetchById,
		dbSelect,
		logger
	};
});

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		db: {
			select: state.dbSelect
		},
		schema
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	verifyOwnership: state.verifyOwnership,
	validateBody: vi.fn(),
	isShopMember: vi.fn(() => false),
	findUserShop: vi.fn(async () => null),
	fetchById: state.fetchById
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('GET /api/cars/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		state.requireAuth.mockReturnValue(ok({ id: 'admin-1', role: 'admin' }));
		state.verifyOwnership.mockReset();
		state.verifyOwnership.mockResolvedValue(ok({ id: 'car-1', userId: 'owner-1' }));
		state.fetchById.mockReset();
		state.fetchById.mockResolvedValue(ok({ id: 'car-1', userId: 'owner-1' }));
		state.logger.debug.mockClear();
	});

	it('lets admins fetch cars they do not own', async () => {
		const { GET } = await import('../routes/api/cars/[id]/+server');
		const response = await GET({
			params: { id: 'car-1' },
			locals: { user: { id: 'admin-1', role: 'admin' } }
		} as never);
		const body = await response.json();

		expect(state.verifyOwnership).toHaveBeenCalledOnce();
		expect(state.verifyOwnership).toHaveBeenCalledWith(
			expect.anything(),
			'car-1',
			'admin-1',
			'Car'
		);
		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'car-1',
				userId: 'owner-1'
			}
		});
	});
});
