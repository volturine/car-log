import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { join } from 'path';
import * as schema from './schema';

// Get the database path
const dbPath = join(process.cwd(), 'sqlite.db');

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON;');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

export { schema };
