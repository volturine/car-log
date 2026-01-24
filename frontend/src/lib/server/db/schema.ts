import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User table
export const users = sqliteTable('users', {
	id: text('id').primaryKey(),
	email: text('email').notNull().unique(),
	emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
	name: text('name'),
	role: text('role').notNull().default('customer'), // customer, shop_owner, mechanic, admin
	shopId: text('shop_id'), // For mechanics - which shop they work for
	phone: text('phone'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Session table for Better Auth
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Account table for Better Auth (for password hashing, etc.)
export const accounts = sqliteTable('accounts', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	expiresAt: integer('expires_at', { mode: 'timestamp' }),
	password: text('password'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Verification table for Better Auth
export const verifications = sqliteTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Repair Shop table
export const shops = sqliteTable('shops', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	ownerId: text('owner_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	email: text('email'),
	phone: text('phone'),
	address: text('address'),
	city: text('city'),
	state: text('state'),
	zipCode: text('zip_code'),
	businessHours: text('business_hours'), // JSON string
	specialties: text('specialties'), // JSON array
	logo: text('logo'), // URL to logo
	rating: real('rating').default(0),
	totalReviews: integer('total_reviews').default(0),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Shop team members (mechanics working at shops)
export const shopMembers = sqliteTable('shop_members', {
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	shopId: text('shop_id')
		.notNull()
		.references(() => shops.id, { onDelete: 'cascade' }),
	role: text('role').notNull().default('mechanic'), // owner, mechanic
	joinedAt: integer('joined_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Car table
export const cars = sqliteTable('cars', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	brand: text('brand').notNull(),
	model: text('model').notNull(),
	year: integer('year').notNull(),
	vin: text('vin'),
	licensePlate: text('license_plate'),
	ownerName: text('owner_name'),
	ownerPhone: text('owner_phone'),
	color: text('color'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Repair table
export const repairs = sqliteTable('repairs', {
	id: text('id').primaryKey(),
	carId: text('car_id')
		.notNull()
		.references(() => cars.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }), // Car owner
	shopId: text('shop_id').references(() => shops.id, { onDelete: 'set null' }), // Shop performing repair
	assignedMechanicId: text('assigned_mechanic_id').references(() => users.id, {
		onDelete: 'set null'
	}), // Specific mechanic
	title: text('title').notNull(),
	description: text('description'),
	status: text('status').notNull().default('estimate_pending'), // estimate_pending, estimate_approved, in_progress, completed, paid
	// Estimate fields
	estimatedCost: real('estimated_cost').default(0),
	estimatedHours: real('estimated_hours').default(0),
	estimateNotes: text('estimate_notes'),
	// Actual fields
	laborCost: real('labor_cost').default(0),
	laborHours: real('labor_hours').default(0),
	totalCost: real('total_cost').default(0),
	// Approval tracking
	customerApproved: integer('customer_approved', { mode: 'boolean' }).default(false),
	approvedAt: integer('approved_at', { mode: 'timestamp' }),
	// Payment tracking
	paymentStatus: text('payment_status').default('unpaid'), // unpaid, partial, paid
	amountPaid: real('amount_paid').default(0),
	// Dates
	startDate: integer('start_date', { mode: 'timestamp' }),
	completedDate: integer('completed_date', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Repair parts table
export const repairParts = sqliteTable('repair_parts', {
	id: text('id').primaryKey(),
	repairId: text('repair_id')
		.notNull()
		.references(() => repairs.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	description: text('description'),
	quantity: integer('quantity').notNull().default(1),
	unitCost: real('unit_cost').notNull().default(0),
	totalCost: real('total_cost').notNull().default(0),
	sourceUrl: text('source_url'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Photos table
export const photos = sqliteTable('photos', {
	id: text('id').primaryKey(),
	repairId: text('repair_id')
		.notNull()
		.references(() => repairs.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(),
	originalFilename: text('original_filename').notNull(),
	mimeType: text('mime_type').notNull(),
	size: integer('size').notNull(), // in bytes
	path: text('path').notNull(), // file path on disk
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});

// Notifications table
export const notifications = sqliteTable('notifications', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	type: text('type').notNull(), // estimate_ready, estimate_approved, estimate_rejected, repair_started, repair_completed, payment_received
	title: text('title').notNull(),
	message: text('message').notNull(),
	relatedId: text('related_id'), // repairId or other related entity
	relatedType: text('related_type'), // repair, shop, etc
	read: integer('read', { mode: 'boolean' }).notNull().default(false),
	readAt: integer('read_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
});
