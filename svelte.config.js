import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Self-hosted Node builds are the default; DEPLOY_TARGET=cloudflare builds the Workers bundle.
const cloudflare = process.env.DEPLOY_TARGET === 'cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [vitePreprocess({ postcss: true })],
	vitePlugin: {
		dynamicCompileOptions: (opts) =>
			opts.filename.includes('node_modules') ? undefined : { runes: true }
	},
	kit: {
		adapter: cloudflare ? adapterCloudflare({ config: 'cf/wrangler.svelte.jsonc' }) : adapterNode(),
		alias: {
			// Database and photo storage for the target runtime; see src/lib/server/platform.
			$platform: cloudflare
				? './src/lib/server/platform/cloudflare.ts'
				: './src/lib/server/platform/node.ts'
		}
	}
};

export default config;
