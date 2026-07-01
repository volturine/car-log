import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok as _ok } from 'neverthrow';

type User = {
	id: string;
	role: string;
	name?: string;
};

type Tx = {
	insert: ReturnType<typeof vi.fn>;
	update: ReturnType<typeof vi.fn>;
};

const state = vi.hoisted(() => {
	const repair = {
		id: 'repair-1',
		userId: 'owner-1',
		shopId: null,
		amountPaid: 0,
		totalCost: 100,
		status: 'completed'
	};
	const repairLimit = vi.fn(async () => [repair]);
	const repairWhere = vi.fn(() => ({ limit: repairLimit }));
	const repairFrom = vi.fn(() => ({ where: repairWhere }));
	const dbSelect = vi.fn(() => ({ from: repairFrom }));
	const txRun = vi.fn();
	const txValues = vi.fn(() => ({ run: txRun }));
	const txInsert = vi.fn(() => ({ values: txValues }));
	const txWhere = vi.fn(() => ({ run: txRun }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const tx: Tx = { insert: txInsert, update: txUpdate };
	const requireAuth = vi.fn(() => _ok({ id: 'shop-1', role: 'shop_owner' } as User));
	const validateBody = vi.fn(async () => _ok({ amount: 25 }));
	const transaction = vi.fn((callback: (tx: Tx) => unknown) => callback(tx));
	const isShopMember = vi.fn(
		(user: { role?: string }) => user.role === 'shop_owner' || user.role === 'mechanic'
	);
	const verifyRepairAccess = vi.fn(async () => _ok(repair));
	const listPayments = vi.fn(async () => [
		{
			id: 'payment-1',
			repairId: 'repair-1',
			amount: 25,
			method: 'cash',
			notes: null,
			recordedBy: 'owner-1',
			paidAt: new Date('2026-03-31T10:00:00.000Z'),
			createdAt: new Date('2026-03-31T10:00:00.000Z')
		}
	]);
	const notify = vi.fn(async () => undefined);
	const logger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		repair,
		repairLimit,
		repairWhere,
		repairFrom,
		dbSelect,
		txRun,
		txValues,
		txInsert,
		txWhere,
		txSet,
		txUpdate,
		requireAuth,
		validateBody,
		transaction,
		isShopMember,
		verifyRepairAccess,
		listPayments,
		notify,
		logger
	};
});

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
		isShopMember: state.isShopMember,
		verifyRepairAccess: state.verifyRepairAccess
	};
});

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

vi.mock('$lib/server/notifications', () => ({
	notifyPaymentReceived: state.notify
}));

vi.mock('$lib/server/payments', () => ({
	listPayments: state.listPayments
}));

vi.mock('$lib/utils', () => ({
	generateId: vi.fn(() => 'payment-1')
}));

describe('/api/repairs/[id]/payment', () => {
	beforeEach(() => {
		vi.resetModules();
		state.repairLimit.mockClear();
		state.repairWhere.mockClear();
		state.repairFrom.mockClear();
		state.dbSelect.mockClear();
		state.txRun.mockClear();
		state.txValues.mockClear();
		state.txInsert.mockClear();
		state.txWhere.mockClear();
		state.txSet.mockClear();
		state.txUpdate.mockClear();
		state.requireAuth.mockReset();
		state.requireAuth.mockReturnValue(_ok({ id: 'shop-1', role: 'shop_owner' } as User));
		state.validateBody.mockReset();
		state.validateBody.mockResolvedValue(_ok({ amount: 25 }));
		state.transaction.mockClear();
		state.isShopMember.mockClear();
		state.verifyRepairAccess.mockClear();
		state.listPayments.mockClear();
		state.notify.mockClear();
		state.logger.info.mockClear();
	});

	it('rejects shop users for shopless repairs they do not own', async () => {
		const { POST } = await import('../routes/api/repairs/[id]/payment/+server');

		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/payment', {
				method: 'POST'
			}),
			locals: { user: { id: 'shop-1', role: 'shop_owner' } }
		} as never);

		const body = await response.json();
		expect(response.status).toBe(403);
		expect(body).toMatchObject({
			success: false,
			error: 'You do not have permission to record payments for this repair'
		});

		expect(state.transaction).not.toHaveBeenCalled();
		expect(state.notify).not.toHaveBeenCalled();
	});

	it('allows admins to record payments on shopless repairs and persists a ledger row', async () => {
		state.requireAuth.mockReturnValue(_ok({ id: 'admin-1', role: 'admin', name: 'Admin' } as User));

		const { POST } = await import('../routes/api/repairs/[id]/payment/+server');
		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/payment', {
				method: 'POST'
			}),
			locals: { user: { id: 'admin-1', role: 'admin' } }
		} as never);
		const body = await response.json();

		expect(state.transaction).toHaveBeenCalledOnce();
		expect(state.txInsert).toHaveBeenCalledOnce();
		expect(state.txValues).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'payment-1',
				repairId: 'repair-1',
				amount: 25,
				method: 'cash',
				recordedBy: 'admin-1'
			})
		);
		expect(state.txUpdate).toHaveBeenCalledOnce();
		expect(body).toMatchObject({
			success: true,
			data: {
				amountPaid: 25,
				paymentStatus: 'partial',
				payment: {
					id: 'payment-1',
					amount: 25,
					method: 'cash'
				}
			}
		});
	});

	it('rejects payments before a repair is completed', async () => {
		state.repair.status = 'in_progress';
		state.requireAuth.mockReturnValue(_ok({ id: 'admin-1', role: 'admin', name: 'Admin' } as User));

		const { POST } = await import('../routes/api/repairs/[id]/payment/+server');

		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/payment', {
				method: 'POST'
			}),
			locals: { user: { id: 'admin-1', role: 'admin' } }
		} as never);

		const body = await response.json();
		expect(response.status).toBe(400);
		expect(body).toMatchObject({
			success: false,
			error: 'Payments can only be recorded for completed repairs'
		});

		expect(state.transaction).not.toHaveBeenCalled();
	});

	it('marks completed repairs as paid when the last payment clears the balance', async () => {
		state.repair.status = 'completed';
		state.repair.amountPaid = 25;
		state.repair.totalCost = 100;
		state.requireAuth.mockReturnValue(_ok({ id: 'admin-1', role: 'admin', name: 'Admin' } as User));
		state.validateBody.mockResolvedValue(_ok({ amount: 75 }));

		const { POST } = await import('../routes/api/repairs/[id]/payment/+server');
		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/payment', {
				method: 'POST'
			}),
			locals: { user: { id: 'admin-1', role: 'admin' } }
		} as never);
		const body = await response.json();

		expect(body).toMatchObject({
			success: true,
			data: {
				amountPaid: 100,
				paymentStatus: 'paid',
				status: 'paid'
			}
		});
	});

	it('returns payment history for authorized users', async () => {
		state.requireAuth.mockReturnValue(
			_ok({ id: 'owner-1', role: 'customer', name: 'Owner' } as User)
		);

		const { GET } = await import('../routes/api/repairs/[id]/payment/+server');
		const response = await GET({
			params: { id: 'repair-1' },
			locals: { user: { id: 'owner-1', role: 'customer' } }
		} as never);
		const body = await response.json();

		expect(state.verifyRepairAccess).toHaveBeenCalledWith(
			'repair-1',
			expect.objectContaining({ id: 'owner-1' })
		);
		expect(state.listPayments).toHaveBeenCalledWith('repair-1');
		expect(body).toMatchObject({
			success: true,
			data: [
				{
					id: 'payment-1',
					repairId: 'repair-1',
					amount: 25,
					method: 'cash'
				}
			]
		});
	});
});
