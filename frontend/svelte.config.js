import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
	preprocess: [vitePreprocess({ postcss: true })],

	kit: {
		adapter: adapter(),

		// Ensure the app is served from the root path
		paths: {
			base: ''
		}
	}
};
