/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	darkMode: 'class',
	theme: {
		extend: {
			colors: {
				grove: {
					50: '#f0fdf4',
					100: '#dcfce7',
					200: '#bbf7d0',
					300: '#86efac',
					400: '#4ade80',
					500: '#22c55e',
					600: '#16a34a',
					700: '#15803d',
					800: '#166534',
					900: '#14532d',
					950: '#052e16'
				},
				// Status colors for the clearing
				status: {
					operational: '#22c55e',      // Green
					degraded: '#eab308',         // Yellow
					partial: '#f97316',          // Orange
					major: '#ef4444',            // Red
					maintenance: '#3b82f6'       // Blue
				},
				cream: '#fefdfb',
				bark: '#3d2914'
			},
			fontFamily: {
				serif: ['Lexend', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
				sans: ['Lexend', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
			},
			typography: ({ theme }) => ({
				DEFAULT: {
					css: {
						'--tw-prose-body': 'var(--color-foreground-muted)',
						'--tw-prose-headings': 'var(--color-foreground)',
						'--tw-prose-links': 'var(--color-accent-text-muted)',
						a: {
							color: 'var(--color-accent-text-muted)',
							textDecoration: 'underline',
							'&:hover': {
								color: 'var(--color-primary)',
							},
						},
					},
				},
			}),
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
	]
};
