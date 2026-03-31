import { describe, expect, it } from 'vitest';
import {
	apiOk,
	conflictError,
	forbiddenError,
	internalError,
	notFoundError,
	toJsonResponse,
	unauthorizedError,
	validationError
} from './result';

describe('apiOk', () => {
	it('wraps data in a success result', () => {
		const result = apiOk({ id: '1' });
		expect(result.isOk()).toBe(true);
		expect(result._unsafeUnwrap().success).toBe(true);
		expect(result._unsafeUnwrap().data).toEqual({ id: '1' });
		expect(result._unsafeUnwrap().status).toBe(200);
	});

	it('accepts a custom 2xx status', () => {
		const result = apiOk(null, 201);
		expect(result._unsafeUnwrap().status).toBe(201);
	});
});

describe('error factories', () => {
	it('validationError returns 400', () => {
		const result = validationError('bad input');
		expect(result.isErr()).toBe(true);
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'validation',
			message: 'bad input',
			status: 400
		});
	});

	it('unauthorizedError returns 401 with default message', () => {
		const result = unauthorizedError();
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'unauthorized',
			message: 'Unauthorized',
			status: 401
		});
	});

	it('forbiddenError returns 403 with default message', () => {
		const result = forbiddenError();
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'forbidden',
			message: 'Forbidden',
			status: 403
		});
	});

	it('notFoundError returns 404 with default message', () => {
		const result = notFoundError();
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'not_found',
			message: 'Not found',
			status: 404
		});
	});

	it('conflictError returns 409', () => {
		const result = conflictError('duplicate');
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'conflict',
			message: 'duplicate',
			status: 409
		});
	});

	it('internalError returns 500 with default message', () => {
		const result = internalError();
		expect(result._unsafeUnwrapErr()).toEqual({
			type: 'internal',
			message: 'Internal server error',
			status: 500
		});
	});

	it('allows custom messages on defaulted factories', () => {
		expect(unauthorizedError('nope')._unsafeUnwrapErr().message).toBe('nope');
		expect(forbiddenError('denied')._unsafeUnwrapErr().message).toBe('denied');
		expect(notFoundError('gone')._unsafeUnwrapErr().message).toBe('gone');
		expect(internalError('boom')._unsafeUnwrapErr().message).toBe('boom');
	});
});

describe('toJsonResponse', () => {
	it('converts a success result to a 200 JSON response', async () => {
		const response = toJsonResponse(apiOk({ name: 'test' }));
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/json');
		const body = await response.json();
		expect(body).toEqual({ success: true, data: { name: 'test' } });
	});

	it('converts a success result with custom status', async () => {
		const response = toJsonResponse(apiOk(null, 201));
		expect(response.status).toBe(201);
	});

	it('converts an error result to the correct status', async () => {
		const response = toJsonResponse(validationError('invalid'));
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'invalid' });
	});

	it('converts a 404 error result', async () => {
		const response = toJsonResponse(notFoundError('missing'));
		expect(response.status).toBe(404);
		const body = await response.json();
		expect(body).toEqual({ success: false, error: 'missing' });
	});
});
