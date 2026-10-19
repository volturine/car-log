import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FILE_UPLOAD } from '$lib/constants';

const state = vi.hoisted(() => ({
	save: vi.fn<() => Promise<{ filename: string; path: string }>>(),
	remove: vi.fn(async (_path: string) => undefined),
	batch: vi.fn(async (_statements: unknown) => undefined),
	values: vi.fn((_rows: unknown) => ({ kind: 'insert' })),
	access: vi.fn(async () => undefined),
	photo: vi.fn(async () => ({ id: 'photo-1', path: 'photo-path', mimeType: 'image/png' })),
	read: vi.fn(async () => new Uint8Array([1, 2, 3])),
	logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

vi.mock('$lib/server/db', async () => ({
	schema: await vi.importActual('$lib/server/db/schema'),
	db: { insert: () => ({ values: state.values }) }
}));

vi.mock('$lib/server/api-utils', () => ({
	requireAuth: () => ({ id: 'user-1' }),
	verifyRepairAccess: state.access,
	verifyPhotoAccess: state.photo,
	writeBatch: state.batch,
	successResponse: (data: unknown) => ({ success: true, data }),
	formatPhotosForResponse: (rows: Array<{ id: string }>) =>
		rows.map((row) => ({ id: row.id, url: `/api/photos/${row.id}` }))
}));

vi.mock('$lib/server/storage', () => ({
	saveFile: state.save,
	deleteFile: state.remove,
	readFile: state.read
}));

vi.mock('$lib/server/logger', () => ({
	apiLogger: { child: () => state.logger },
	fileLogger: { child: () => state.logger }
}));

function request(count: number): Request {
	const form = new FormData();
	form.set('repairId', 'repair-1');
	for (let index = 0; index < count; index += 1) {
		form.append('files', new File(['image'], `${index}.png`, { type: 'image/png' }));
	}
	return new Request('https://car-log.test/api/photos', { method: 'POST', body: form });
}

describe('photo uploads', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		state.save.mockReset();
		state.batch.mockReset().mockResolvedValue(undefined);
		state.access.mockReset().mockResolvedValue(undefined);
		state.remove.mockReset().mockResolvedValue(undefined);
	});

	it('rejects too many files before any storage or database write', async () => {
		const { POST } = await import('../routes/api/photos/+server');

		await expect(
			POST({ request: request(FILE_UPLOAD.MAX_FILES_PER_REQUEST + 1), locals: {} } as never)
		).rejects.toMatchObject({ status: 400 });
		expect(state.save).not.toHaveBeenCalled();
		expect(state.batch).not.toHaveBeenCalled();
	});

	it('does not save files when repair access is denied', async () => {
		state.access.mockRejectedValueOnce(new Error('Forbidden'));
		const { POST } = await import('../routes/api/photos/+server');

		await expect(POST({ request: request(1), locals: {} } as never)).rejects.toThrow('Forbidden');
		expect(state.save).not.toHaveBeenCalled();
	});

	it('waits for pending uploads and removes successful files when one write fails', async () => {
		const pending = Promise.withResolvers<{ filename: string; path: string }>();
		const started = Promise.withResolvers<void>();
		state.save.mockRejectedValueOnce(new Error('Storage failed')).mockImplementationOnce(() => {
			started.resolve();
			return pending.promise;
		});
		const { POST } = await import('../routes/api/photos/+server');
		const response = POST({ request: request(2), locals: {} } as never);
		const rejected = expect(response).rejects.toMatchObject({ status: 500 });

		await started.promise;
		expect(state.remove).not.toHaveBeenCalled();
		pending.resolve({ filename: 'second.png', path: 'second-path' });
		await rejected;
		expect(state.remove).toHaveBeenCalledExactlyOnceWith('second-path');
		expect(state.batch).not.toHaveBeenCalled();
	});

	it('removes all saved files when the database insert fails', async () => {
		state.save
			.mockResolvedValueOnce({ filename: 'first.png', path: 'first-path' })
			.mockResolvedValueOnce({ filename: 'second.png', path: 'second-path' });
		state.batch.mockRejectedValueOnce(new Error('Database failed'));
		const { POST } = await import('../routes/api/photos/+server');

		await expect(POST({ request: request(2), locals: {} } as never)).rejects.toMatchObject({
			status: 500
		});
		expect(state.remove.mock.calls.map(([path]) => path)).toEqual(['first-path', 'second-path']);
	});

	it('attempts every cleanup even if one removal fails', async () => {
		state.save
			.mockResolvedValueOnce({ filename: 'first.png', path: 'first-path' })
			.mockResolvedValueOnce({ filename: 'second.png', path: 'second-path' });
		state.batch.mockRejectedValueOnce(new Error('Database failed'));
		state.remove.mockRejectedValueOnce(new Error('Removal failed'));
		const { POST } = await import('../routes/api/photos/+server');

		await expect(POST({ request: request(2), locals: {} } as never)).rejects.toMatchObject({
			status: 500
		});
		expect(state.remove).toHaveBeenCalledTimes(2);
		expect(state.logger.warn).toHaveBeenCalled();
	});

	it('persists successful uploads and returns authorized photo URLs', async () => {
		state.save.mockResolvedValueOnce({ filename: 'first.png', path: 'first-path' });
		const { POST } = await import('../routes/api/photos/+server');
		const response = await POST({ request: request(1), locals: {} } as never);

		expect(response.status).toBe(201);
		expect(state.batch).toHaveBeenCalledOnce();
		expect(state.values).toHaveBeenCalledWith([
			expect.objectContaining({ repairId: 'repair-1', userId: 'user-1', path: 'first-path' })
		]);
		expect(state.remove).not.toHaveBeenCalled();
	});
});

it('prevents a browser from reusing private photos after the session changes', async () => {
	const { GET } = await import('../routes/api/photos/[id]/+server');
	const response = await GET({ params: { id: 'photo-1' }, locals: {} } as never);

	expect(state.photo).toHaveBeenCalledWith('photo-1', { id: 'user-1' });
	expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
