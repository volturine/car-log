import type { Database } from 'better-sqlite3';

/**
 * Brings a local SQLite file up to the current schema on startup. Cloudflare
 * D1 is migrated with the SQL files in `cf/migrations` instead; keep both in
 * step with `schema.ts`.
 */
function hasTable(sqlite: Database, name: string): boolean {
	const stmt = sqlite.prepare(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
	);
	const row = stmt.get(name);
	return row !== undefined;
}

function hasColumn(sqlite: Database, table: string, name: string): boolean {
	if (!hasTable(sqlite, table)) {
		return false;
	}

	const cols = sqlite
		.prepare<[], { name: string }>(`PRAGMA table_info("${table}")`)
		.all()
		.map((col) => col.name);

	return cols.includes(name);
}

function addColumn(sqlite: Database, table: string, name: string, def: string): void {
	if (hasColumn(sqlite, table, name)) {
		return;
	}

	sqlite.exec(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${def};`);
}

function ensureTables(sqlite: Database): void {
	sqlite.exec(`
		CREATE TABLE IF NOT EXISTS "users" (
			"id" text PRIMARY KEY NOT NULL,
			"email" text NOT NULL UNIQUE,
			"email_verified" integer DEFAULT false NOT NULL,
			"name" text,
			"image" text,
			"role" text DEFAULT 'customer' NOT NULL,
			"shop_id" text,
			"phone" text,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "sessions" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL,
			"expires_at" integer NOT NULL,
			"token" text NOT NULL UNIQUE,
			"ip_address" text,
			"user_agent" text,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "accounts" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL,
			"account_id" text NOT NULL,
			"provider_id" text NOT NULL,
			"issuer" text NOT NULL,
			"access_token" text,
			"refresh_token" text,
			"id_token" text,
			"access_token_expires_at" integer,
			"refresh_token_expires_at" integer,
			"scope" text,
			"expires_at" integer,
			"password" text,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "verifications" (
			"id" text PRIMARY KEY NOT NULL,
			"identifier" text NOT NULL,
			"value" text NOT NULL,
			"expires_at" integer NOT NULL,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL
		);

		CREATE TABLE IF NOT EXISTS "shops" (
			"id" text PRIMARY KEY NOT NULL,
			"name" text NOT NULL,
			"owner_id" text NOT NULL,
			"email" text,
			"phone" text,
			"address" text,
			"city" text,
			"state" text,
			"zip_code" text,
			"business_hours" text,
			"specialties" text,
			"logo" text,
			"rating" real DEFAULT 0,
			"total_reviews" integer DEFAULT 0,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "shop_members" (
			"user_id" text NOT NULL,
			"shop_id" text NOT NULL,
			"role" text DEFAULT 'mechanic' NOT NULL,
			"joined_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
			FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "cars" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL,
			"brand" text NOT NULL,
			"model" text NOT NULL,
			"year" integer NOT NULL,
			"vin" text,
			"license_plate" text,
			"owner_name" text,
			"owner_phone" text,
			"color" text,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "repairs" (
			"id" text PRIMARY KEY NOT NULL,
			"car_id" text NOT NULL,
			"user_id" text NOT NULL,
			"shop_id" text,
			"assigned_mechanic_id" text,
			"title" text NOT NULL,
			"description" text,
			"status" text DEFAULT 'estimate_pending' NOT NULL,
			"estimated_cost" real DEFAULT 0,
			"estimated_hours" real DEFAULT 0,
			"estimate_notes" text,
			"labor_cost" real DEFAULT 0,
			"labor_hours" real DEFAULT 0,
			"total_cost" real DEFAULT 0,
			"customer_approved" integer DEFAULT false,
			"approved_at" integer,
			"payment_status" text DEFAULT 'unpaid',
			"amount_paid" real DEFAULT 0,
			"appointment_at" integer,
			"start_date" integer,
			"completed_date" integer,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			"updated_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE cascade,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
			FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE set null,
			FOREIGN KEY ("assigned_mechanic_id") REFERENCES "users"("id") ON DELETE set null
		);

		CREATE TABLE IF NOT EXISTS "repair_parts" (
			"id" text PRIMARY KEY NOT NULL,
			"repair_id" text NOT NULL,
			"name" text NOT NULL,
			"description" text,
			"quantity" integer DEFAULT 1 NOT NULL,
			"unit_cost" real DEFAULT 0 NOT NULL,
			"total_cost" real DEFAULT 0 NOT NULL,
			"source_url" text,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "payments" (
			"id" text PRIMARY KEY NOT NULL,
			"repair_id" text NOT NULL,
			"amount" real NOT NULL,
			"method" text NOT NULL,
			"notes" text,
			"recorded_by" text NOT NULL,
			"paid_at" integer NOT NULL,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE cascade,
			FOREIGN KEY ("recorded_by") REFERENCES "users"("id")
		);

		CREATE TABLE IF NOT EXISTS "photos" (
			"id" text PRIMARY KEY NOT NULL,
			"repair_id" text NOT NULL,
			"user_id" text NOT NULL,
			"filename" text NOT NULL,
			"original_filename" text NOT NULL,
			"mime_type" text NOT NULL,
			"size" integer NOT NULL,
			"path" text NOT NULL,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("repair_id") REFERENCES "repairs"("id") ON DELETE cascade,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
		);

		CREATE TABLE IF NOT EXISTS "notifications" (
			"id" text PRIMARY KEY NOT NULL,
			"user_id" text NOT NULL,
			"type" text NOT NULL,
			"title" text NOT NULL,
			"message" text NOT NULL,
			"related_id" text,
			"related_type" text,
			"read" integer DEFAULT false NOT NULL,
			"read_at" integer,
			"created_at" integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
			FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
		);
	`);
}

function ensureLegacyColumns(sqlite: Database): void {
	addColumn(sqlite, 'users', 'image', 'text');
	addColumn(sqlite, 'accounts', 'access_token_expires_at', 'integer');
	addColumn(sqlite, 'accounts', 'refresh_token_expires_at', 'integer');
	addColumn(sqlite, 'accounts', 'scope', 'text');
	addColumn(sqlite, 'repairs', 'appointment_at', 'integer');
	// better-auth 1.7 scopes account ids by issuer. Databases created before
	// that get the column added (nullable at the SQL level) and backfilled the
	// way better-auth's own migration does.
	addColumn(sqlite, 'accounts', 'issuer', 'text');
	sqlite.exec(`
		UPDATE "accounts" SET "issuer" = CASE "provider_id"
			WHEN 'credential' THEN 'local:credential'
			WHEN 'google' THEN 'https://accounts.google.com'
			ELSE 'local:' || "provider_id"
		END WHERE "issuer" IS NULL;
	`);
}

function ensureIndexes(sqlite: Database): void {
	sqlite.exec(`
		CREATE UNIQUE INDEX IF NOT EXISTS "accounts_issuer_account_id_unique"
			ON "accounts" ("issuer", "account_id");
	`);
}

export function bootstrapDatabase(sqlite: Database): void {
	ensureTables(sqlite);
	ensureLegacyColumns(sqlite);
	ensureIndexes(sqlite);
}
