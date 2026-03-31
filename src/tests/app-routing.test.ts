import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

describe('/app/shop server guard', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('redirects customers to the cars page', async () => {
		const { load } = await import('../routes/app/shop/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1',
						role: 'customer'
					}
				}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/app/cars'
		});
	});

	it('allows mechanics through', async () => {
		const { load } = await import('../routes/app/shop/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1',
						role: 'mechanic'
					}
				}
			} as never)
		).resolves.toEqual({});
	});
});

describe('/app/cars/[id] server load', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('allows valid owned cars', async () => {
		const limit = vi.fn(async () => [{ id: 'car-1' }]);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		const select = vi.fn(() => ({ from }));

		vi.doMock('$lib/server/db', async () => {
			const schema =
				await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

			return {
				db: { select },
				schema
			};
		});

		const { load } = await import('../routes/app/cars/[id]/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1'
					}
				},
				params: { id: 'car-1' }
			} as never)
		).resolves.toEqual({});
	});

	it('throws 404 for missing cars', async () => {
		const limit = vi.fn(async () => []);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		const select = vi.fn(() => ({ from }));

		vi.doMock('$lib/server/db', async () => {
			const schema =
				await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

			return {
				db: { select },
				schema
			};
		});

		const { load } = await import('../routes/app/cars/[id]/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1'
					}
				},
				params: { id: 'car-404' }
			} as never)
		).rejects.toMatchObject({
			status: 404,
			body: {
				message: 'Car not found'
			}
		});
	});
});
