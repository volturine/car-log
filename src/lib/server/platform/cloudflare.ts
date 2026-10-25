import { env } from 'cloudflare:workers';
import type { D1Database } from '@cloudflare/workers-types';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema';
import type { CloudflareBindings, Platform } from './types';

/** The current Worker's bindings, provided by the runtime itself. */
export function cloudflareBindings(): CloudflareBindings {
	return env;
}

// The D1 binding object is stable for the life of an isolate, so one Drizzle
// instance per binding avoids rebuilding the schema map on every request.
const instances = new WeakMap<D1Database, DrizzleD1Database<typeof schema>>();

function database(): DrizzleD1Database<typeof schema> {
	const d1 = cloudflareBindings().CAR_LOG_DB;
	let db = instances.get(d1);

	if (!db) {
		db = drizzle(d1, { schema });
		instances.set(d1, db);
	}

	return db;
}

export const platform: Platform = {
	db: database,
	async batch(statements) {
		// D1 rejects BEGIN/COMMIT; a batch is its atomic unit.
		await database().batch(statements);
	},
	storage: {
		async write(key, data, contentType) {
			await cloudflareBindings().CAR_LOG_PHOTOS.put(key, data, {
				httpMetadata: { contentType }
			});
		},
		async read(key) {
			const object = await cloudflareBindings().CAR_LOG_PHOTOS.get(key);

			return object ? new Uint8Array(await object.arrayBuffer()) : null;
		},
		async remove(key) {
			await cloudflareBindings().CAR_LOG_PHOTOS.delete(key);
		}
	}
};
