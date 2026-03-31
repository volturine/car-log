import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { getDatabasePath } from '$lib/server/env';
import * as schema from './schema';

const dbPath = getDatabasePath();

const sqlite = new Database(dbPath);

sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export { schema };
