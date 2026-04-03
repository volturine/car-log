import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => {
	const where = vi.fn(async () => undefined);
	const set = vi.fn(() => ({ where }));
	const update = vi.fn(() => ({ set }));
	const requireAuth = vi.fn(() => ({ id: 'user-1', role: 'customer' }));
	const successResponse = vi.fn((data: unknown, status = 200) => ({ success: true, data, status }));
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
		successResponse,
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
	requireAuth: state.requireAuth,
	successResponse: state.successResponse
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
		state.requireAuth.mockReturnValue({ id: 'user-1', role: 'customer' });
		state.successResponse.mockClear();
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
			},
			status: 200
		});
	});

	it('rejects non-customer users', async () => {
		state.requireAuth.mockReturnValue({ id: 'owner-1', role: 'shop_owner' });

		const { POST } = await import('../routes/api/users/become-shop-owner/+server');

		await expect(
			POST({
				locals: { user: { id: 'owner-1', role: 'shop_owner' } },
				request: new Request('http://test.local/api/users/become-shop-owner', {
					method: 'POST'
				})
			} as never)
		).rejects.toMatchObject({
			status: 403,
			body: {
				message: 'Only customers can become shop owners'
			}
		});

		expect(state.update).not.toHaveBeenCalled();
		expect(state.getSession).not.toHaveBeenCalled();
	});
});
