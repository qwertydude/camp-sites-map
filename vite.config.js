import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	envPrefix: 'PUBLIC_',
	server: {
		fs: {
			allow: [
				path.resolve(__dirname, 'static'),
			],
		}
	},
	base: '/camp-sites-map/'
});

