/**
 * Gossamer - ASCII Visual Effects Library
 *
 * Threads of light. Delicate textures woven through your space.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Core configuration for ASCII rendering
 */
export interface GossamerConfig {
	/** Character set for ASCII rendering (light to dark) */
	characters?: string;
	/** Cell width in pixels */
	cellWidth?: number;
	/** Cell height in pixels */
	cellHeight?: number;
	/** Foreground color */
	color?: string;
	/** Background color (transparent if not set) */
	backgroundColor?: string;
	/** Font family for ASCII characters */
	fontFamily?: string;
	/** Enable animation loop */
	animate?: boolean;
	/** Target FPS for animation */
	fps?: number;
}

/**
 * Preset configuration for effects
 */
export interface PresetConfig {
	/** Preset display name */
	name: string;
	/** Preset description */
	description: string;
	/** Character set */
	characters: string;
	/** Pattern type */
	pattern:
		| "perlin"
		| "waves"
		| "static"
		| "ripple"
		| "fbm"
		| "clouds"
		| "plasma"
		| "vortex"
		| "matrix"
		| "gradient"
		| "diamond"
		| "fractal";
	/** Pattern frequency */
	frequency: number;
	/** Pattern amplitude */
	amplitude: number;
	/** Animation speed */
	speed: number;
	/** Default opacity */
	opacity: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default character set ordered from light to dark
 */
export const DEFAULT_CHARACTERS = " .:-=+*#%@";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<GossamerConfig> = {
	characters: DEFAULT_CHARACTERS,
	cellWidth: 8,
	cellHeight: 12,
	color: "#ffffff",
	backgroundColor: "",
	fontFamily: "monospace",
	animate: false,
	fps: 30,
};

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate brightness from RGB values using luminance formula
 * Uses the standard luminance coefficients: 0.21 R + 0.72 G + 0.07 B
 */
export function calculateBrightness(r: number, g: number, b: number): number {
	return 0.21 * r + 0.72 * g + 0.07 * b;
}

/**
 * Map a brightness value (0-255) to an ASCII character
 */
export function brightnessToChar(
	brightness: number,
	characters: string = DEFAULT_CHARACTERS,
): string {
	const index = Math.floor((brightness / 255) * (characters.length - 1));
	return characters[Math.min(index, characters.length - 1)];
}

// =============================================================================
// Module Exports
// =============================================================================

// Renderer
export { GossamerRenderer } from "./renderer";
export type { RenderConfig } from "./renderer";

// Patterns
export {
	// Core noise functions
	perlinNoise2D,
	fbmNoise,
	staticNoise,
	seededNoise2D,
	// Pattern generators
	wavePattern,
	ripplePattern,
	cloudsPattern,
	plasmaPattern,
	vortexPattern,
	matrixPattern,
	gradientPattern,
	diamondPattern,
	fractalPattern,
	// Grid generation (legacy API)
	generateBrightnessGrid,
	gridToImageData,
	// Performance-optimized API
	createBrightnessBuffer,
	fillBrightnessBuffer,
	getBufferValue,
	// Config
	DEFAULT_PATTERN_CONFIG,
} from "./patterns";
export type { PatternConfig, PatternType, BrightnessBuffer } from "./patterns";

// Characters
export {
	CHARACTER_SETS,
	getCharacterSet,
	getCharacters,
	getCharacterSetNames,
	createCharacterSet,
	validateCharacterSet,
	invertCharacters,
} from "./characters";
export type { CharacterSet } from "./characters";

// Colors (Grove palette)
export {
	GROVE_GREEN,
	CREAM,
	BARK,
	STATUS,
	GROVE_COLORS,
	GLASS_SCHEMES,
	getGroveColor,
	getGlassScheme,
	getGroveColorNames,
	getGlassSchemeNames,
	hexToRgba,
} from "./colors";
export type { ColorDef, GroveColorName, GlassSchemeName } from "./colors";

// Animation
export { createAnimationLoop, throttle, debounce, calculateFPS, easings } from "./animation";
export type { AnimationState, AnimationOptions, EasingFunction } from "./animation";

// Canvas Utilities
export {
	createCanvas,
	getDevicePixelRatio,
	resizeCanvasToContainer,
	createOffscreenCanvas,
	clearCanvas,
	getImageData,
	optimizeContext,
	setupTextRendering,
	measureTextWidth,
	calculateCellSize,
	setBlendMode,
} from "./utils/canvas";
export type { CanvasOptions } from "./utils/canvas";

// Image Utilities
export {
	loadImage,
	loadAndScaleImage,
	imageToPixelData,
	extractBrightness,
	sampleImageCells,
	rgbToHex,
	hexToRgb,
	adjustBrightness,
	adjustContrast,
	invertColors,
	toGrayscale,
} from "./utils/image";
export type { ImageLoadOptions } from "./utils/image";

// Performance Utilities
export {
	createVisibilityObserver,
	createResizeObserver,
	prefersReducedMotion,
	onReducedMotionChange,
	isLowPowerMode,
	getRecommendedFPS,
	createFPSCounter,
	requestIdleCallback,
	cancelIdleCallback,
	isBrowser,
	isCanvasSupported,
	isOffscreenCanvasSupported,
} from "./utils/performance";
export type { VisibilityCallback, PerformanceMetrics } from "./utils/performance";

// =============================================================================
// Version
// =============================================================================

/**
 * Gossamer version
 */
export const VERSION = "0.1.0";
