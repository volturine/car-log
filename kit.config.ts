import adapterCloudflare from '@sveltejs/adapter-cloudflare';
import adapterNode from '@sveltejs/adapter-node';
import type { Config } from '@sveltejs/kit/vite';

// Self-hosted Node builds are the default; DEPLOY_TARGET=cloudflare builds the Workers bundle.
const cloudflare = process.env.DEPLOY_TARGET === 'cloudflare';

/**
 * SvelteKit 3 reads configuration from the `sveltekit()` plugin in the Vite
 * config, so this object is shared by vite.config.ts and vitest.config.ts.
 */
export const config: Config = {
	adapter: cloudflare ? adapterCloudflare({ config: 'cf/wrangler.svelte.jsonc' }) : adapterNode(),
	alias: {
		// `$lib` is no longer auto-configured in Kit 3; the `#lib` subpath-imports
		// migration is left to a dedicated refactor.
		$lib: './src/lib',
		// Database and photo storage for the target runtime; see src/lib/server/platform.
		$platform: cloudflare
			? './src/lib/server/platform/cloudflare.ts'
			: './src/lib/server/platform/node.ts'
	},
	dynamicCompileOptions: (data) =>
		data.filename.includes('node_modules') ? undefined : { runes: true }
};
