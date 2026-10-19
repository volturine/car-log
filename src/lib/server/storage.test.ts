import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
	write: vi.fn(async (_key: string, _data: ArrayBuffer, _type: string) => undefined),
	read: vi.fn(async () => null),
	remove: vi.fn(async (_key: string) => undefined)
}));

vi.mock('$platform', () => ({
	platform: { storage: fake }
}));

const userId = 'BJqazJf6MjruKzGlFBiOhACrXH5AYNVt';
const repairId = '66666666-7777-4888-9999-aaaaaaaaaaaa';

describe('photo object keys', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('nests the file under the owner and repair with a sanitised extension', async () => {
		const { buildObjectKey } = await import('./storage');

		const key = buildObjectKey('my photo.JpG', userId, repairId);

		expect(key.path).toBe(`${userId}/${repairId}/${key.filename}`);
		expect(key.filename).toMatch(/^\d+-[0-9a-f]{32}\.jpg$/);
	});

	it('strips path characters out of the extension', async () => {
		const { buildObjectKey } = await import('./storage');

		const key = buildObjectKey('x.../../etc', userId, repairId);

		expect(key.filename).toMatch(/\.etc$/);
		expect(key.path.split('/')).toHaveLength(3);
	});

	it('rejects ids that could leave their directory', async () => {
		const { buildObjectKey } = await import('./storage');

		expect(() => buildObjectKey('a.png', '../escape', repairId)).toThrow(/Invalid userId/);
		expect(() => buildObjectKey('a.png', 'user/other', repairId)).toThrow(/Invalid userId/);
		expect(() => buildObjectKey('a.png', '', repairId)).toThrow(/Invalid userId/);
		expect(() => buildObjectKey('a.png', userId, 'repair')).toThrow(/Invalid userId/);
		expect(() => buildObjectKey('a.png', userId, '..')).toThrow(/Invalid userId/);
	});

	it('writes uploads through the platform storage with their content type', async () => {
		const { saveFile } = await import('./storage');
		const file = new File([new Uint8Array([1, 2])], 'photo.png', { type: 'image/png' });

		const saved = await saveFile(file, userId, repairId);

		expect(fake.write).toHaveBeenCalledTimes(1);
		const [path, data, contentType] = fake.write.mock.calls[0];
		expect(path).toBe(saved.path);
		expect(new Uint8Array(data)).toEqual(new Uint8Array([1, 2]));
		expect(contentType).toBe('image/png');
	});

	it('removes partial bytes when a storage write fails', async () => {
		const { saveFile } = await import('./storage');
		const failure = new Error('Partial write');
		fake.write.mockRejectedValueOnce(failure);

		await expect(
			saveFile(new File(['image'], 'photo.png', { type: 'image/png' }), userId, repairId)
		).rejects.toBe(failure);
		expect(fake.remove).toHaveBeenCalledWith(fake.write.mock.calls[0][0]);
	});
});
