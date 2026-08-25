import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { getPort } from './src/lib/server/env.ts';

function getHmrProtocol(value: string | undefined): 'ws' | 'wss' {
	if (value === 'wss') return 'wss';
	return 'ws';
}

const hmrHost = process.env.HMR_HOST;
const port = getPort();
const hmrClientPort = getPort(process.env.HMR_CLIENT_PORT ?? String(port));
const hmr =
	hmrHost === undefined
		? undefined
		: {
				host: hmrHost,
				protocol: getHmrProtocol(process.env.HMR_PROTOCOL),
				clientPort: hmrClientPort,
				port
			};

export default defineConfig({
	plugins: [
		tailwindcss(),
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
				icons: [
					{ src: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
					{ src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
					{ src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
					{ src: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
					{ src: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
					{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
					{ src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
					{
						src: '/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			}
		})
	],
	server: {
		host: '0.0.0.0',
		port,
		allowedHosts: ['localhost', 'code-server.bee-justice.ts.net'],
		...(hmr ? { hmr } : {})
	}
});
