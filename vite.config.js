import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	css: {
		postcss: {
			plugins: [require('autoprefixer')]
		}
	},
	envPrefix: 'PUBLIC_',
	server: {
    fs: {
      allow: [
        path.resolve(__dirname, 'static'),
      ],
    }
	}
});

