import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: !process.env.VITEST })],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		alias: {
			$lib: '/src/lib'
		}
	},
	resolve: {
		// Ensure Svelte resolves to client-side code in tests
		conditions: ['browser', 'svelte']
	}
});
