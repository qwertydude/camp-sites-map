import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

import path from 'path';


export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
  ],
	envPrefix: 'PUBLIC_',
	server: {
    fs: {
      allow: [
        path.resolve(__dirname, 'static'),
      ],
    }
	}

});

