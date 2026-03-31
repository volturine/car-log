import type { Config } from 'drizzle-kit';
import { getDatabaseUrl } from './src/lib/server/env';

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: getDatabaseUrl()
	}
} satisfies Config;
