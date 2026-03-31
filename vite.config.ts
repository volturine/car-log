import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function getHmrProtocol(value: string | undefined): 'ws' | 'wss' {
	if (value === 'wss') return 'wss';
	return 'ws';
}

const hmrHost = process.env.HMR_HOST;
const hmrClientPort = Number(process.env.HMR_CLIENT_PORT || '3000');
const hmr =
	hmrHost === undefined
		? undefined
		: {
				host: hmrHost,
				protocol: getHmrProtocol(process.env.HMR_PROTOCOL),
				clientPort: hmrClientPort,
				port: 3000
			};

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json,xml}']
			},
			manifest: {
				name: 'Car Repair Log',
				short_name: 'CarLog',
				description: 'Track and manage car repairs',
				start_url: '/',
				display: 'standalone',
				background_color: '#ffffff',
				theme_color: '#6aaa64',
				orientation: 'portrait-primary',
				scope: '/',
				id: '/?source=pwa',
				lang: 'en',
				dir: 'ltr',
				categories: ['utilities', 'productivity'],
				icons: []
			}
		})
	],
	server: {
		host: '0.0.0.0',
		port: 3000,
		allowedHosts: ['localhost', 'code-server.bee-justice.ts.net'],
		...(hmr ? { hmr } : {})
	}
});
