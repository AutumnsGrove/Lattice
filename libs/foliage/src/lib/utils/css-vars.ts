// src/lib/utils/css-vars.ts
// CSS variable generation utilities

import type { Theme, ThemeSettings, ThemeColors, ThemeFonts, ThemeLayout } from "../types.js";

/**
 * Map spacing values to CSS spacing scale
 */
function getSpacingValues(spacing: "compact" | "comfortable" | "spacious"): Record<string, string> {
	const spacingMap = {
		compact: {
			xs: "0.25rem",
			sm: "0.5rem",
			md: "0.75rem",
			lg: "1rem",
			xl: "1.5rem",
			"2xl": "2rem",
		},
		comfortable: {
			xs: "0.5rem",
			sm: "0.75rem",
			md: "1rem",
			lg: "1.5rem",
			xl: "2rem",
			"2xl": "3rem",
		},
		spacious: {
			xs: "0.75rem",
			sm: "1rem",
			md: "1.5rem",
			lg: "2rem",
			xl: "3rem",
			"2xl": "4rem",
		},
	};

	return spacingMap[spacing];
}

/**
 * Generate CSS custom properties from a theme
 */
export function generateThemeVariables(theme: Theme): string {
	const vars: string[] = [];

	// Color variables
	vars.push(`--color-background: ${theme.colors.background};`);
	vars.push(`--color-surface: ${theme.colors.surface};`);
	vars.push(`--color-foreground: ${theme.colors.foreground};`);
	vars.push(`--color-foreground-muted: ${theme.colors.foregroundMuted};`);
	vars.push(`--color-accent: ${theme.colors.accent};`);
	vars.push(`--color-border: ${theme.colors.border};`);

	// Generate accent variations
	const accentVars = generateAccentVariations(theme.colors.accent);
	Object.entries(accentVars).forEach(([key, value]) => {
		if (key !== "--accent-color") {
			// Skip base accent-color as we already set it above
			vars.push(`${key}: ${value};`);
		}
	});

	// Font variables
	vars.push(`--font-heading: ${theme.fonts.heading};`);
	vars.push(`--font-body: ${theme.fonts.body};`);
	vars.push(`--font-mono: ${theme.fonts.mono};`);

	// Layout variables
	vars.push(`--max-width: ${theme.layout.maxWidth};`);

	// Spacing variables
	const spacing = getSpacingValues(theme.layout.spacing);
	Object.entries(spacing).forEach(([key, value]) => {
		vars.push(`--spacing-${key}: ${value};`);
	});

	return `:root {\n  ${vars.join("\n  ")}\n}`;
}

/**
 * Generate CSS custom properties from theme settings (with overrides)
 */
export function generateSettingsVariables(settings: ThemeSettings, baseTheme: Theme): string {
	const vars: string[] = [];

	// Merge colors with custom overrides
	const colors: ThemeColors = {
		...baseTheme.colors,
		...settings.customColors,
		// Always override accent with settings.accentColor
		accent: settings.accentColor,
	};

	// Color variables
	vars.push(`--color-background: ${colors.background};`);
	vars.push(`--color-surface: ${colors.surface};`);
	vars.push(`--color-foreground: ${colors.foreground};`);
	vars.push(`--color-foreground-muted: ${colors.foregroundMuted};`);
	vars.push(`--color-accent: ${colors.accent};`);
	vars.push(`--color-border: ${colors.border};`);

	// Generate accent variations
	const accentVars = generateAccentVariations(settings.accentColor);
	Object.entries(accentVars).forEach(([key, value]) => {
		if (key !== "--accent-color") {
			vars.push(`${key}: ${value};`);
		}
	});

	// Merge fonts with custom typography
	const fonts: ThemeFonts = {
		...baseTheme.fonts,
		...settings.customTypography,
	};

	// Font variables
	vars.push(`--font-heading: ${fonts.heading};`);
	vars.push(`--font-body: ${fonts.body};`);
	vars.push(`--font-mono: ${fonts.mono};`);

	// Merge layout with custom layout
	const layout: ThemeLayout = {
		...baseTheme.layout,
		...settings.customLayout,
	};

	// Layout variables
	vars.push(`--max-width: ${layout.maxWidth};`);

	// Spacing variables
	const spacing = getSpacingValues(layout.spacing);
	Object.entries(spacing).forEach(([key, value]) => {
		vars.push(`--spacing-${key}: ${value};`);
	});

	return `:root {\n  ${vars.join("\n  ")}\n}`;
}

/**
 * Apply theme variables to a DOM element (typically :root)
 */
export function applyThemeVariables(settings: ThemeSettings): void {
	// Check for browser environment
	if (typeof window === "undefined" || typeof document === "undefined") {
		return;
	}

	// We need the base theme to merge with settings
	// For now, we'll directly apply the settings to document.documentElement
	const root = document.documentElement;

	// Apply accent color
	root.style.setProperty("--color-accent", settings.accentColor);

	// Generate and apply accent variations
	const accentVars = generateAccentVariations(settings.accentColor);
	Object.entries(accentVars).forEach(([key, value]) => {
		root.style.setProperty(key, value);
	});

	// Apply custom color overrides
	if (settings.customColors) {
		if (settings.customColors.background) {
			root.style.setProperty("--color-background", settings.customColors.background);
		}
		if (settings.customColors.surface) {
			root.style.setProperty("--color-surface", settings.customColors.surface);
		}
		if (settings.customColors.foreground) {
			root.style.setProperty("--color-foreground", settings.customColors.foreground);
		}
		if (settings.customColors.foregroundMuted) {
			root.style.setProperty("--color-foreground-muted", settings.customColors.foregroundMuted);
		}
		if (settings.customColors.border) {
			root.style.setProperty("--color-border", settings.customColors.border);
		}
	}

	// Apply custom typography overrides
	if (settings.customTypography) {
		if (settings.customTypography.heading) {
			root.style.setProperty("--font-heading", settings.customTypography.heading);
		}
		if (settings.customTypography.body) {
			root.style.setProperty("--font-body", settings.customTypography.body);
		}
		if (settings.customTypography.mono) {
			root.style.setProperty("--font-mono", settings.customTypography.mono);
		}
	}

	// Apply custom layout overrides
	if (settings.customLayout) {
		if (settings.customLayout.maxWidth) {
			root.style.setProperty("--max-width", settings.customLayout.maxWidth);
		}
		if (settings.customLayout.spacing) {
			const spacing = getSpacingValues(settings.customLayout.spacing);
			Object.entries(spacing).forEach(([key, value]) => {
				root.style.setProperty(`--spacing-${key}`, value);
			});
		}
	}
}

/**
 * Generate accent color variations using color-mix
 */
export function generateAccentVariations(accentColor: string): Record<string, string> {
	return {
		"--accent-color": accentColor,
		"--accent-color-light": `color-mix(in srgb, ${accentColor} 80%, white 20%)`,
		"--accent-color-dark": `color-mix(in srgb, ${accentColor} 80%, black 20%)`,
		"--accent-color-hover": `color-mix(in srgb, ${accentColor} 90%, black 10%)`,
		"--accent-color-muted": `color-mix(in srgb, ${accentColor} 60%, ${accentColor} 40%)`,
	};
}
