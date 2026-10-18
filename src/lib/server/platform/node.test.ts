import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let workdir: string;

beforeEach(async () => {
	workdir = await mkdtemp(join(tmpdir(), 'car-log-node-'));
	vi.spyOn(process, 'cwd').mockReturnValue(workdir);
	vi.stubEnv('DATABASE_URL', join(workdir, 'test.db'));
	vi.resetModules();
});

afterEach(async () => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
	await rm(workdir, { recursive: true, force: true });
});

describe('node platform storage', () => {
	it('round-trips bytes under the uploads directory', async () => {
		const { platform } = await import('./node');
		const data = new Uint8Array([7, 8, 9]).buffer;

		await platform.storage.write('user/repair/photo.png', data, 'image/png');

		expect(await readFile(join(workdir, 'uploads', 'user', 'repair', 'photo.png'))).toEqual(
			Buffer.from([7, 8, 9])
		);
		expect(await platform.storage.read('user/repair/photo.png')).toEqual(new Uint8Array([7, 8, 9]));

		await platform.storage.remove('user/repair/photo.png');

		expect(await platform.storage.read('user/repair/photo.png')).toBeNull();
		await expect(platform.storage.remove('user/repair/photo.png')).resolves.toBeUndefined();
	});

	it('refuses keys that escape the uploads directory', async () => {
		const { platform } = await import('./node');
		await writeFile(join(workdir, 'secret.txt'), 'nope');

		await expect(platform.storage.read('../secret.txt')).rejects.toThrow(/outside the uploads/);
		await expect(
			platform.storage.write('../escape.txt', new ArrayBuffer(1), 'text/plain')
		).rejects.toThrow(/outside the uploads/);
	});
});

describe('node platform batch', () => {
	it('applies all statements or none', async () => {
		const { platform } = await import('./node');
		const { users, cars } = await import('$lib/server/db/schema');
		const db = platform.db();
		const user = { id: 'u1', email: 'u1@example.com' };
		const car = { id: 'c1', userId: 'u1', brand: 'Skoda', model: 'Octavia', year: 2020 };

		await platform.batch([db.insert(users).values(user), db.insert(cars).values(car)]);

		expect(await db.select({ id: cars.id }).from(cars)).toEqual([{ id: 'c1' }]);

		await expect(
			platform.batch([
				db.insert(users).values({ id: 'u2', email: 'u2@example.com' }),
				// Violates the foreign key, so the user above must be rolled back too.
				db.insert(cars).values({ ...car, id: 'c2', userId: 'missing' })
			])
		).rejects.toThrow();

		expect(await db.select({ id: users.id }).from(users)).toEqual([{ id: 'u1' }]);
	});
});
