import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

const state = vi.hoisted(() => ({
	findUserShop: vi.fn<(...args: unknown[]) => Promise<{ id: string; name?: string } | null>>(
		async () => null
	)
}));

vi.mock('$lib/server/api-utils', () => ({
	findUserShop: state.findUserShop,
	isShopMember: (user: { role?: string }) => user.role === 'shop_owner' || user.role === 'mechanic'
}));

describe('/app/shop server guard', () => {
	beforeEach(() => {
		vi.resetModules();
		state.findUserShop.mockReset();
		state.findUserShop.mockResolvedValue(null);
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
		state.findUserShop.mockResolvedValue({ id: 'shop-1', name: 'Shop' });

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
		).resolves.toEqual({
			shop: { id: 'shop-1', name: 'Shop' },
			isOwner: false
		});
	});

	it('redirects shop users without a shop to setup', async () => {
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
		).rejects.toMatchObject({
			status: 302,
			location: '/app/shop/setup'
		});
	});

	it('redirects /app to setup for shop users without a shop', async () => {
		const { load } = await import('../routes/app/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1',
						role: 'shop_owner'
					}
				}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/app/shop/setup'
		});
	});

	it('redirects shop users with a shop away from setup', async () => {
		state.findUserShop.mockResolvedValue({ id: 'shop-1' });

		const { load } = await import('../routes/app/shop/setup/+page.server');

		await expect(
			load({
				locals: {
					user: {
						id: 'user-1',
						role: 'mechanic'
					}
				}
			} as never)
		).rejects.toMatchObject({
			status: 302,
			location: '/app/shop'
		});
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
		state.findUserShop.mockResolvedValue(null);

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
		state.findUserShop.mockResolvedValue(null);

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

	it('allows shop users to open cars tied to their shop repairs', async () => {
		state.findUserShop.mockResolvedValue({ id: 'shop-1' });

		const limit = vi.fn(async () => [{ id: 'car-1' }]);
		const where = vi.fn(() => ({ limit }));
		const leftJoin = vi.fn(() => ({ where }));
		const from = vi.fn(() => ({ leftJoin }));
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
						id: 'mech-1',
						role: 'mechanic'
					}
				},
				params: { id: 'car-1' }
			} as never)
		).resolves.toEqual({});
	});
});
