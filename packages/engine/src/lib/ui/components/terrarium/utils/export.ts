/**
 * Terrarium PNG Export Utilities
 *
 * Handles exporting Terrarium scenes as PNG images using dom-to-image-more.
 * Supports pausing animations, custom scaling, and thumbnail generation.
 *
 * This file is part of Grove — A place to Be
 * Copyright (c) 2025 Autumn Brown
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 */

import domtoimage from 'dom-to-image-more';
import type { ExportOptions } from '../types';
import { TERRARIUM_CONFIG } from '$lib/config/terrarium';

/**
 * Pauses all CSS animations and transitions on an element and its children.
 * Returns a cleanup function to restore animations.
 */
function pauseAnimations(element: HTMLElement): () => void {
	const originalStyles = new Map<HTMLElement, string>();
	const allElements = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];

	allElements.forEach((el) => {
		const style = el.style.cssText;
		originalStyles.set(el, style);
		el.style.cssText += '; animation-play-state: paused !important; transition: none !important;';
	});

	return () => {
		originalStyles.forEach((style, el) => {
			el.style.cssText = style;
		});
	};
}

/**
 * Waits for a specified number of milliseconds.
 */
function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sanitizes a filename by converting to lowercase and replacing
 * non-alphanumeric characters with hyphens.
 */
export function sanitizeFilename(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/**
 * Triggers a download of a data URL with the specified filename.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
	const anchor = document.createElement('a');
	anchor.href = dataUrl;
	anchor.download = filename;
	anchor.style.display = 'none';

	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
}

/**
 * Generates a PNG data URL from a canvas element.
 * Useful for creating thumbnails or previews.
 *
 * @param canvasElement - The HTML element to capture
 * @param options - Export configuration options
 * @returns Promise resolving to a data URL string
 */
export async function generateDataUrl(
	canvasElement: HTMLElement,
	options: ExportOptions = {}
): Promise<string> {
	const {
		scale = TERRARIUM_CONFIG.export.defaultScale,
		backgroundColor,
		pauseAnimations: shouldPauseAnimations = true,
		width,
		height
	} = options;

	let restoreAnimations: (() => void) | null = null;

	try {
		if (shouldPauseAnimations) {
			restoreAnimations = pauseAnimations(canvasElement);
			await wait(100);
		}

		const domToImageOptions: {
			quality: number;
			width?: number;
			height?: number;
			style?: Record<string, string>;
		} = {
			quality: 1.0
		};

		if (width !== undefined) {
			domToImageOptions.width = width * scale;
		}

		if (height !== undefined) {
			domToImageOptions.height = height * scale;
		}

		if (backgroundColor !== undefined) {
			domToImageOptions.style = {
				backgroundColor
			};
		}

		const dataUrl = await domtoimage.toPng(canvasElement, domToImageOptions);

		return dataUrl;
	} finally {
		if (restoreAnimations) {
			restoreAnimations();
		}
	}
}

/**
 * Exports a Terrarium scene as a PNG file.
 * Pauses animations during capture and triggers a download.
 *
 * @param canvasElement - The HTML element to capture
 * @param sceneName - Name of the scene (used for filename)
 * @param options - Export configuration options
 */
export async function exportSceneAsPNG(
	canvasElement: HTMLElement,
	sceneName: string,
	options: ExportOptions = {}
): Promise<void> {
	const dataUrl = await generateDataUrl(canvasElement, options);
	const sanitizedName = sanitizeFilename(sceneName);
	const filename = `${sanitizedName || 'terrarium-scene'}.png`;

	downloadDataUrl(dataUrl, filename);
}
