import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import type { BatchItem } from 'drizzle-orm/batch';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from '$lib/server/db/schema';

/**
 * The database every query builder is created against. Node answers queries
 * synchronously and Cloudflare D1 asynchronously; awaiting either works, so
 * call sites treat the result kind as unknown.
 */
export type Db = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>;

/** A prepared insert, update or delete that has not been executed yet. */
export type WriteStatement = BatchItem<'sqlite'> & { run(): unknown };

/** One or more statements applied atomically, in order. */
export type WriteBatch = readonly [WriteStatement, ...WriteStatement[]];

/** Photo bytes keyed by the server-derived `<userId>/<repairId>/<filename>` path. */
export type FileStorage = {
	write(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
	/** Resolves to null when nothing is stored under the key. */
	read(key: string): Promise<Uint8Array<ArrayBuffer> | null>;
	/** Removing a key that holds nothing is not an error. */
	remove(key: string): Promise<void>;
};

/**
 * What the hosting runtime provides. `svelte.config.js` aliases `$platform` to
 * the Node implementation by default and to the Cloudflare one when
 * `DEPLOY_TARGET=cloudflare`, so only the chosen driver is ever bundled.
 */
export type Platform = {
	db(): Db;
	/** Applies every statement atomically; none is visible unless all succeed. */
	batch(statements: WriteBatch): Promise<void>;
	storage: FileStorage;
};

/** Bindings declared in `wrangler.jsonc`. */
export type CloudflareBindings = {
	CAR_LOG_DB: D1Database;
	CAR_LOG_PHOTOS: R2Bucket;
};
