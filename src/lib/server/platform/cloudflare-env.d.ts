// @cloudflare/workers-types declares `cloudflare:workers` with `export =`,
// which TypeScript ignores under bundler module resolution, so declare the
// module here. The shape mirrors `CloudflareBindings` from ./types.ts.
declare module 'cloudflare:workers' {
	export const env: import('./types').CloudflareBindings;
}
