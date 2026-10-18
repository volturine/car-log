import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const order: string[] = [];
	const txWhere = vi.fn(() => ({ kind: 'update' }));
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
	const writeBatch = vi.fn(async () => {
		order.push('batch');
	});

	return {
		order,
		writeBatch,
		txUpdate,
		txSet,
		txWhere,
		dbSelect,
		shopFrom,
		shopWhere,
		shopLimit,
		notify,
		logger
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
			select: state.dbSelect,
			update: state.txUpdate
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
	writeBatch: state.writeBatch
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
		state.writeBatch.mockClear();
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

	it('writes the rejection atomically before notifying the shop', async () => {
		const { POST } = await import('../routes/api/repairs/[id]/reject/+server');
		const response = await POST({
			params: { id: 'repair-1' },
			request: new Request('http://test.local/api/repairs/repair-1/reject', { method: 'POST' }),
			locals: { user: { id: 'user-1' } }
		} as never);

		const body = await response.json();

		expect(state.writeBatch).toHaveBeenCalledWith([{ kind: 'update' }]);
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
		expect(state.order).toEqual(['batch', 'shop', 'notify']);
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
