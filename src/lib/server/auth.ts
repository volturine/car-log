import { SESSION_CONFIG, USER_ROLE } from '$lib/constants';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
	secret:
		process.env.BETTER_AUTH_SECRET ||
		'default-secret-change-this-in-production-min-32-characters-long',
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
	session: {
		expiresIn: SESSION_CONFIG.EXPIRY_SECONDS,
		updateAge: SESSION_CONFIG.UPDATE_AGE_SECONDS,
		cookieCache: {
			enabled: true,
			maxAge: SESSION_CONFIG.COOKIE_CACHE_SECONDS
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
