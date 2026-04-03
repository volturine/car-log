import { createAuthClient } from 'better-auth/client';

function isJsonLikeBody(body: unknown): body is Record<string, unknown> | unknown[] {
	if (!body || typeof body !== 'object') {
		return false;
	}

	if (
		body instanceof FormData ||
		body instanceof URLSearchParams ||
		body instanceof Blob ||
		body instanceof ArrayBuffer ||
		body instanceof ReadableStream
	) {
		return false;
	}

	return Array.isArray(body) || Object.getPrototypeOf(body) === Object.prototype;
}

export const authClient = createAuthClient({
	baseURL: typeof window !== 'undefined' ? window.location.origin : '',
	fetchOptions: {
		onRequest(context) {
			const headers = new Headers(context.headers);
			const contentType = headers.get('content-type')?.toLowerCase() || '';

			if (
				isJsonLikeBody(context.body) &&
				(!contentType || contentType.includes('application/json'))
			) {
				headers.set('content-type', 'application/json');

				return {
					...context,
					headers,
					body: JSON.stringify(context.body)
				};
			}

			return {
				...context,
				headers
			};
		}
	}
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
