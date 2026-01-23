import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

export const auth = betterAuth({
	secret: process.env.BETTER_AUTH_SECRET || 'default-secret-change-this-in-production-min-32-characters-long',
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
		requireEmailVerification: false // Set to true in production with email service
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day
		cookieCache: {
			enabled: true,
			maxAge: 5 * 60 // 5 minutes
		}
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'customer',
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
