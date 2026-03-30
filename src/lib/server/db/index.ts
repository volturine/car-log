import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from './schema';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the database path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '../../../../sqlite.db');

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.exec('PRAGMA foreign_keys = ON;');

// Create Drizzle instance
export const db = drizzle(sqlite, { schema });

export { schema };
