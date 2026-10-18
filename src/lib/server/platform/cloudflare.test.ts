import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

const harness = vi.hoisted(() => ({
	platform: undefined as unknown
}));

vi.mock('$app/server', () => ({
	getRequestEvent: () => ({ platform: harness.platform })
}));

type FakeBucket = {
	objects: Map<string, { data: ArrayBuffer; contentType?: string }>;
	bucket: R2Bucket;
};

function fakeBucket(): FakeBucket {
	const objects = new Map<string, { data: ArrayBuffer; contentType?: string }>();
	const bucket = {
		async put(
			key: string,
			data: ArrayBuffer,
			options?: { httpMetadata?: { contentType?: string } }
		) {
			objects.set(key, { data, contentType: options?.httpMetadata?.contentType });
			return null;
		},
		async get(key: string) {
			const object = objects.get(key);
			return object ? { arrayBuffer: async () => object.data } : null;
		},
		async delete(key: string) {
			objects.delete(key);
		}
	};

	return { objects, bucket: bucket as unknown as R2Bucket };
}

function bindings(bucket: R2Bucket) {
	return {
		CAR_LOG_DB: {} as D1Database,
		CAR_LOG_PHOTOS: bucket
	};
}

describe('cloudflare platform', () => {
	beforeEach(() => {
		harness.platform = undefined;
	});

	it('refuses to run without Worker bindings', async () => {
		const { platform } = await import('./cloudflare');

		expect(() => platform.db()).toThrow(/bindings are unavailable/);
	});

	it('reuses one database instance per D1 binding', async () => {
		const { platform } = await import('./cloudflare');
		const env = bindings(fakeBucket().bucket);
		harness.platform = { env };

		const first = platform.db();
		const second = platform.db();
		harness.platform = { env: { ...env, CAR_LOG_DB: {} as D1Database } };
		const other = platform.db();

		expect(second).toBe(first);
		expect(other).not.toBe(first);
	});

	it('stores, reads and removes photo bytes under the given key', async () => {
		const { platform } = await import('./cloudflare');
		const { objects, bucket } = fakeBucket();
		harness.platform = { env: bindings(bucket) };
		const data = new Uint8Array([1, 2, 3]).buffer;

		await platform.storage.write('user/repair/photo.png', data, 'image/png');

		expect(objects.get('user/repair/photo.png')).toEqual({ data, contentType: 'image/png' });
		expect(await platform.storage.read('user/repair/photo.png')).toEqual(new Uint8Array([1, 2, 3]));

		await platform.storage.remove('user/repair/photo.png');

		expect(await platform.storage.read('user/repair/photo.png')).toBeNull();
		await expect(platform.storage.remove('user/repair/photo.png')).resolves.toBeUndefined();
	});
});
