import type { Session } from '$lib/server/auth';
import type { CloudflareBindings } from '$lib/server/platform/types';
import type { ExecutionContext } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Locals {
			session: Session['session'] | null;
			user: Session['user'] | null;
		}
		// Present on Cloudflare Workers only; undefined under the Node adapter.
		interface Platform {
			env: CloudflareBindings;
			ctx: ExecutionContext;
		}
		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
