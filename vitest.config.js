import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte()],
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,ts}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html']
        },
        server: {
            deps: {
                inline: [/^@supabase\/supabase-js/]
            }
        },
        deps: {
            optimizer: {
                web: {
                    include: ['@supabase/supabase-js']
                }
            }
        },
        environmentOptions: {
            jsdom: {
                url: 'http://localhost:3000'
            }
        }
    }
});
