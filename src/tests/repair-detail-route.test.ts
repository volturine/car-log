import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const repair = {
		id: 'repair-1',
		carId: 'car-1',
		userId: 'owner-1',
		shopId: 'shop-1',
		assignedMechanicId: 'mechanic-1',
		title: 'Brake service',
		description: 'Pads and rotors',
		status: 'completed',
		amountPaid: 25,
		paymentStatus: 'partial',
		totalCost: 100,
		laborCost: 40,
		laborHours: 2,
		startDate: new Date('2026-03-31T08:00:00.000Z'),
		completedDate: new Date('2026-03-31T12:00:00.000Z'),
		createdAt: new Date('2026-03-31T08:00:00.000Z'),
		updatedAt: new Date('2026-03-31T12:00:00.000Z')
	};
	const parts = [
		{
			id: 'part-1',
			repairId: 'repair-1',
			name: 'Brake pads',
			description: null,
			quantity: 1,
			unitCost: 30,
			totalCost: 30,
			sourceUrl: null,
			createdAt: new Date('2026-03-31T08:00:00.000Z')
		}
	];
	const photos = [{ id: 'photo-1' }];
	const payments = [
		{
			id: 'payment-1',
			repairId: 'repair-1',
			amount: 25,
			method: 'cash',
			notes: 'Deposit',
			recordedBy: 'owner-1',
			paidAt: new Date('2026-03-31T10:00:00.000Z'),
			createdAt: new Date('2026-03-31T10:00:00.000Z')
		}
	];
	const mechanic = { id: 'mechanic-1', name: 'Pat', email: 'pat@example.com' };
	let plainSelects = 0;
	const dbSelect = vi.fn((fields?: unknown) => ({
		from: vi.fn((table) => {
			if (table.id?.name === 'id' && fields) {
				return {
					where: vi.fn(() => ({
						limit: vi.fn(async () => [mechanic])
					}))
				};
			}

			plainSelects += 1;

			if (plainSelects === 1) {
				return { where: vi.fn(async () => parts) };
			}

			if (plainSelects === 2) {
				return { where: vi.fn(async () => photos) };
			}

			throw new Error(`Unexpected select call: ${plainSelects}`);
		})
	}));
	const requireAuth = vi.fn(() => ({ id: 'owner-1', role: 'customer' }));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
	const fetchById = vi.fn(async (table: { name: string }) => {
		if (table.name === 'shops') {
			return { id: 'shop-1', name: 'Main Street Garage' };
		}

		if (table.name === 'cars') {
			return { id: 'car-1', brand: 'Toyota', model: 'Camry' };
		}

		return null;
	});
	const formatPhotosForResponse = vi.fn((rows: Array<{ id: string }>) =>
		rows.map((row) => ({ id: row.id, url: `/api/photos/${row.id}` }))
	);
	const verifyRepairAccess = vi.fn(async () => repair);
	const getMechanic = vi.fn(async () => mechanic);
	const getMechanicsByIds = vi.fn(async () => [mechanic]);
	const listPayments = vi.fn(async () => payments);
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		reset: () => {
			plainSelects = 0;
		},
		dbSelect,
		requireAuth,
		successResponse,
		fetchById,
		formatPhotosForResponse,
		verifyRepairAccess,
		getMechanic,
		getMechanicsByIds,
		listPayments,
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

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth,
	successResponse: state.successResponse,
	fetchById: state.fetchById,
	formatPhotosForResponse: state.formatPhotosForResponse,
	verifyRepairAccess: state.verifyRepairAccess,
	getMechanic: state.getMechanic,
	getMechanicsByIds: state.getMechanicsByIds,
	validateBody: vi.fn(),
	transaction: vi.fn(),
	isShopMember: vi.fn()
}));

vi.mock('$lib/server/payments', () => ({
	listPayments: state.listPayments
}));

vi.mock('$lib/server/validation', () => ({
	repairSchema: {
		partial: vi.fn(() => ({}))
	}
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

vi.mock('$lib/utils', () => ({
	generateId: vi.fn(() => 'repair-1')
}));

describe('GET /api/repairs/[id]', () => {
	beforeEach(() => {
		vi.resetModules();
		state.reset();
		state.dbSelect.mockClear();
		state.requireAuth.mockClear();
		state.successResponse.mockClear();
		state.fetchById.mockClear();
		state.formatPhotosForResponse.mockClear();
		state.verifyRepairAccess.mockClear();
		state.listPayments.mockClear();
	});

	it('includes payment history in the repair detail response', async () => {
		const { GET } = await import('../routes/api/repairs/[id]/+server');
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
			data: {
				id: 'repair-1',
				payments: [
					{
						id: 'payment-1',
						amount: 25,
						method: 'cash',
						notes: 'Deposit'
					}
				]
			}
		});
	});
});
