/**
 * Shared types for UI components
 */

/** Glass effect variants for glassmorphism components */
export type GlassVariant =
	| "default"   // Light translucent - uses seasonal color or white/emerald
	| "accent"    // Accent-colored glass
	| "frosted"   // Strong frosted effect, more opaque
	| "dark"      // Dark translucent for light backgrounds
	| "ethereal"; // Dreamy, highly transparent with glow
