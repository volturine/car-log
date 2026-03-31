import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const hmrHost = process.env.HMR_HOST;
const hmrProtocol = (process.env.HMR_PROTOCOL as 'ws' | 'wss' | undefined) || 'ws';
const hmrClientPort = Number(process.env.HMR_CLIENT_PORT || '3000');

const hmr = hmrHost
	? {
			host: hmrHost,
			protocol: hmrProtocol,
			clientPort: hmrClientPort,
			port: 3000
		}
	: undefined;

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
