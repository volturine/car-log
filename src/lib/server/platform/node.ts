import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { bootstrapDatabase } from '$lib/server/db/bootstrap';
import * as schema from '$lib/server/db/schema';
import { getDatabasePath } from '$lib/server/env';
import type { Platform } from './types';

let instance: BetterSQLite3Database<typeof schema> | undefined;

function database(): BetterSQLite3Database<typeof schema> {
	if (!instance) {
		const sqlite = new Database(getDatabasePath());
		bootstrapDatabase(sqlite);
		sqlite.exec('PRAGMA foreign_keys = ON;');
		instance = drizzle(sqlite, { schema });
	}

	return instance;
}

function uploadsDir(): string {
	return resolve(process.cwd(), 'uploads');
}

/** Resolves a stored key under the uploads directory, refusing anything that escapes it. */
function uploadPath(key: string): string {
	const root = uploadsDir();
	const target = resolve(root, key);

	if (!target.startsWith(root + sep)) {
		throw new Error('Upload key resolves outside the uploads directory');
	}

	return target;
}

function isMissingFile(err: unknown): boolean {
	return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
}

export const platform: Platform = {
	db: database,
	async batch(statements) {
		// better-sqlite3 holds a single connection, so statements built against
		// the shared instance run inside this transaction.
		database().transaction(() => {
			for (const statement of statements) {
				statement.run();
			}
		});
	},
	storage: {
		async write(key, data) {
			const target = uploadPath(key);
			await mkdir(dirname(target), { recursive: true, mode: 0o755 });
			await writeFile(target, new Uint8Array(data), { mode: 0o644 });
		},
		async read(key) {
			try {
				// Copy out of Node's Buffer so the bytes own a plain ArrayBuffer.
				return new Uint8Array(await readFile(uploadPath(key)));
			} catch (err) {
				if (isMissingFile(err)) {
					return null;
				}

				throw err;
			}
		},
		async remove(key) {
			try {
				await unlink(uploadPath(key));
			} catch (err) {
				if (!isMissingFile(err)) {
					throw err;
				}
			}
		}
	}
};
