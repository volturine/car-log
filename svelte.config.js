import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess({ postcss: true })],
	vitePlugin: {
		dynamicCompileOptions: (opts) =>
			opts.filename.includes('node_modules') ? undefined : { runes: true }
	},
	kit: {
		adapter: adapter()
	}
};

export default config;
