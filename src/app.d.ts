import type { Session } from '$lib/server/auth';

declare global {
	namespace App {
		interface Locals {
			session: Session['session'] | null;
			user: Session['user'] | null;
		}
		// Neither adapter supplies a per-request platform; Workers bindings come
		// from `cloudflare:workers` and storage access goes through
		// `$lib/server/platform`.
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
