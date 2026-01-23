import { Result, ok, err } from 'neverthrow';
import type { NumericRange } from '@sveltejs/kit';

/**
 * API Error types
 */
export type ApiError =
	| { type: 'validation'; message: string; status: 400 }
	| { type: 'unauthorized'; message: string; status: 401 }
	| { type: 'forbidden'; message: string; status: 403 }
	| { type: 'not_found'; message: string; status: 404 }
	| { type: 'conflict'; message: string; status: 409 }
	| { type: 'internal'; message: string; status: 500 };

/**
 * API Success response
 */
export type ApiSuccess<T> = {
	success: true;
	data: T;
	status: NumericRange<200, 299>;
};

/**
 * API Result type combining success and error cases
 */
export type ApiResult<T> = Result<ApiSuccess<T>, ApiError>;

/**
 * Create a successful API result
 */
export function apiOk<T>(data: T, status: NumericRange<200, 299> = 200): ApiResult<T> {
	return ok({ success: true as const, data, status });
}

/**
 * Create validation error result
 */
export function validationError(message: string): Result<never, ApiError> {
	return err({ type: 'validation', message, status: 400 });
}

/**
 * Create unauthorized error result
 */
export function unauthorizedError(message: string = 'Unauthorized'): Result<never, ApiError> {
	return err({ type: 'unauthorized', message, status: 401 });
}

/**
 * Create forbidden error result
 */
export function forbiddenError(message: string = 'Forbidden'): Result<never, ApiError> {
	return err({ type: 'forbidden', message, status: 403 });
}

/**
 * Create not found error result
 */
export function notFoundError(message: string = 'Not found'): Result<never, ApiError> {
	return err({ type: 'not_found', message, status: 404 });
}

/**
 * Create conflict error result
 */
export function conflictError(message: string): Result<never, ApiError> {
	return err({ type: 'conflict', message, status: 409 });
}

/**
 * Create internal error result
 */
export function internalError(message: string = 'Internal server error'): Result<never, ApiError> {
	return err({ type: 'internal', message, status: 500 });
}

/**
 * Convert ApiResult to JSON response
 */
export function toJsonResponse<T>(result: ApiResult<T>): Response {
	if (result.isOk()) {
		const { data, status } = result.value;
		return new Response(JSON.stringify({ success: true, data }), {
			status,
			headers: { 'Content-Type': 'application/json' }
		});
	} else {
		const error = result.error;
		return new Response(JSON.stringify({ success: false, error: error.message }), {
			status: error.status,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
