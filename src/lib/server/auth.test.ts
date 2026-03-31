import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	betterAuth: vi.fn((config: unknown) => ({
		config,
		$Infer: {
			Session: {}
		}
	})),
	drizzleAdapter: vi.fn(() => 'adapter')
}));

vi.mock('better-auth', () => ({
	betterAuth: state.betterAuth
}));

vi.mock('better-auth/adapters/drizzle', () => ({
	drizzleAdapter: state.drizzleAdapter
}));

vi.mock('./db', () => ({
	db: {}
}));

vi.mock('./db/schema', () => ({
	users: {},
	sessions: {},
	accounts: {},
	verifications: {}
}));

vi.mock('$lib/constants', () => ({
	SESSION_CONFIG: {
		EXPIRY_SECONDS: 60,
		UPDATE_AGE_SECONDS: 30,
		COOKIE_CACHE_SECONDS: 15
	},
	USER_ROLE: {
		CUSTOMER: 'customer'
	}
}));

describe('auth config', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		vi.unstubAllEnvs();
	});

	it('adds Google social auth when env vars are set', async () => {
		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');
		vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id');
		vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret');

		await import('./auth');

		const config = state.betterAuth.mock.calls[0]?.[0] as {
			baseURL: string;
			socialProviders?: {
				google?: {
					clientId: string;
					clientSecret: string;
				};
			};
			emailAndPassword: {
				enabled: boolean;
				requireEmailVerification: boolean;
			};
		};

		expect(config.baseURL).toBe('https://car-log.test');
		expect(config.socialProviders).toEqual({
			google: {
				clientId: 'google-client-id',
				clientSecret: 'google-client-secret'
			}
		});
		expect(config.emailAndPassword).toEqual({
			enabled: true,
			requireEmailVerification: false
		});
	});

	it('keeps Google social auth disabled when env vars are missing', async () => {
		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');

		await import('./auth');

		const config = state.betterAuth.mock.calls[0]?.[0] as {
			socialProviders?: unknown;
		};

		expect(config.socialProviders).toBeUndefined();
	});

	it('throws when BETTER_AUTH_SECRET is missing in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('BETTER_AUTH_SECRET', '');
		vi.stubEnv('BETTER_AUTH_URL', 'https://car-log.test');

		await expect(import('./auth')).rejects.toThrow('BETTER_AUTH_SECRET is required in production.');
	});

	it('throws when BETTER_AUTH_URL is not https in production', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		vi.stubEnv('BETTER_AUTH_SECRET', '12345678901234567890123456789012');
		vi.stubEnv('BETTER_AUTH_URL', 'http://car-log.test');

		await expect(import('./auth')).rejects.toThrow('BETTER_AUTH_URL must use https in production.');
	});
});
