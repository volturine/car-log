import { RATE_LIMITS } from '$lib/constants';
import { auth } from '$lib/server/auth';
import { validateEnv } from '$lib/server/validation';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

validateEnv();

type Entry = {
	count: number;
	resetAt: number;
};

const limits = new Map<string, Entry>();
let lastSweep = 0;

function sweep(now: number): void {
	if (now - lastSweep < RATE_LIMITS.WINDOW_MS) {
		return;
	}

	lastSweep = now;

	for (const [key, entry] of limits) {
		if (entry.resetAt <= now) {
			limits.delete(key);
		}
	}
}

const authHandle: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};

const securityHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Content-Security-Policy', "default-src 'none'");
	}

	return response;
};

const rateLimitHandle: Handle = async ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/api/')) {
		return resolve(event);
	}

	const key = `${event.getClientAddress()}:${event.url.pathname}`;
	const now = Date.now();
	sweep(now);
	const entry = limits.get(key);

	if (!entry || now > entry.resetAt) {
		limits.set(key, {
			count: 1,
			resetAt: now + RATE_LIMITS.WINDOW_MS
		});

		return resolve(event);
	}

	if (entry.count >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
		return new Response('Too Many Requests', {
			status: 429,
			headers: {
				'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000))
			}
		});
	}

	entry.count += 1;
	limits.set(key, entry);

	return resolve(event);
};

export const handle = sequence(rateLimitHandle, authHandle, securityHandle);
