import grovePreset from '../engine/src/lib/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
	presets: [grovePreset],
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		// Include engine package components for Tailwind to scan
		'../engine/src/lib/**/*.{html,js,svelte,ts}'
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
				bark: '#3d2914',
				// Domain-specific accent colors (purple for admin features)
				domain: {
					50: '#f5f3ff',
					100: '#ede9fe',
					200: '#ddd6fe',
					300: '#c4b5fd',
					400: '#a78bfa',
					500: '#8b5cf6',
					600: '#7c3aed',
					700: '#6d28d9',
					800: '#5b21b6',
					900: '#4c1d95',
					950: '#2e1065'
				},
				// Forage brand colors (teal - for the search/discovery aesthetic)
				forage: {
					50: '#f0fdfa',
					100: '#ccfbf1',
					200: '#99f6e4',
					300: '#5eead4',
					400: '#2dd4bf',
					500: '#14b8a6',
					600: '#0d9488',
					700: '#0f766e',
					800: '#115e59',
					900: '#134e4a',
					950: '#042f2e'
				},
				// Neutral palette for dark mode and glass effects
				neutral: {
					50: '#fafaf9',
					100: '#f5f5f4',
					200: '#e7e5e4',
					300: '#d6d3d1',
					400: '#a8a29e',
					500: '#78716c',
					600: '#57534e',
					700: '#44403c',
					800: '#292524',
					900: '#1c1917',
					950: '#0c0a09'
				}
			},
			fontFamily: {
				serif: ['Lexend', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
				sans: ['Lexend', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
				mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace']
			}
		}
	},
	plugins: []
};
