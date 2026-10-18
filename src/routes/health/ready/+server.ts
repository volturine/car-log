import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { apiLogger } from '$lib/server/logger';
import { toJsonResponse, apiOk, internalError } from '$lib/server/result';
import { toError } from '$lib/utils';
import { sql } from 'drizzle-orm';

const logger = apiLogger.child('health');

// A deploy is only ready once the database behind it answers.
export const GET: RequestHandler = async () => {
	try {
		await db.run(sql`select 1`);
	} catch (err) {
		logger.error('Database readiness check failed', toError(err));

		return toJsonResponse(internalError('Database unavailable'));
	}

	return toJsonResponse(apiOk({ ready: true }));
};
