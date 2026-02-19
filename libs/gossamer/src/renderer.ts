/**
 * Gossamer Core Renderer
 *
 * Canvas-based ASCII rendering engine. Converts image data to ASCII characters
 * by mapping brightness values to a character set.
 */

// Define locally to avoid circular dependency with index.ts
const DEFAULT_CHARACTERS = " .:-=+*#%@";

function calculateBrightness(r: number, g: number, b: number): number {
	return 0.21 * r + 0.72 * g + 0.07 * b;
}

/**
 * Configuration for the Gossamer renderer
 */
export interface RenderConfig {
	/** Canvas element to render to */
	canvas: HTMLCanvasElement;
	/** Character set ordered from light to dark */
	characters: string;
	/** Width of each character cell in pixels */
	cellWidth: number;
	/** Height of each character cell in pixels */
	cellHeight: number;
	/** Color for rendering characters */
	color: string;
	/** Background color (empty string for transparent) */
	backgroundColor: string;
	/** Font family */
	fontFamily: string;
	/** Custom brightness calculation function */
	brightnessFunction: (r: number, g: number, b: number) => number;
}

/**
 * Default render configuration
 */
const DEFAULT_RENDER_CONFIG: Omit<RenderConfig, "canvas"> = {
	characters: DEFAULT_CHARACTERS,
	cellWidth: 8,
	cellHeight: 12,
	color: "#ffffff",
	backgroundColor: "",
	fontFamily: "monospace",
	brightnessFunction: calculateBrightness,
};

/**
 * Core ASCII renderer class
 *
 * Handles all canvas rendering operations for ASCII effects.
 * Supports both static rendering and animation loops.
 */
export class GossamerRenderer {
	private ctx: CanvasRenderingContext2D;
	private config: RenderConfig;
	private animationId: number | null = null;
	private lastFrameTime: number = 0;
	private isRunning: boolean = false;

	// Performance: Character texture atlas
	private charAtlas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private atlasCharacters: string = "";

	constructor(canvas: HTMLCanvasElement, config: Partial<Omit<RenderConfig, "canvas">> = {}) {
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("Failed to get 2D rendering context");
		}

		this.ctx = context;
		this.config = {
			canvas,
			...DEFAULT_RENDER_CONFIG,
			...config,
		};

