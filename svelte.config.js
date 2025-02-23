import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */


export default {
	kit: {
		adapter: adapter({
			// Enable static asset handling
			assets: true,
			nodeModules: 'copy',
			// Handle client-side routing
			fallback: 'index.html',
			precompress: false,
			strict: true
		})
	},
	preprocess: vitePreprocess()
};