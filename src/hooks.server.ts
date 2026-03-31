import { auth } from '$lib/server/auth';
import { validateEnv } from '$lib/server/validation';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

// Validate environment variables on startup
validateEnv();

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

	// Add security headers
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	// Add CSP for API routes
	if (event.url.pathname.startsWith('/api/')) {
		response.headers.set('Content-Security-Policy', "default-src 'none'");
	}

	return response;
};

const rateLimitHandle: Handle = async ({ event, resolve }) => {
	// Simple rate limiting for API endpoints
	if (event.url.pathname.startsWith('/api/')) {
		const ip = event.getClientAddress();
		const key = `${ip}:${event.url.pathname}`;

		// Get or create rate limit entry
		if (!global.rateLimits) {
			global.rateLimits = new Map();
		}

		const now = Date.now();
		const entry = global.rateLimits.get(key) || { count: 0, resetAt: now + 60000 };

		if (now > entry.resetAt) {
			// Reset the counter
			entry.count = 1;
			entry.resetAt = now + 60000;
		} else {
			entry.count++;
		}

		global.rateLimits.set(key, entry);

		// 100 requests per minute per IP per endpoint
		if (entry.count > 100) {
			return new Response('Too Many Requests', {
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000))
				}
			});
		}
	}

	return resolve(event);
};

export const handle = sequence(rateLimitHandle, authHandle, securityHandle);

// Global type for rate limiting
declare global {
	var rateLimits: Map<string, { count: number; resetAt: number }>;
}
