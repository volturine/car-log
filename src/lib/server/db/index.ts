import { platform } from '$platform';
import type { Db } from '$lib/server/platform/types';
import * as schema from './schema';

// Query builders are created against whichever database the active platform
// provides: a process-wide SQLite file on Node, the request's D1 binding on
// Cloudflare. Resolving on each property access keeps call sites unaware of that.
export const db = new Proxy({} as Db, {
	get(_target, property) {
		const current = platform.db();
		const value = Reflect.get(current, property);

		return typeof value === 'function' ? value.bind(current) : value;
	}
});

export { schema };
