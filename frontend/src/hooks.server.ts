import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};

export const handle = sequence(authHandle);
