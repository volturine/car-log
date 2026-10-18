import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { bootstrapDatabase } from './bootstrap';

type AccountRow = { provider_id: string; issuer: string | null };

describe('bootstrapDatabase', () => {
	it('creates the schema on an empty database', () => {
		const sqlite = new Database(':memory:');

		bootstrapDatabase(sqlite);

		const columns = sqlite
			.prepare<[], { name: string; notnull: number }>('PRAGMA table_info("accounts")')
			.all()
			.map((column) => [column.name, column.notnull]);
		expect(columns).toContainEqual(['issuer', 1]);
		expect(
			sqlite
				.prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'index'")
				.all()
				.map((index) => index.name)
		).toContain('accounts_issuer_account_id_unique');
	});

	it('adds and backfills the issuer column on pre-1.7 databases', () => {
		const sqlite = new Database(':memory:');
		sqlite.exec(`
			CREATE TABLE "users" ("id" text PRIMARY KEY NOT NULL, "email" text NOT NULL UNIQUE);
			CREATE TABLE "accounts" (
				"id" text PRIMARY KEY NOT NULL,
				"user_id" text NOT NULL,
				"account_id" text NOT NULL,
				"provider_id" text NOT NULL,
				"password" text
			);
			INSERT INTO "users" VALUES ('u1', 'a@example.com'), ('u2', 'b@example.com');
			INSERT INTO "accounts" ("id", "user_id", "account_id", "provider_id") VALUES
				('a1', 'u1', 'u1', 'credential'),
				('a2', 'u2', '12345', 'google'),
				('a3', 'u2', 'x', 'github');
		`);

		bootstrapDatabase(sqlite);

		const rows = sqlite
			.prepare<[], AccountRow>('SELECT provider_id, issuer FROM "accounts" ORDER BY id')
			.all();
		expect(rows).toEqual([
			{ provider_id: 'credential', issuer: 'local:credential' },
			{ provider_id: 'google', issuer: 'https://accounts.google.com' },
			{ provider_id: 'github', issuer: 'local:github' }
		]);
		expect(() =>
			sqlite
				.prepare(
					'INSERT INTO "accounts" ("id", "user_id", "account_id", "provider_id", "issuer") VALUES (?, ?, ?, ?, ?)'
				)
				.run('a4', 'u1', 'u1', 'credential', 'local:credential')
		).toThrow(/UNIQUE/);

		// Running again is a no-op.
		expect(() => bootstrapDatabase(sqlite)).not.toThrow();
	});
});
