import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	results: [] as unknown[][],
	select: vi.fn()
}));

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return { db: { select: state.select }, schema };
});

vi.mock('$platform', () => ({
	platform: { batch: vi.fn(async () => undefined) }
}));

describe('findUserShop', () => {
	beforeEach(() => {
		vi.resetModules();
		state.results.length = 0;
		state.select.mockImplementation(() => {
			const limit = vi.fn(async () => state.results.shift() ?? []);
			const where = vi.fn(() => ({ limit }));
			return { from: vi.fn(() => ({ where })) };
		});
	});

	it('uses the hinted shop only while the user still belongs to it', async () => {
		state.results.push([{ id: 'shop-hint', ownerId: 'another-owner' }], [{ shopId: 'shop-hint' }]);
		const { findUserShop } = await import('../lib/server/api-utils');
		const user = {
			id: 'mechanic-1',
			role: 'mechanic',
			shopId: 'shop-hint'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];

		await expect(findUserShop(user)).resolves.toMatchObject({ id: 'shop-hint' });
	});

	it('skips a revoked hinted shop and falls back to a current membership', async () => {
		state.results.push(
			[{ id: 'shop-revoked', ownerId: 'another-owner' }],
			[],
			[{ shopId: 'shop-current' }],
			[{ id: 'shop-current', ownerId: 'current-owner' }]
		);
		const { findUserShop } = await import('../lib/server/api-utils');
		const user = {
			id: 'mechanic-1',
			role: 'mechanic',
			shopId: 'shop-revoked'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];

		await expect(findUserShop(user)).resolves.toMatchObject({ id: 'shop-current' });
	});

	it('returns null when neither the hint nor another membership is current', async () => {
		state.results.push([{ id: 'shop-revoked', ownerId: 'another-owner' }], [], []);
		const { findUserShop } = await import('../lib/server/api-utils');
		const user = {
			id: 'mechanic-1',
			role: 'mechanic',
			shopId: 'shop-revoked'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];

		await expect(findUserShop(user)).resolves.toBeNull();
	});

	it('falls back to current ownership after checking memberships', async () => {
		state.results.push(
			[{ id: 'shop-revoked', ownerId: 'another-owner' }],
			[],
			[],
			[{ id: 'shop-owned', ownerId: 'owner-1' }]
		);
		const { findUserShop } = await import('../lib/server/api-utils');
		const user = {
			id: 'owner-1',
			role: 'shop_owner',
			shopId: 'shop-revoked'
		} as Parameters<typeof import('../lib/server/api-utils').findUserShop>[0];

		await expect(findUserShop(user)).resolves.toMatchObject({ id: 'shop-owned' });
	});
});
