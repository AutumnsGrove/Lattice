/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// Include engine package components for Tailwind to scan
		'../packages/engine/src/lib/**/*.{html,js,svelte,ts}'
	],
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
						'--tw-prose-lead': 'var(--color-foreground-muted)',
						'--tw-prose-links': 'var(--color-accent-text-muted)',
						'--tw-prose-bold': 'var(--color-foreground)',
						'--tw-prose-counters': 'var(--color-foreground-subtle)',
						'--tw-prose-bullets': 'var(--color-foreground-subtle)',
						'--tw-prose-hr': 'var(--color-border)',
						'--tw-prose-quotes': 'var(--color-foreground)',
						'--tw-prose-quote-borders': 'var(--color-accent-border)',
						'--tw-prose-captions': 'var(--color-foreground-subtle)',
						'--tw-prose-code': 'var(--color-foreground)',
						'--tw-prose-pre-code': 'var(--color-foreground)',
						'--tw-prose-pre-bg': 'var(--color-surface)',
						'--tw-prose-th-borders': 'var(--color-border)',
						'--tw-prose-td-borders': 'var(--color-border-subtle)',
						// Links
						a: {
							color: 'var(--color-accent-text-muted)',
							textDecoration: 'underline',
							'&:hover': {
								color: 'var(--color-primary)',
							},
						},
						// Headings
						h1: {
							color: 'var(--color-foreground)',
						},
						h2: {
							color: 'var(--color-foreground)',
						},
						h3: {
							color: 'var(--color-foreground)',
						},
						h4: {
							color: 'var(--color-foreground)',
						},
						// Strong/bold
						strong: {
							color: 'var(--color-foreground)',
						},
						// Code blocks
						code: {
							color: 'var(--color-foreground)',
							backgroundColor: 'var(--color-surface)',
							borderRadius: '0.25rem',
							padding: '0.125rem 0.25rem',
						},
						'code::before': {
							content: '""',
						},
						'code::after': {
							content: '""',
						},
						// Pre blocks
						pre: {
							backgroundColor: 'var(--color-surface)',
							color: 'var(--color-foreground)',
						},
						// Blockquotes
						blockquote: {
							borderLeftColor: 'var(--color-accent-border)',
							color: 'var(--color-foreground-muted)',
						},
						// Horizontal rules
						hr: {
							borderColor: 'var(--color-border)',
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
