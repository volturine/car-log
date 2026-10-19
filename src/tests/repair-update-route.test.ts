import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const repair = {
		id: 'repair-1',
		carId: 'car-1',
		userId: 'owner-1',
		shopId: 'shop-1' as string | null,
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
	const txValues = vi.fn(() => ({ kind: 'insert' }));
	const txInsert = vi.fn(() => ({ values: txValues }));
	const txWhere = vi.fn(() => ({ kind: 'write' }));
	const txDelete = vi.fn(() => ({ where: txWhere }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const requireAuth = vi.fn(() => ({ id: 'shop-1', role: 'shop_owner' }));
	const validateBody = vi.fn(async (): Promise<Record<string, unknown>> => ({
		status: 'completed'
	}));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const writeBatch = vi.fn(async () => undefined);
	const verifyRepairAccess = vi.fn(async () => repair);
	const verifyShopAccess = vi.fn(async () => ({ id: 'shop-1' }));
	const verifyAssignedMechanic = vi.fn(async () => undefined);
	const isShopMember = vi.fn(() => true);
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		repair,
		partsWhere,
		partsFrom,
		dbSelect,
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
		verifyRepairAccess,
		verifyShopAccess,
		verifyAssignedMechanic,
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
			select: state.dbSelect,
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
	fetchById: vi.fn(),
	formatPhotosForResponse: vi.fn(),
	verifyRepairAccess: state.verifyRepairAccess,
	isShopMember: state.isShopMember,
	verifyShopAccess: state.verifyShopAccess
}));

vi.mock('$lib/server/repair-access', () => ({
	verifyAssignedMechanic: state.verifyAssignedMechanic
}));

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
	deleteFile: vi.fn(async () => undefined)
}));

describe('PUT /api/repairs/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		state.repair.carId = 'car-1';
		state.repair.userId = 'owner-1';
		state.repair.shopId = 'shop-1';
		state.repair.status = 'estimate_approved';
		state.partsWhere.mockClear();
		state.partsFrom.mockClear();
		state.dbSelect.mockClear();
		state.txValues.mockClear();
		state.txInsert.mockClear();
		state.txWhere.mockClear();
		state.txDelete.mockClear();
		state.txSet.mockClear();
		state.txUpdate.mockClear();
		state.requireAuth.mockClear();
		state.validateBody.mockReset();
		state.validateBody.mockResolvedValue({ status: 'completed' });
		state.successResponse.mockClear();
		state.writeBatch.mockClear();
		state.verifyRepairAccess.mockClear();
		state.verifyShopAccess.mockReset();
		state.verifyShopAccess.mockResolvedValue({ id: 'shop-1' });
		state.verifyAssignedMechanic.mockReset();
		state.verifyAssignedMechanic.mockResolvedValue(undefined);
		state.isShopMember.mockClear();
	});

	it('rejects out-of-order shop status changes', async () => {
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await expect(
			PUT({
				params: { id: 'repair-1' },
				request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
				locals: { user: { id: 'shop-1', role: 'shop_owner' } }
			} as never)
		).rejects.toMatchObject({
			status: 400,
			body: {
				message:
					'Invalid repair status transition from estimate_approved to completed. Allowed next statuses: in_progress.'
			}
		});

		expect(state.writeBatch).not.toHaveBeenCalled();
		expect(state.verifyShopAccess).toHaveBeenCalledWith('shop-1', 'shop-1', 'shop_owner');
	});

	it('allows the next in-order shop status change', async () => {
		state.validateBody.mockResolvedValue({ status: 'in_progress' });

		const { PUT } = await import('../routes/api/repairs/[id]/+server');
		const response = await PUT({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);
		const body = await response.json();

		expect(state.writeBatch).toHaveBeenCalledOnce();
		expect(state.writeBatch).toHaveBeenCalledWith([{ kind: 'write' }]);
		expect(state.txUpdate).toHaveBeenCalledOnce();
		expect(state.txSet).toHaveBeenCalledWith({
			status: 'in_progress',
			updatedAt: expect.any(Date)
		});
		expect(body).toMatchObject({
			success: true,
			data: {
				id: 'repair-1',
				status: 'in_progress',
				parts: []
			}
		});
	});

	it.each([
		['car', { carId: 'car-2' }],
		['shop', { shopId: 'shop-2' }]
	])('rejects changing the repair %s', async (_target, update) => {
		state.validateBody.mockResolvedValue(update);
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await expect(
			PUT({
				params: { id: 'repair-1' },
				request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
				locals: { user: { id: 'shop-1', role: 'shop_owner' } }
			} as never)
		).rejects.toMatchObject({
			status: 400,
			body: { message: 'Repair car and shop cannot be changed' }
		});

		expect(state.writeBatch).not.toHaveBeenCalled();
		expect(state.verifyShopAccess).not.toHaveBeenCalled();
	});

	it('requires actual access to the repair shop for shop-role owners of a repair', async () => {
		state.repair.userId = 'shop-1';
		state.repair.shopId = 'another-shop';
		state.verifyShopAccess.mockRejectedValue({ status: 403 });
		state.validateBody.mockResolvedValue({ title: 'Changed title' });
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await expect(
			PUT({
				params: { id: 'repair-1' },
				request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
				locals: { user: { id: 'shop-1', role: 'shop_owner' } }
			} as never)
		).rejects.toMatchObject({ status: 403 });

		expect(state.verifyShopAccess).toHaveBeenCalledWith('another-shop', 'shop-1', 'shop_owner');
		expect(state.writeBatch).not.toHaveBeenCalled();
	});

	it('keeps a shop-role owner limited to title and description on a personal repair', async () => {
		state.repair.shopId = null;
		state.validateBody.mockResolvedValue({
			title: 'Personal repair',
			description: null,
			status: 'completed',
			assignedMechanicId: 'mechanic-1'
		});
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await PUT({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);

		expect(state.verifyShopAccess).not.toHaveBeenCalled();
		expect(state.verifyAssignedMechanic).not.toHaveBeenCalled();
		expect(state.txSet).toHaveBeenCalledWith({
			title: 'Personal repair',
			description: null,
			updatedAt: expect.any(Date)
		});
	});

	it('rejects assigning a mechanic outside the repair shop', async () => {
		state.validateBody.mockResolvedValue({ assignedMechanicId: 'mechanic-2' });
		state.verifyAssignedMechanic.mockRejectedValue({ status: 400 });
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await expect(
			PUT({
				params: { id: 'repair-1' },
				request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
				locals: { user: { id: 'shop-1', role: 'shop_owner' } }
			} as never)
		).rejects.toMatchObject({ status: 400 });

		expect(state.verifyAssignedMechanic).toHaveBeenCalledWith('shop-1', 'mechanic-2');
		expect(state.writeBatch).not.toHaveBeenCalled();
	});

	it('allows a mechanic who belongs to the repair shop to be assigned', async () => {
		state.validateBody.mockResolvedValue({ assignedMechanicId: 'mechanic-1' });
		const { PUT } = await import('../routes/api/repairs/[id]/+server');

		await PUT({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1', { method: 'PUT' }),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);

		expect(state.verifyAssignedMechanic).toHaveBeenCalledWith('shop-1', 'mechanic-1');
		expect(state.txSet).toHaveBeenCalledWith({
			assignedMechanicId: 'mechanic-1',
			updatedAt: expect.any(Date)
		});
	});
});
