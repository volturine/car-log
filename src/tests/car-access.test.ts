import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapDatabase } from '$lib/server/db/bootstrap';
import * as schema from '$lib/server/db/schema';

const state = vi.hoisted(() => ({
	shop: 'current-shop',
	user: { id: 'mechanic', role: 'mechanic' }
}));

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: () => state.user,
	isShopMember: () => true,
	findUserShop: async () => ({ id: state.shop }),
	verifyOwnership: async () => {
		const { error } = await import('@sveltejs/kit');
		throw error(404, 'Car not found');
	},
	successResponse: (data: unknown) => ({ success: true, data })
}));

describe('car access after changing shops', () => {
	const sqlite = new Database(':memory:');
	const db = drizzle(sqlite, { schema });
	afterAll(() => sqlite.close());

	beforeEach(() => {
		vi.resetModules();
		bootstrapDatabase(sqlite);
		db.insert(schema.users)
			.values([
				{ id: 'customer', email: 'customer@example.test' },
				{ ...state.user, email: 'mechanic@example.test' }
			])
			.run();
		db.insert(schema.shops)
			.values([
				{ id: 'former-shop', name: 'Former shop', ownerId: 'customer' },
				{ id: state.shop, name: 'Current shop', ownerId: 'customer' }
			])
			.run();
		db.insert(schema.cars)
			.values([
				{ id: 'former-car', userId: 'customer', brand: 'Car', model: 'A', year: 2020 },
				{ id: 'current-car', userId: 'customer', brand: 'Car', model: 'B', year: 2020 }
			])
			.run();
		db.insert(schema.repairs)
			.values([
				{
					id: 'former-repair',
					carId: 'former-car',
					userId: 'customer',
					shopId: 'former-shop',
					assignedMechanicId: state.user.id,
					title: 'Old assignment'
				},
				{
					id: 'current-repair',
					carId: 'current-car',
					userId: 'customer',
					shopId: state.shop,
					title: 'Current repair'
				}
			])
			.run();
		vi.doMock('$lib/server/db', () => ({ db, schema }));
	});

	afterEach(() => {
		db.delete(schema.repairs).run();
		db.delete(schema.cars).run();
		db.delete(schema.shops).run();
		db.delete(schema.users).run();
	});

	for (const route of ['API', 'page'] as const) {
		it(`${route} rejects an old mechanic assignment at a former shop`, async () => {
			const handler =
				route === 'API'
					? (await import('../routes/api/cars/[id]/+server')).GET
					: (await import('../routes/app/cars/[id]/+page.server')).load;

			await expect(
				handler({ params: { id: 'former-car' }, locals: { user: state.user } } as never)
			).rejects.toMatchObject({ status: 404 });
		});

		it(`${route} allows a car with a repair at the current shop`, async () => {
			const event = { params: { id: 'current-car' }, locals: { user: state.user } };
			if (route === 'page') {
				const { load } = await import('../routes/app/cars/[id]/+page.server');
				await expect(load(event as never)).resolves.toEqual({});
				return;
			}

			const { GET } = await import('../routes/api/cars/[id]/+server');
			const response = await GET(event as never);
			expect(await response.json()).toMatchObject({ data: { id: 'current-car' } });
		});
	}
});
