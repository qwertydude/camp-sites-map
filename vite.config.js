import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	envPrefix: 'PUBLIC_',
  build: {
    outDir: 'dist'
  },
	server: {
    fs: {
      allow: [
        path.resolve(__dirname, 'static'),
      ],
    }
	}
});

