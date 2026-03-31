import { SESSION_CONFIG, USER_ROLE } from '$lib/constants';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

const devUrl = 'http://localhost:3000';
const devSecret = 'default-secret-change-this-in-production-min-32-characters-long';
const prod = process.env.NODE_ENV === 'production';

function getUrl(): string {
	const url = process.env.BETTER_AUTH_URL;

	if (!url) {
		if (prod) {
			throw new Error('BETTER_AUTH_URL is required in production.');
		}

		return devUrl;
	}

	if (!URL.canParse(url)) {
		if (prod) {
			throw new Error('BETTER_AUTH_URL must be a valid absolute URL in production.');
		}

		return devUrl;
	}

	if (prod && new URL(url).protocol !== 'https:') {
		throw new Error('BETTER_AUTH_URL must use https in production.');
	}

	return url;
}

function getSecret(): string {
	const secret = process.env.BETTER_AUTH_SECRET;

	if (!secret) {
		if (prod) {
			throw new Error('BETTER_AUTH_SECRET is required in production.');
		}

		return devSecret;
	}

	if (prod && secret.length < 32) {
		throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long in production.');
	}

	return secret;
}

function getSocial() {
	const id = process.env.GOOGLE_CLIENT_ID;
	const secret = process.env.GOOGLE_CLIENT_SECRET;

	if (!id || !secret) {
		return undefined;
	}

	return {
		google: {
			clientId: id,
			clientSecret: secret
		}
	};
}

const socialProviders = getSocial();
export const googleEnabled = Boolean(socialProviders);

export const auth = betterAuth({
	baseURL: getUrl(),
	secret: getSecret(),
	database: drizzleAdapter(db, {
		provider: 'sqlite',
		schema: {
			user: schema.users,
			session: schema.sessions,
			account: schema.accounts,
			verification: schema.verifications
		}
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false
	},
	...(socialProviders ? { socialProviders } : {}),
	session: {
		expiresIn: SESSION_CONFIG.EXPIRY_SECONDS,
		updateAge: SESSION_CONFIG.UPDATE_AGE_SECONDS,
		cookieCache: {
			enabled: true,
			maxAge: SESSION_CONFIG.COOKIE_CACHE_SECONDS
		}
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user, context) => {
					if (context?.path.startsWith('/admin/')) {
						return;
					}

					return {
						data: {
							...user,
							role: USER_ROLE.CUSTOMER,
							shopId: null
						}
					};
				}
			}
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: USER_ROLE.CUSTOMER,
				required: false
			},
			shopId: {
				type: 'string',
				required: false
			},
			phone: {
				type: 'string',
				required: false
			}
		}
	}
});

export type Session = typeof auth.$Infer.Session;
