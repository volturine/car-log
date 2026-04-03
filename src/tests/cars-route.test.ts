import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/validation', () => ({
	carSchema: {}
}));

const state = vi.hoisted(() => ({
	requireAuth: vi.fn(() => ({ id: 'admin-1', role: 'admin' })),
	verifyOwnership: vi.fn(),
	validateBody: vi.fn(),
	successResponse: vi.fn((data: unknown, status = 200) => ({ success: true, data, status })),
	isShopMember: vi.fn(() => false),
	findUserShop: vi.fn(async () => null),
	fetchById: vi.fn(async () => ({ id: 'car-1', userId: 'owner-1' })),
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	}
}));

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() },
		schema
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	verifyOwnership: state.verifyOwnership,
	validateBody: state.validateBody,
	successResponse: state.successResponse,
	isShopMember: state.isShopMember,
	findUserShop: state.findUserShop,
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
		state.requireAuth.mockReset();
		state.requireAuth.mockReturnValue({ id: 'admin-1', role: 'admin' });
		state.verifyOwnership.mockReset();
		state.successResponse.mockClear();
		state.isShopMember.mockReset();
		state.isShopMember.mockReturnValue(false);
		state.findUserShop.mockReset();
		state.findUserShop.mockResolvedValue(null);
		state.fetchById.mockReset();
		state.fetchById.mockResolvedValue({ id: 'car-1', userId: 'owner-1' });
		state.logger.debug.mockClear();
	});

	it('lets admins fetch cars they do not own', async () => {
		const { GET } = await import('../routes/api/cars/[id]/+server');
		const response = await GET({
			params: { id: 'car-1' },
			locals: { user: { id: 'admin-1', role: 'admin' } }
		} as never);
		const body = await response.json();

		expect(state.fetchById).toHaveBeenCalledOnce();
		expect(state.fetchById).toHaveBeenCalledWith(expect.anything(), 'car-1');
		expect(state.verifyOwnership).not.toHaveBeenCalled();
		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'car-1',
				userId: 'owner-1'
			}
		});
	});
});
