/**
 * Image Utilities
 *
 * Image loading, processing, and pixel manipulation for ASCII conversion.
 */

/**
 * Image loading options
 */
export interface ImageLoadOptions {
	/** Cross-origin setting for external images */
	crossOrigin?: "anonymous" | "use-credentials" | "";
	/** Maximum width to scale image to */
	maxWidth?: number;
	/** Maximum height to scale image to */
	maxHeight?: number;
	/** Whether to preserve aspect ratio when scaling */
	preserveAspectRatio?: boolean;
}

/**
 * Load an image from a URL
 */
export function loadImage(src: string, options: ImageLoadOptions = {}): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();

		if (options.crossOrigin !== undefined) {
			img.crossOrigin = options.crossOrigin;
		}

		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

		img.src = src;
	});
}

/**
 * Load and scale an image to fit within bounds
 */
export async function loadAndScaleImage(
	src: string,
	maxWidth: number,
	maxHeight: number,
	options: ImageLoadOptions = {},
): Promise<{ image: HTMLImageElement; width: number; height: number }> {
	const img = await loadImage(src, options);

	let width = img.naturalWidth;
	let height = img.naturalHeight;

	// Scale down if needed
	if (width > maxWidth || height > maxHeight) {
		const widthRatio = maxWidth / width;
		const heightRatio = maxHeight / height;
		const scale = Math.min(widthRatio, heightRatio);

		width = Math.floor(width * scale);
		height = Math.floor(height * scale);
	}

	return { image: img, width, height };
}

/**
 * Draw an image to a canvas and get its pixel data
 */
export function imageToPixelData(
	image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
	width?: number,
	height?: number,
): ImageData {
	const w = width ?? (image instanceof HTMLImageElement ? image.naturalWidth : image.width);
	const h = height ?? (image instanceof HTMLImageElement ? image.naturalHeight : image.height);

	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Failed to get 2D context");
	}

	ctx.drawImage(image, 0, 0, w, h);
	return ctx.getImageData(0, 0, w, h);
}

/**
 * Extract brightness values from image data
 */
export function extractBrightness(
	imageData: ImageData,
	brightnessFunction: (r: number, g: number, b: number) => number = (r, g, b) =>
		0.21 * r + 0.72 * g + 0.07 * b,
): number[] {
	const { data, width, height } = imageData;
	const brightness: number[] = new Array(width * height);

	for (let i = 0; i < data.length; i += 4) {
		brightness[i / 4] = brightnessFunction(data[i], data[i + 1], data[i + 2]);
	}

	return brightness;
}

/**
 * Sample image data at cell-based intervals
 */
export function sampleImageCells(
	imageData: ImageData,
	cellWidth: number,
	cellHeight: number,
	brightnessFunction: (r: number, g: number, b: number) => number = (r, g, b) =>
		0.21 * r + 0.72 * g + 0.07 * b,
): { brightness: number; color: string }[][] {
	const { data, width, height } = imageData;
	const cols = Math.ceil(width / cellWidth);
	const rows = Math.ceil(height / cellHeight);

	const result: { brightness: number; color: string }[][] = [];

	for (let row = 0; row < rows; row++) {
		result[row] = [];

		for (let col = 0; col < cols; col++) {
			const cellData = sampleCell(
				data,
				width,
				col * cellWidth,
				row * cellHeight,
				cellWidth,
				cellHeight,
			);
			const brightness = brightnessFunction(cellData.r, cellData.g, cellData.b);

			result[row][col] = {
				brightness,
				color: `rgb(${Math.round(cellData.r)}, ${Math.round(cellData.g)}, ${Math.round(cellData.b)})`,
			};
		}
	}

	return result;
}

/**
 * Sample average color from a cell region
 */
function sampleCell(
	data: Uint8ClampedArray,
	imageWidth: number,
	startX: number,
	startY: number,
	cellWidth: number,
	cellHeight: number,
): { r: number; g: number; b: number; a: number } {
	let totalR = 0;
	let totalG = 0;
	let totalB = 0;
	let totalA = 0;
	let count = 0;

	for (let y = startY; y < startY + cellHeight; y++) {
		for (let x = startX; x < startX + cellWidth; x++) {
			const px = (y * imageWidth + x) * 4;

			if (px >= 0 && px + 3 < data.length) {
				totalR += data[px];
				totalG += data[px + 1];
				totalB += data[px + 2];
				totalA += data[px + 3];
				count++;
			}
		}
	}

	if (count === 0) {
		return { r: 0, g: 0, b: 0, a: 0 };
	}

	return {
		r: totalR / count,
		g: totalG / count,
		b: totalB / count,
		a: totalA / count,
	};
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (n: number) =>
		Math.max(0, Math.min(255, Math.round(n)))
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
			}
		: null;
}

/**
 * Adjust image brightness
 */
export function adjustBrightness(imageData: ImageData, amount: number): ImageData {
	const { data, width, height } = imageData;
	const adjusted = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		adjusted[i] = Math.min(255, Math.max(0, data[i] + amount));
		adjusted[i + 1] = Math.min(255, Math.max(0, data[i + 1] + amount));
		adjusted[i + 2] = Math.min(255, Math.max(0, data[i + 2] + amount));
		adjusted[i + 3] = data[i + 3];
	}

	return new ImageData(adjusted, width, height);
}

/**
 * Adjust image contrast
 */
export function adjustContrast(imageData: ImageData, amount: number): ImageData {
	const { data, width, height } = imageData;
	const adjusted = new Uint8ClampedArray(data.length);
	const factor = (259 * (amount + 255)) / (255 * (259 - amount));

	for (let i = 0; i < data.length; i += 4) {
		adjusted[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
		adjusted[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
		adjusted[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
		adjusted[i + 3] = data[i + 3];
	}

	return new ImageData(adjusted, width, height);
}

/**
 * Invert image colors
 */
export function invertColors(imageData: ImageData): ImageData {
	const { data, width, height } = imageData;
	const inverted = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		inverted[i] = 255 - data[i];
		inverted[i + 1] = 255 - data[i + 1];
		inverted[i + 2] = 255 - data[i + 2];
		inverted[i + 3] = data[i + 3];
	}

	return new ImageData(inverted, width, height);
}

/**
 * Convert image to grayscale
 */
export function toGrayscale(imageData: ImageData): ImageData {
	const { data, width, height } = imageData;
	const grayscale = new Uint8ClampedArray(data.length);

	for (let i = 0; i < data.length; i += 4) {
		const gray = 0.21 * data[i] + 0.72 * data[i + 1] + 0.07 * data[i + 2];
		grayscale[i] = gray;
		grayscale[i + 1] = gray;
		grayscale[i + 2] = gray;
		grayscale[i + 3] = data[i + 3];
	}

	return new ImageData(grayscale, width, height);
}
