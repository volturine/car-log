import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok as _ok, err as _err } from 'neverthrow';

type Tx = {
	insert: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
};

const state = vi.hoisted(() => {
	const txRun = vi.fn();
	const txValues = vi.fn(() => ({ run: txRun }));
	const txInsert = vi.fn(() => ({ values: txValues }));
	const txWhere = vi.fn(() => ({ run: txRun }));
	const txDelete = vi.fn(() => ({ where: txWhere }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const tx: Tx = {
		insert: txInsert,
		delete: txDelete,
		update: txUpdate
	};
	const requireAuth = vi.fn(() => _ok({ id: 'owner-1', role: 'shop_owner' }));
	const validateBody = vi.fn(async () =>
		_ok({
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
		})
	);
	const transaction = vi.fn((callback: (tx: Tx) => unknown) => callback(tx));
	const fetchById = vi.fn(async () => _ok({ id: 'car-1', userId: 'customer-1' }));
	const verifyShopAccess = vi.fn(async () => _ok({ id: 'shop-1' }));
	const isShopMember = vi.fn(() => true);
	const formatPhotosForResponse = vi.fn();
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		txRun,
		txValues,
		txInsert,
		txWhere,
		txDelete,
		txSet,
		txUpdate,
		tx,
		requireAuth,
		validateBody,
		transaction,
		fetchById,
		verifyShopAccess,
		isShopMember,
		formatPhotosForResponse,
		logger
	};
});

vi.mock('$lib/server/validation', () => ({
	repairSchema: {
		partial: vi.fn(() => ({})),
		parse: vi.fn((body: unknown) => body)
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
			update: vi.fn(),
			delete: vi.fn(),
			insert: vi.fn(() => ({
				values: vi.fn(() => ({
					returning: vi.fn(async () => [{ id: 'repair-1' }])
				}))
			}))
		}
	};
});

vi.mock('$lib/server/api-utils', async () => {
	const actual =
		await vi.importActual<typeof import('$lib/server/api-utils')>('$lib/server/api-utils');

	return {
		...actual,
		requireAuth: state.requireAuth,
		validateBody: state.validateBody,
		transaction: state.transaction,
		fetchById: state.fetchById,
		formatPhotosForResponse: state.formatPhotosForResponse,
		isShopMember: state.isShopMember,
		verifyShopAccess: state.verifyShopAccess,
		verifyOwnership: vi.fn(),
		verifyRepairAccess: vi.fn()
	};
});

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('POST /api/repairs', () => {
	beforeEach(() => {
		vi.resetModules();
		state.txRun.mockClear();
		state.txValues.mockClear();
		state.txInsert.mockClear();
		state.requireAuth.mockClear();
		state.validateBody.mockClear();
		state.transaction.mockClear();
		state.fetchById.mockClear();
		state.verifyShopAccess.mockClear();
		state.isShopMember.mockClear();
	});

	it('persists appointmentAt for shop-created repairs', async () => {
		const { POST } = await import('../routes/api/repairs/+server');
		const response = await POST({
			request: new Request('http://test.local/api/repairs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
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
				})
			}),
			locals: { user: { id: 'owner-1', role: 'shop_owner' } }
		} as never);
		const body = await response.json();

		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'repair-1'
			}
		});
	});
});
