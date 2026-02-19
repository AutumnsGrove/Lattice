<script lang="ts">
	// ThemePreview.svelte
	// Live preview of a theme

	import type { Theme } from "../types.js";

	interface Props {
		theme: Theme;
		accentColor?: string;
	}

	let { theme, accentColor }: Props = $props();

	// Derive the effective accent color (override or theme default)
	const effectiveAccent = $derived(accentColor || theme.colors.accent);

	// Map spacing to actual pixel values
	const spacingMap = {
		compact: "0.75rem",
		comfortable: "1rem",
		spacious: "1.5rem",
	};
	const spacing = $derived(spacingMap[theme.layout.spacing]);

	// Derive inline styles for the preview container
	const containerStyles = $derived(
		`background-color: ${theme.colors.background}; ` +
			`color: ${theme.colors.foreground}; ` +
			`border: 1px solid ${theme.colors.border}; ` +
			`font-family: ${theme.fonts.body}; ` +
			`padding: ${spacing};`,
	);

	// Heading styles
	const headingStyles = $derived(
		`font-family: ${theme.fonts.heading}; ` +
			`color: ${theme.colors.foreground}; ` +
			`margin: 0 0 ${spacing} 0; ` +
			`font-size: 1.25rem; ` +
			`font-weight: 600; ` +
			`line-height: 1.3;`,
	);

	// Body text styles
	const bodyStyles = $derived(
		`font-family: ${theme.fonts.body}; ` +
			`color: ${theme.colors.foreground}; ` +
			`margin: 0 0 ${spacing} 0; ` +
			`font-size: 0.875rem; ` +
			`line-height: 1.6;`,
	);

	// Muted text styles
	const mutedStyles = $derived(
		`font-family: ${theme.fonts.body}; ` +
			`color: ${theme.colors.foregroundMuted}; ` +
			`font-size: 0.75rem; ` +
			`margin: 0 0 ${spacing} 0;`,
	);

	// Link/button styles
	const linkStyles = $derived(
		`color: ${effectiveAccent}; ` +
			`text-decoration: none; ` +
			`font-weight: 500; ` +
			`font-size: 0.875rem; ` +
			`transition: opacity 0.2s;`,
	);

	// Code block styles
	const codeStyles = $derived(
		`font-family: ${theme.fonts.mono}; ` +
			`background-color: ${theme.colors.surface}; ` +
			`color: ${theme.colors.foreground}; ` +
			`border: 1px solid ${theme.colors.border}; ` +
			`padding: calc(${spacing} * 0.5); ` +
			`border-radius: 4px; ` +
			`font-size: 0.75rem; ` +
			`margin: ${spacing} 0; ` +
			`display: block; ` +
			`overflow-x: auto;`,
	);

	// Surface card styles (for layering example)
	const surfaceStyles = $derived(
		`background-color: ${theme.colors.surface}; ` +
			`border: 1px solid ${theme.colors.border}; ` +
			`padding: calc(${spacing} * 0.75); ` +
			`border-radius: 6px; ` +
			`margin-top: ${spacing};`,
	);
</script>

<div class="theme-preview-wrapper">
	<div class="theme-preview-container" style={containerStyles}>
		<!-- Heading -->
		<h3 style={headingStyles}>Sample Blog Post</h3>

		<!-- Metadata -->
		<div style={mutedStyles}>Posted on December 19, 2025</div>

		<!-- Body text -->
		<p style={bodyStyles}>
			This is how your content will look with the {theme.name} theme. The typography, colors, and spacing
			combine to create a unique reading experience.
		</p>

		<!-- Link -->
		<a href="#preview" style={linkStyles} onclick={(e) => e.preventDefault()}> Read more → </a>

		<!-- Code block -->
		<code style={codeStyles}>const greeting = "Hello, Foliage!";</code>

		<!-- Surface card example -->
		<div style={surfaceStyles}>
			<div style={mutedStyles}>Featured Quote</div>
			<p style={bodyStyles} style:margin="0">
				"Make your blog feel like <em>yours</em>."
			</p>
		</div>
	</div>
</div>

<style>
	.theme-preview-wrapper {
		display: inline-block;
		width: 100%;
		max-width: 320px;
	}

	.theme-preview-container {
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		width: 100%;
		box-sizing: border-box;
	}

	/* Hover effect for link */
	.theme-preview-container a:hover {
		opacity: 0.8;
	}

	/* Ensure proper text rendering */
	.theme-preview-container {
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* Responsive behavior */
	@media (max-width: 360px) {
		.theme-preview-wrapper {
			max-width: 100%;
		}
	}
</style>
