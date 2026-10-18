import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	// Query builders return inert statement objects; writeBatch receives them.
	const txValues = vi.fn((values: unknown) => ({ kind: 'insert', values }));
	const txInsert = vi.fn(() => ({ values: txValues }));
	const txWhere = vi.fn(() => ({ kind: 'write' }));
	const txDelete = vi.fn(() => ({ where: txWhere }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const requireAuth = vi.fn(() => ({ id: 'owner-1', role: 'shop_owner' }));
	const validateBody = vi.fn(async () => ({
		carId: 'car-1',
		shopId: 'shop-1',
		title: 'Brake service',
		description: 'Pads and rotors',
		status: 'estimate_pending',
		appointmentAt: '2026-03-31T09:30:00.000Z',
		parts: [],
		estimatedCost: 0,
		estimatedHours: 0,
		laborCost: 0,
		laborHours: 0,
		totalCost: 0
	}));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const writeBatch = vi.fn(async () => undefined);
	const fetchById = vi.fn(async () => ({ id: 'car-1', userId: 'customer-1' }));
	const verifyShopAccess = vi.fn(async () => ({ id: 'shop-1' }));
	const isShopMember = vi.fn(() => true);
	const formatPhotosForResponse = vi.fn();
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		txValues,
		txInsert,
		txWhere,
		txDelete,
		txSet,
		txUpdate,
		requireAuth,
		validateBody,
		successResponse,
		writeBatch,
		fetchById,
		verifyShopAccess,
		isShopMember,
		formatPhotosForResponse,
		logger
	};
});

vi.mock('$lib/server/validation', () => ({
	repairSchema: {
		partial: vi.fn(() => ({}))
	}
}));

vi.mock('$lib/utils', () => ({
	generateId: vi.fn(() => 'repair-1')
}));

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			select: vi.fn(),
			update: state.txUpdate,
			delete: state.txDelete,
			insert: state.txInsert
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	validateBody: state.validateBody,
	successResponse: state.successResponse,
	writeBatch: state.writeBatch,
	fetchById: state.fetchById,
	formatPhotosForResponse: state.formatPhotosForResponse,
	isShopMember: state.isShopMember,
	verifyShopAccess: state.verifyShopAccess,
	verifyOwnership: vi.fn(),
	verifyRepairAccess: vi.fn()
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('POST /api/repairs', () => {
	beforeEach(() => {
		vi.resetModules();
		state.txValues.mockClear();
		state.txInsert.mockClear();
		state.requireAuth.mockClear();
		state.validateBody.mockClear();
		state.successResponse.mockClear();
		state.writeBatch.mockClear();
		state.fetchById.mockClear();
		state.verifyShopAccess.mockClear();
		state.isShopMember.mockClear();
	});

	it('persists appointmentAt for shop-created repairs', async () => {
		const { POST } = await import('../routes/api/repairs/+server');
		const response = await POST({
			request: new Request('http://test.local/api/repairs', { method: 'POST' }),
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);
		const body = await response.json();

		expect(state.verifyShopAccess).toHaveBeenCalledWith('shop-1', 'owner-1', 'shop_owner');
		expect(state.writeBatch).toHaveBeenCalledOnce();
		expect(state.writeBatch).toHaveBeenCalledWith([
			expect.objectContaining({
				kind: 'insert',
				values: expect.objectContaining({ id: 'repair-1' })
			})
		]);
		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'repair-1'
			}
		});
		expect(body.data.appointmentAt).toBe('2026-03-31T09:30:00.000Z');
	});
});
