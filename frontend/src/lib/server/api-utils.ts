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
 * Check if user has access to shop
 */
export async function verifyShopAccess(shopId: string, userId: string, userRole: string) {
	// Shop owners have access to their own shop
	// Mechanics have access if they're assigned to the shop
	const [shop] = await db
		.select()
		.from(schema.shops)
		.where(eq(schema.shops.id, shopId))
		.limit(1);

	if (!shop) {
		throw error(API_ERRORS.NOT_FOUND.status, 'Shop not found');
	}

	// Owner has access
	if (shop.ownerId === userId) {
		return shop;
	}

	// Check if mechanic is part of this shop
	if (userRole === 'mechanic') {
		const [membership] = await db
			.select()
			.from(schema.shopMembers)
			.where(and(eq(schema.shopMembers.shopId, shopId), eq(schema.shopMembers.userId, userId)))
			.limit(1);

		if (!membership) {
			throw error(API_ERRORS.FORBIDDEN.status, 'You do not have access to this shop');
		}
	} else {
		throw error(API_ERRORS.FORBIDDEN.status, 'You do not have access to this shop');
	}

	return shop;
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
	const [record] = await db
		.select()
		.from(table)
		.where(and(eq(table.id, resourceId), eq(table.userId, userId)))
		.limit(1);

	if (!record) {
		throw error(API_ERRORS.NOT_FOUND.status, `${resourceName} not found`);
	}

	return record as T;
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
