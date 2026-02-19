/**
 * Canvas Utilities
 *
 * Helper functions for canvas creation, setup, and manipulation.
 */

/**
 * Options for canvas creation
 */
export interface CanvasOptions {
	/** Canvas width in pixels */
	width?: number;
	/** Canvas height in pixels */
	height?: number;
	/** Whether to use high DPI scaling */
	highDPI?: boolean;
	/** CSS class to add to canvas */
	className?: string;
	/** Inline styles to apply */
	style?: Partial<CSSStyleDeclaration>;
}

/**
 * Create a canvas element with optimal settings
 */
export function createCanvas(options: CanvasOptions = {}): HTMLCanvasElement {
	const { width = 300, height = 150, highDPI = true, className, style } = options;

	const canvas = document.createElement("canvas");

	if (highDPI) {
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
		}
	} else {
		canvas.width = width;
		canvas.height = height;
	}

	if (className) {
		canvas.className = className;
	}

	if (style) {
		Object.assign(canvas.style, style);
	}

	return canvas;
}

/**
 * Get the device pixel ratio
 */
export function getDevicePixelRatio(): number {
	return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
}

/**
 * Resize canvas to match container dimensions
 */
export function resizeCanvasToContainer(
	canvas: HTMLCanvasElement,
	container: HTMLElement,
	highDPI: boolean = true,
): { width: number; height: number } {
	const rect = container.getBoundingClientRect();
	const dpr = highDPI ? getDevicePixelRatio() : 1;

	const width = rect.width;
	const height = rect.height;

	canvas.width = width * dpr;
	canvas.height = height * dpr;
	canvas.style.width = `${width}px`;
	canvas.style.height = `${height}px`;

	if (highDPI) {
		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.scale(dpr, dpr);
		}
	}

	return { width, height };
}

/**
 * Create an offscreen canvas for buffer rendering
 */
export function createOffscreenCanvas(
	width: number,
	height: number,
): HTMLCanvasElement | OffscreenCanvas {
	if (typeof OffscreenCanvas !== "undefined") {
		return new OffscreenCanvas(width, height);
	}

	// Fallback for environments without OffscreenCanvas
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Clear a canvas
 */
export function clearCanvas(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	width: number,
	height: number,
	backgroundColor?: string,
): void {
	if (backgroundColor) {
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, width, height);
	} else {
		ctx.clearRect(0, 0, width, height);
	}
}

/**
 * Get image data from a canvas region
 */
export function getImageData(
	ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number = 0,
	y: number = 0,
	width?: number,
	height?: number,
): ImageData {
	const canvas = ctx.canvas;
	const w = width ?? canvas.width;
	const h = height ?? canvas.height;

	return ctx.getImageData(x, y, w, h);
}

/**
 * Set optimal rendering context settings
 */
export function optimizeContext(ctx: CanvasRenderingContext2D): void {
	// Disable image smoothing for crisp ASCII rendering
	ctx.imageSmoothingEnabled = false;

	// Use source-over for standard compositing
	ctx.globalCompositeOperation = "source-over";
}

/**
 * Set text rendering options for ASCII display
 */
export function setupTextRendering(
	ctx: CanvasRenderingContext2D,
	fontSize: number,
	fontFamily: string = "monospace",
	color: string = "#ffffff",
): void {
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.textBaseline = "top";
	ctx.textAlign = "left";
	ctx.fillStyle = color;
}

/**
 * Measure text width for a given font configuration
 */
export function measureTextWidth(
	ctx: CanvasRenderingContext2D,
	text: string,
	fontSize: number,
	fontFamily: string = "monospace",
): number {
	const originalFont = ctx.font;
	ctx.font = `${fontSize}px ${fontFamily}`;
	const metrics = ctx.measureText(text);
	ctx.font = originalFont;
	return metrics.width;
}

/**
 * Calculate optimal cell size for a given canvas and desired columns
 */
export function calculateCellSize(
	canvasWidth: number,
	canvasHeight: number,
	targetCols: number,
): { cellWidth: number; cellHeight: number; cols: number; rows: number } {
	const cellWidth = Math.floor(canvasWidth / targetCols);
	// Use a typical monospace aspect ratio of ~0.6
	const cellHeight = Math.floor(cellWidth * 1.5);
	const cols = Math.floor(canvasWidth / cellWidth);
	const rows = Math.floor(canvasHeight / cellHeight);

	return { cellWidth, cellHeight, cols, rows };
}

/**
 * Apply a CSS blend mode to canvas compositing
 */
export function setBlendMode(
	ctx: CanvasRenderingContext2D,
	mode:
		| "normal"
		| "multiply"
		| "screen"
		| "overlay"
		| "darken"
		| "lighten"
		| "color-dodge"
		| "color-burn"
		| "soft-light"
		| "hard-light"
		| "difference"
		| "exclusion",
): void {
	ctx.globalCompositeOperation = mode === "normal" ? "source-over" : mode;
}
