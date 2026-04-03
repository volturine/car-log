import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const order: string[] = [];
	const txWhere = vi.fn(() => ({ run: vi.fn(() => order.push('run')) }));
	const txSet = vi.fn(() => ({ where: txWhere }));
	const txUpdate = vi.fn(() => ({ set: txSet }));
	const shopLimit = vi.fn(async () => {
		order.push('shop');
		return [{ ownerId: 'owner-1' }];
	});
	const shopWhere = vi.fn(() => ({ limit: shopLimit }));
	const shopFrom = vi.fn(() => ({ where: shopWhere }));
	const dbSelect = vi.fn(() => ({ from: shopFrom }));
	const notify = vi.fn(async () => {
		order.push('notify');
	});
	const logger = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
	const transactionResult = { value: undefined as unknown };
	const tx = { update: txUpdate };

	return {
		order,
		tx,
		txUpdate,
		txSet,
		txWhere,
		dbSelect,
		shopFrom,
		shopWhere,
		shopLimit,
		notify,
		logger,
		transactionResult
	};
});

vi.mock('zod', () => ({
	z: {
		object: vi.fn(() => ({})),
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
	requireAuth: vi.fn(() => ({ id: 'user-1', name: 'Casey', role: 'customer' })),
	verifyOwnership: vi.fn(async () => ({
		id: 'repair-1',
		userId: 'user-1',
		shopId: 'shop-1',
		status: 'estimate_pending'
	})),
	validateBody: vi.fn(async () => ({ reason: 'Too expensive' })),
	successResponse: vi.fn((data: unknown, status = 200) => ({ success: true, data, status })),
	transaction: vi.fn((callback: (tx: typeof state.tx) => unknown) => {
		state.order.push('transaction');
		const result = callback(state.tx);
		state.transactionResult.value = result;
		state.order.push('transaction:done');
		return result;
	})
}));

vi.mock('$lib/server/notifications', () => ({
	notifyEstimateRejected: state.notify
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('POST /api/repairs/[id]/reject', () => {
	beforeEach(() => {
		state.order.length = 0;
		state.transactionResult.value = undefined;
		state.txUpdate.mockClear();
		state.txSet.mockClear();
		state.txWhere.mockClear();
		state.dbSelect.mockClear();
		state.shopFrom.mockClear();
		state.shopWhere.mockClear();
		state.shopLimit.mockClear();
		state.notify.mockClear();
		state.logger.info.mockClear();
	});

	it('keeps the transaction callback synchronous and notifies after commit', async () => {
		const { POST } = await import('../routes/api/repairs/[id]/reject/+server');
		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/reject', { method: 'POST' }),
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await response.json();

		expect(state.transactionResult.value).not.toBeInstanceOf(Promise);
		expect(state.txUpdate).toHaveBeenCalledOnce();
		expect(state.txWhere).toHaveBeenCalledOnce();
		expect(state.txSet).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'estimate_rejected',
				approvedAt: null,
				customerApproved: false,
				estimateNotes: 'Rejected: Too expensive'
			})
		);
		expect(state.notify).toHaveBeenCalledWith('owner-1', 'repair-1', 'Casey');
		expect(state.order).toEqual(['transaction', 'run', 'transaction:done', 'shop', 'notify']);
		expect(body).toMatchObject({
			success: true,
			data: {
				status: 'estimate_rejected',
				customerApproved: false,
				estimateNotes: 'Rejected: Too expensive'
			}
		});
	});
});
