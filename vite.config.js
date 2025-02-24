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
	build: {
		outDir: 'build',
		chunkSizeWarningLimit: 1000, // Increase limit
    rollupOptions: {
      output: {
				manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
				}
      }
    }
	},
	base: '/camp-sites-map/'
});