		this.setupCanvas();
		this.buildCharacterAtlas();
	}

	/**
	 * Build character texture atlas for fast rendering
	 * Pre-renders all characters to an offscreen canvas, then uses drawImage
	 * instead of fillText for 5-10x faster rendering
	 */
	private buildCharacterAtlas(): void {
		const { characters, cellWidth, cellHeight, color, fontFamily } = this.config;

		// Skip if atlas already built with same characters
		if (this.atlasCharacters === characters && this.charAtlas) {
			return;
		}

		// Create offscreen canvas (use OffscreenCanvas if available for better perf)
		const atlasWidth = characters.length * cellWidth;
		const atlasHeight = cellHeight;

		if (typeof OffscreenCanvas !== "undefined") {
			this.charAtlas = new OffscreenCanvas(atlasWidth, atlasHeight);
		} else {
			this.charAtlas = document.createElement("canvas");
			this.charAtlas.width = atlasWidth;
			this.charAtlas.height = atlasHeight;
		}

		const ctx = this.charAtlas.getContext("2d");
		if (!ctx) {
			this.charAtlas = null;
			return;
		}

		// Clear with transparent background
		ctx.clearRect(0, 0, atlasWidth, atlasHeight);

		// Render each character
		ctx.fillStyle = color;
		ctx.font = `${cellHeight}px ${fontFamily}`;
		ctx.textBaseline = "top";

		for (let i = 0; i < characters.length; i++) {
			const char = characters[i];
			if (char !== " ") {
				ctx.fillText(char, i * cellWidth, 0);
			}
		}

		this.atlasCharacters = characters;
	}

	/**
	 * Set up the canvas with optimal rendering settings
	 */
	private setupCanvas(): void {
		const { fontFamily, cellHeight } = this.config;

		// Set font for consistent character sizing
		this.ctx.font = `${cellHeight}px ${fontFamily}`;
		this.ctx.textBaseline = "top";

		// Enable image smoothing for better quality
		this.ctx.imageSmoothingEnabled = true;
		this.ctx.imageSmoothingQuality = "high";
	}

	/**
	 * Update the renderer configuration
	 */
	updateConfig(config: Partial<Omit<RenderConfig, "canvas">>): void {
		const needsAtlasRebuild =
			config.characters !== undefined ||
			config.color !== undefined ||
			config.cellWidth !== undefined ||
			config.cellHeight !== undefined ||
			config.fontFamily !== undefined;

		this.config = { ...this.config, ...config };
		this.setupCanvas();

		if (needsAtlasRebuild) {
			this.atlasCharacters = ""; // Force rebuild
			this.buildCharacterAtlas();
		}
	}

	/**
	 * Resize the canvas to match new dimensions
	 */
	resize(width: number, height: number): void {
		const { canvas } = this.config;
		canvas.width = width;
		canvas.height = height;
		this.setupCanvas();
	}

	/**
	 * Get the current canvas dimensions
	 */
	getDimensions(): { width: number; height: number } {
		return {
			width: this.config.canvas.width,
			height: this.config.canvas.height,
		};
	}

	/**
	 * Calculate the number of cells that fit in the canvas
	 */
	getCellCount(): { cols: number; rows: number } {
		const { width, height } = this.getDimensions();
		const { cellWidth, cellHeight } = this.config;

		return {
			cols: Math.ceil(width / cellWidth),
			rows: Math.ceil(height / cellHeight),
		};
	}

	/**
	 * Clear the canvas
	 */
	clear(): void {
		const { canvas, backgroundColor } = this.config;

		if (backgroundColor) {
			this.ctx.fillStyle = backgroundColor;
			this.ctx.fillRect(0, 0, canvas.width, canvas.height);
		} else {
			this.ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	/**
	 * Render a single frame from image data
	 */
	renderFrame(imageData: ImageData): void {
		const { canvas, characters, cellWidth, cellHeight, color, brightnessFunction } = this.config;
		const { width, data } = imageData;

		this.clear();
		this.ctx.fillStyle = color;

		for (let y = 0; y < canvas.height; y += cellHeight) {
			for (let x = 0; x < canvas.width; x += cellWidth) {
				const brightness = this.getCellBrightness(
					data,
					x,
					y,
					width,
					cellWidth,
					cellHeight,
					brightnessFunction,
				);
				const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
				const char = characters[Math.min(charIndex, characters.length - 1)];

				if (char !== " ") {
					this.ctx.fillText(char, x, y);
				}
			}
		}
	}

	/**
	 * Render ASCII from a brightness grid (for pattern-based rendering)
	 */
	renderFromBrightnessGrid(grid: number[][]): void {
		const { characters, cellWidth, cellHeight, color } = this.config;

		this.clear();
		this.ctx.fillStyle = color;

		for (let row = 0; row < grid.length; row++) {
			for (let col = 0; col < grid[row].length; col++) {
				const brightness = grid[row][col];
				const charIndex = Math.floor((brightness / 255) * (characters.length - 1));
				const char = characters[Math.min(charIndex, characters.length - 1)];

				if (char !== " ") {
					this.ctx.fillText(char, col * cellWidth, row * cellHeight);
				}
			}
		}
	}

	/**
	 * Render ASCII with per-cell colors (for colored image rendering)
	 */
	renderWithColors(data: Array<{ char: string; color: string; x: number; y: number }>): void {
		this.clear();

		for (const { char, color, x, y } of data) {
			if (char !== " ") {
				this.ctx.fillStyle = color;
				this.ctx.fillText(char, x, y);
			}
		}
	}

	/**
	 * PERFORMANCE: Render from BrightnessBuffer using texture atlas
	 *
	 * Uses pre-rendered character sprites instead of fillText calls.
	 * 5-10x faster than renderFromBrightnessGrid for large canvases.
	 *
	 * @param buffer - BrightnessBuffer from fillBrightnessBuffer
	 */
	renderFromBuffer(buffer: { data: Uint8Array; cols: number; rows: number }): void {
		const { characters, cellWidth, cellHeight } = this.config;

		this.clear();

		// Fall back to fillText if atlas not available
		if (!this.charAtlas) {
			this.ctx.fillStyle = this.config.color;
			const charLen = characters.length - 1;
			let idx = 0;
			for (let row = 0; row < buffer.rows; row++) {
				for (let col = 0; col < buffer.cols; col++) {
					const brightness = buffer.data[idx++];
					const charIndex = ((brightness / 255) * charLen) | 0;
					const char = characters[Math.min(charIndex, charLen)];
					if (char !== " ") {
						this.ctx.fillText(char, col * cellWidth, row * cellHeight);
					}
				}
			}
			return;
		}

		// Use atlas for fast rendering via drawImage
		const charLen = characters.length - 1;
		let idx = 0;

		for (let row = 0; row < buffer.rows; row++) {
			const y = row * cellHeight;
			for (let col = 0; col < buffer.cols; col++) {
				const brightness = buffer.data[idx++];
				const charIndex = ((brightness / 255) * charLen) | 0;

				// Skip space characters (index 0 in most charsets)
				if (charIndex === 0 && characters[0] === " ") {
					continue;
				}

				// Draw from atlas: source is the character's position in the atlas
				this.ctx.drawImage(
					this.charAtlas,
					charIndex * cellWidth,
					0,
					cellWidth,
					cellHeight, // source
					col * cellWidth,
					y,
					cellWidth,
					cellHeight, // destination
				);
			}
		}
	}

	/**
	 * PERFORMANCE: Render brightness grid using atlas (legacy grid format)
	 *
	 * @param grid - 2D array of brightness values
	 */
	renderGridFast(grid: number[][]): void {
		const { characters, cellWidth, cellHeight } = this.config;

		this.clear();

		if (!this.charAtlas) {
			// Fallback to standard method
			this.renderFromBrightnessGrid(grid);
			return;
		}

		const charLen = characters.length - 1;

		for (let row = 0; row < grid.length; row++) {
			const y = row * cellHeight;
			const rowData = grid[row];
			for (let col = 0; col < rowData.length; col++) {
				const brightness = rowData[col];
				const charIndex = ((brightness / 255) * charLen) | 0;

				if (charIndex === 0 && characters[0] === " ") {
					continue;
				}

				this.ctx.drawImage(
					this.charAtlas,
					charIndex * cellWidth,
					0,
					cellWidth,
					cellHeight,
					col * cellWidth,
					y,
					cellWidth,
					cellHeight,
				);
			}
		}
	}

	/**
	 * Calculate average brightness for a cell region
	 */
	private getCellBrightness(
		data: Uint8ClampedArray,
		startX: number,
		startY: number,
		imageWidth: number,
		cellWidth: number,
		cellHeight: number,
		brightnessFunction: (r: number, g: number, b: number) => number,
	): number {
		let total = 0;
		let count = 0;

		for (let cy = 0; cy < cellHeight; cy++) {
			for (let cx = 0; cx < cellWidth; cx++) {
				const px = ((startY + cy) * imageWidth + (startX + cx)) * 4;
				if (px >= 0 && px + 2 < data.length) {
					total += brightnessFunction(data[px], data[px + 1], data[px + 2]);
					count++;
				}
			}
		}

		return count > 0 ? total / count : 0;
	}

	/**
	 * Start an animation loop with FPS limiting
	 */
	startAnimation(
		updateFn: (time: number, deltaTime: number) => ImageData | number[][],
		fps: number = 30,
	): void {
		if (this.isRunning) {
			this.stopAnimation();
		}

		this.isRunning = true;
		const frameInterval = 1000 / fps;
		this.lastFrameTime = performance.now();

		const animate = (currentTime: number): void => {
			if (!this.isRunning) return;

			const deltaTime = currentTime - this.lastFrameTime;

			if (deltaTime >= frameInterval) {
				const result = updateFn(currentTime, deltaTime);

				if (result instanceof ImageData) {
					this.renderFrame(result);
				} else {
					this.renderFromBrightnessGrid(result);
				}

				this.lastFrameTime = currentTime - (deltaTime % frameInterval);
			}

			this.animationId = requestAnimationFrame(animate);
		};

		this.animationId = requestAnimationFrame(animate);
	}

	/**
	 * Stop the animation loop
	 */
	stopAnimation(): void {
		this.isRunning = false;
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	/**
	 * Check if animation is currently running
	 */
	isAnimating(): boolean {
		return this.isRunning;
	}

	/**
	 * Pause animation (can be resumed)
	 */
	pause(): void {
		this.isRunning = false;
		if (this.animationId !== null) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	/**
	 * Clean up and destroy the renderer
	 */
	destroy(): void {
		this.stopAnimation();
	}
}
