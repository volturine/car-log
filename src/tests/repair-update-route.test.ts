import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok as _ok, err as _err } from 'neverthrow';

type Tx = {
	insert: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
};

const state = vi.hoisted(() => {
	const repair = {
		id: 'repair-1',
		carId: 'car-1',
		userId: 'owner-1',
		shopId: 'shop-1',
		assignedMechanicId: null,
		title: 'Brake service',
		description: 'Pads and rotors',
		status: 'estimate_approved',
		estimatedCost: 200,
		estimatedHours: 2,
		estimateNotes: null,
		laborCost: 0,
		laborHours: 0,
		totalCost: 0,
		appointmentAt: null,
		startDate: null,
		completedDate: null,
		updatedAt: new Date('2026-03-31T08:00:00.000Z')
	};
	const partsWhere = vi.fn(async () => []);
	const partsFrom = vi.fn(() => ({ where: partsWhere }));
	const dbSelect = vi.fn(() => ({ from: partsFrom }));
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
	const requireAuth = vi.fn(() => _ok({ id: 'shop-1', role: 'shop_owner' }));
	const validateBody = vi.fn(async () => _ok({ status: 'completed' }));
	const transaction = vi.fn((callback: (tx: Tx) => unknown) => callback(tx));
	const verifyRepairAccess = vi.fn(async () => _ok(repair));
	const isShopMember = vi.fn(() => true);
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		repair,
		partsWhere,
		partsFrom,
		dbSelect,
		txRun,
		txValues,
		txInsert,
		txWhere,
		txDelete,
		txSet,
		txUpdate,
		requireAuth,
		validateBody,
		transaction,
		verifyRepairAccess,
		isShopMember,
		logger
	};
});

vi.mock('$lib/server/validation', () => ({
	repairSchema: {
		partial: vi.fn(() => ({}))
	}
}));

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			select: state.dbSelect
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
		verifyRepairAccess: state.verifyRepairAccess,
		isShopMember: state.isShopMember
	};
});

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

vi.mock('$lib/server/payments', () => ({
	listPayments: vi.fn()
}));

vi.mock('$lib/utils', () => ({
	generateId: vi.fn(() => 'part-1')
}));

vi.mock('$lib/server/storage', () => ({
	getFilePath: vi.fn(() => '/tmp/photo.jpg')
}));

describe('PUT /api/repairs/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		state.repair.status = 'estimate_approved';
		state.partsWhere.mockClear();
		state.partsFrom.mockClear();
		state.dbSelect.mockClear();
		state.txRun.mockClear();
		state.txValues.mockClear();
		state.txInsert.mockClear();
		state.txWhere.mockClear();
		state.txDelete.mockClear();
		state.txSet.mockClear();
		state.txUpdate.mockClear();
		state.requireAuth.mockClear();
		state.validateBody.mockReset();
		state.validateBody.mockResolvedValue(_ok({ status: 'completed' }));
		state.transaction.mockClear();
		state.verifyRepairAccess.mockClear();
		state.isShopMember.mockClear();
	});

	it('rejects out-of-order shop status changes', async () => {
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		const response = await PUT({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);

		const body = await response.json();
		expect(response.status).toBe(400);
		expect(body).toMatchObject({
			success: false,
			error: expect.stringContaining(
				'Invalid repair status transition from estimate_approved to completed.'
			)
		});
		expect(state.transaction).not.toHaveBeenCalled();
	});

	it('allows the next in-order shop status change', async () => {
		state.validateBody.mockResolvedValue(_ok({ status: 'in_progress' }));

		const { PUT } = await import('../routes/api/repairs/[id]/+server');
		const response = await PUT({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);
		const body = await response.json();

		expect(state.transaction).toHaveBeenCalledOnce();
		expect(state.txUpdate).toHaveBeenCalledOnce();
		expect(state.txSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'in_progress'
			})
		);
		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'repair-1',
				status: 'in_progress',
				parts: []
			}
		});
	});
});
