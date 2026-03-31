import { beforeEach, describe, expect, it, vi } from 'vitest';

type User = {
	id: string;
	role: string;
	name?: string;
};

type Tx = {
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
	const txWhere = vi.fn(() => ({ run: txRun }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const tx: Tx = { update: txUpdate };
	const requireAuth = vi.fn<() => User>(() => ({ id: 'shop-1', role: 'shop_owner' }));
	const validateBody = vi.fn(async () => ({ amount: 25 }));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const transaction = vi.fn((callback: (tx: Tx) => unknown) => callback(tx));
	const isShopMember = vi.fn(
		(user: { role?: string }) => user.role === 'shop_owner' || user.role === 'mechanic'
	);
	const notify = vi.fn(async () => undefined);
	const logger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		repair,
		repairLimit,
		repairWhere,
		repairFrom,
		dbSelect,
		txRun,
		txWhere,
		txSet,
		txUpdate,
		requireAuth,
		validateBody,
		successResponse,
		transaction,
		isShopMember,
		notify,
		logger
	};
});

vi.mock('zod', () => ({
	z: {
		object: vi.fn(() => ({})),
		number: vi.fn(() => ({ min: vi.fn(() => ({})) })),
		string: vi.fn(() => ({ optional: vi.fn(() => ({})) }))
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

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	validateBody: state.validateBody,
	successResponse: state.successResponse,
	transaction: state.transaction,
	isShopMember: state.isShopMember
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

vi.mock('$lib/server/notifications', () => ({
	notifyPaymentReceived: state.notify
}));

describe('POST /api/repairs/[id]/payment', () => {
	beforeEach(() => {
		vi.resetModules();
		state.repairLimit.mockClear();
		state.repairWhere.mockClear();
		state.repairFrom.mockClear();
		state.dbSelect.mockClear();
		state.txRun.mockClear();
		state.txWhere.mockClear();
		state.txSet.mockClear();
		state.txUpdate.mockClear();
		state.requireAuth.mockReset();
		state.requireAuth.mockReturnValue({ id: 'shop-1', role: 'shop_owner' });
		state.validateBody.mockReset();
		state.validateBody.mockResolvedValue({ amount: 25 });
		state.successResponse.mockClear();
		state.transaction.mockClear();
		state.isShopMember.mockClear();
		state.notify.mockClear();
		state.logger.info.mockClear();
	});

	it('rejects shop users for shopless repairs they do not own', async () => {
		const { POST } = await import('../routes/api/repairs/[id]/payment/+server');

		await expect(
			POST({
				params: { id: 'repair-1' },
				request: new Request('http://test.local/api/repairs/repair-1/payment', {
					method: 'POST'
				}),
				locals: { user: { id: 'shop-1', role: 'shop_owner' } }
			} as never)
		).rejects.toMatchObject({
			status: 403,
			body: { message: 'You do not have permission to record payments for this repair' }
		});

		expect(state.transaction).not.toHaveBeenCalled();
		expect(state.notify).not.toHaveBeenCalled();
	});

	it('allows admins to record payments on shopless repairs', async () => {
		state.requireAuth.mockReturnValue({ id: 'admin-1', role: 'admin', name: 'Admin' });

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
		expect(state.txUpdate).toHaveBeenCalledOnce();
		expect(body).toMatchObject({
			success: true,
			data: {
				amountPaid: 25,
				paymentStatus: 'partial'
			}
		});
	});
});
