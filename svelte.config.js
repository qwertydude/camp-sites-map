import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */


export default {
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['/api/*']
			},
			strict: true
		})
	},
	preprocess: vitePreprocess()
};