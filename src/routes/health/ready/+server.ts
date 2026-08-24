import type { RequestHandler } from './$types';
import { toJsonResponse, apiOk } from '$lib/server/result';

export const GET: RequestHandler = async () => {
	const result = apiOk({ ready: true });

	return toJsonResponse(result);
};
