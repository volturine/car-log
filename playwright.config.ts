import { defineConfig, devices } from '@playwright/test';
import { getDevUrl, getPort } from './src/lib/server/env';

const port = getPort();
const baseURL = process.env.BETTER_AUTH_URL || getDevUrl();

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	webServer: {
		command: 'bun --env-file=.env.test run dev -- --strictPort',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120000,
		env: {
			...process.env,
			PORT: String(port)
		}
	}
});
