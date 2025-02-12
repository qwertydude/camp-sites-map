import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';


export default defineConfig({
	plugins: [sveltekit()],
	envPrefix: 'PUBLIC_',
	server: {
    fs: {
      allow: [
        path.resolve(__dirname, 'static'),
      ],
    }
	}

});