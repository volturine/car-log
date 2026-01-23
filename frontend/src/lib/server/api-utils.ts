/**
 * Reusable API utilities for authentication, authorization, and response formatting
 */

import { error, type NumericRange } from '@sveltejs/kit';
import { db } from './db';
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
 */
export async function transaction<T>(callback: () => Promise<T> | T): Promise<T> {
	// Drizzle transactions for better-sqlite3
	return db.transaction(async () => {
		return await Promise.resolve(callback());
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
