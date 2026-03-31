import { afterEach, describe, expect, it, vi } from 'vitest';

describe('server env helpers', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('uses PORT for the dev url fallback', async () => {
		vi.stubEnv('PORT', '4173');
		const { getDevUrl } = await import('./env');

		expect(getDevUrl()).toBe('http://localhost:4173');
	});

	it('uses DATABASE_URL when present', async () => {
		vi.stubEnv('DATABASE_URL', './sqlite.test.db');
		const { getDatabaseUrl, getDatabasePath } = await import('./env');

		expect(getDatabaseUrl()).toBe('./sqlite.test.db');
		expect(getDatabasePath()).toBe(`${process.cwd()}/sqlite.test.db`);
	});

	it('falls back to the default sqlite database path', async () => {
		vi.stubEnv('DATABASE_URL', '');
		const { getDatabaseUrl, getDatabasePath } = await import('./env');

		expect(getDatabaseUrl()).toBe('./sqlite.db');
		expect(getDatabasePath()).toBe(`${process.cwd()}/sqlite.db`);
	});
});
