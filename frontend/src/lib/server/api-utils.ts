/**
 * Reusable API utilities for authentication, authorization, and response formatting
 */

import { error, type NumericRange } from '@sveltejs/kit';
import { db, schema } from './db';
import { eq, and } from 'drizzle-orm';
import { API_ERRORS } from '$lib/constants';
import { z } from 'zod';

/**
 * Require authentication - throws 401 if user not authenticated
 */
export function requireAuth(locals: App.Locals) {
	if (!locals.user) {
		throw error(API_ERRORS.UNAUTHORIZED.status, API_ERRORS.UNAUTHORIZED.message);
	}
	return locals.user;
}

/**
 * Require specific role - throws 403 if user doesn't have required role
 */
export function requireRole(locals: App.Locals, allowedRoles: string[]) {
	const user = requireAuth(locals);

	if (!allowedRoles.includes(user.role || 'customer')) {
		throw error(API_ERRORS.FORBIDDEN.status, 'Insufficient permissions');
	}

	return user;
}

/**
 * Check if user is shop owner or mechanic
 */
export function isShopMember(user: any): boolean {
	return user.role === 'shop_owner' || user.role === 'mechanic';
}

/**
 * Fetch single record by ID - returns undefined if not found
 */
export async function fetchById<T extends { id: any }>(
	table: any,
	id: string
): Promise<T | undefined> {
	const [record] = await db.select().from(table).where(eq(table.id, id)).limit(1);
	return record as T | undefined;
}

/**
 * Check if user has access to shop
 */
export async function verifyShopAccess(shopId: string, userId: string, userRole: string) {
	const shop = await fetchById(schema.shops, shopId);
	if (!shop) throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');

	if (shop.ownerId === userId) return shop;

	if (userRole === 'mechanic') {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(and(eq(schema.shopMembers.shopId, shopId), eq(schema.shopMembers.userId, userId)))
			.limit(1);
		if (membership) return shop;
	}

	throw error(API_ERRORS.FORBIDDEN.status, 'You do not have access to this shop');
}

/**
 * Verify resource ownership - throws 404 if not found or not owned by user
 */
export async function verifyOwnership<T extends Record<string, any>>(
	table: any,
	resourceId: string,
	userId: string,
	resourceName: string = 'Resource'
): Promise<T> {
	const record = await fetchById<T>(table, resourceId);
	if (!record || record.userId !== userId) {
		throw error(API_ERRORS.NOT_FOUND.status, `${resourceName} not found`);
	}
	return record;
}

/**
 * Validate request body using Zod schema
 */
export async function validateBody<T>(request: Request, schema: z.ZodSchema<T>): Promise<T> {
	try {
		const data = await request.json();
		return schema.parse(data);
	} catch (err) {
		if (err instanceof z.ZodError) {
			const errorMessage = err.issues
				.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
				.join(', ');
			throw error(API_ERRORS.VALIDATION_ERROR.status, errorMessage);
		}
		throw error(400, 'Invalid request body');
	}
}

/**
 * Format successful API response
 */
export function successResponse<T>(data: T, status: NumericRange<200, 299> = 200) {
	return {
		success: true as const,
		data,
		status
	};
}

/**
 * Format error API response
 */
export function errorResponse(
	code: string,
	message: string,
	status: NumericRange<400, 599>,
	details?: any
) {
	return {
		success: false as const,
		error: {
			code,
			message,
			details
		},
		status
	};
}

/**
 * Execute database transaction
 * Note: better-sqlite3 requires synchronous transaction callbacks
 * The callback receives the transaction object (tx) to use for database operations
 */
export function transaction<T>(callback: (tx: typeof db) => T): T {
	return db.transaction((tx) => {
		return callback(tx);
	});
}

/**
 * Map photos to URL format
 */
export function formatPhotosForResponse(photos: Array<{ id: string }>): Array<{ id: string; url: string }> {
	return photos.map((p) => ({
		id: p.id,
		url: `/api/photos/${p.id}`
	}));
}

/**
 * Safe async handler with error logging
 */
export function catchAsync(
	handler: (context: any) => Promise<Response>
): (context: any) => Promise<Response> {
	return async (context: any) => {
		try {
			return await handler(context);
		} catch (err) {
			// Log error here (will implement logger next)
			console.error('API Error:', err);
			throw err;
		}
	};
}
