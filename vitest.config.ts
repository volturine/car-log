import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { config as kitConfig } from './kit.config.ts';

export default defineConfig({
	plugins: [sveltekit(kitConfig)],
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts']
	}
});
