import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from 'neverthrow';

const state = vi.hoisted(() => {
	const where = vi.fn(async () => undefined);
	const set = vi.fn(() => ({ where }));
	const update = vi.fn(() => ({ set }));
	const requireAuth = vi.fn(() => ok({ id: 'user-1', role: 'customer' } as never));
	const getSession = vi.fn(async () => ({
		headers: new Headers({
			'set-cookie': 'better-auth.session_data=next; Path=/; HttpOnly'
		})
	}));
	const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

	return {
		where,
		set,
		update,
		requireAuth,
		getSession,
		logger
	};
});

vi.mock('$lib/server/db', async () => {
	const schema =
		await vi.importActual<typeof import('$lib/server/db/schema')>('$lib/server/db/schema');

	return {
		schema,
		db: {
			update: state.update
		}
	};
});

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: state.requireAuth
}));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			getSession: state.getSession
		}
	}
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: {
		child: vi.fn(() => state.logger)
	}
}));

describe('POST /api/users/become-shop-owner', () => {
	beforeEach(() => {
		vi.resetModules();
		state.update.mockClear();
		state.set.mockClear();
		state.where.mockClear();
		state.requireAuth.mockReset();
		state.requireAuth.mockReturnValue(ok({ id: 'user-1', role: 'customer' } as never));
		state.getSession.mockClear();
		state.logger.info.mockClear();
	});

	it('upgrades authenticated customers to shop owners', async () => {
		const { POST } = await import('../routes/api/users/become-shop-owner/+server');
		const response = await POST({
			locals: { user: { id: 'user-1', role: 'customer' } },
			request: new Request('http://test.local/api/users/become-shop-owner', {
				method: 'POST',
				headers: {
					cookie: 'better-auth.session_token=test'
				}
			})
		} as never);
		const body = await response.json();

		expect(state.update).toHaveBeenCalledWith(expect.anything());
		expect(state.set).toHaveBeenCalledWith({ role: 'shop_owner', updatedAt: expect.any(Date) });
		expect(state.where).toHaveBeenCalledWith(expect.anything());
		expect(state.getSession).toHaveBeenCalledWith({
			headers: expect.any(Headers),
			query: {
				disableCookieCache: true
			},
			returnHeaders: true
		});
		expect(response.headers.get('set-cookie')).toContain('better-auth.session_data=next');
		expect(body).toEqual({
			success: true,
			data: {
				role: 'shop_owner'
			}
		});
	});

	it('rejects non-customer users', async () => {
		state.requireAuth.mockReturnValue(ok({ id: 'owner-1', role: 'shop_owner' } as never));

		const { POST } = await import('../routes/api/users/become-shop-owner/+server');

		const response = await POST({
			locals: { user: { id: 'owner-1', role: 'shop_owner' } },
			request: new Request('http://test.local/api/users/become-shop-owner', {
				method: 'POST'
			})
		} as never);

		const body = await response.json();
		expect(response.status).toBe(403);
		expect(body).toEqual({
			success: false,
			error: 'Only customers can become shop owners'
		});
		expect(state.update).not.toHaveBeenCalled();
		expect(state.getSession).not.toHaveBeenCalled();
	});
});
