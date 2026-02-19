<script lang="ts" module>
	export interface GossamerImageProps {
		/** Image source URL */
		src: string;
		/** Alt text for accessibility */
		alt: string;
		/** Character set (light to dark) */
		characters?: string;
		/** Cell size for ASCII detail level */
		cellSize?: number;
		/** Single color or 'preserve' to keep image colors */
		color?: string | "preserve";
		/** Invert brightness mapping */
		invert?: boolean;
		/** Output width in pixels */
		width?: number;
		/** Output height in pixels */
		height?: number;
		/** Show original image on hover */
		showOriginalOnHover?: boolean;
		/** Hover transition duration in ms */
		transitionDuration?: number;
		/** Additional CSS class */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import {
		loadImage,
		imageToPixelData,
		sampleImageCells,
		brightnessToChar,
		invertCharacters,
		CHARACTER_SETS,
	} from "../index";

	// Props with defaults
	let {
		src,
		alt,
		characters = CHARACTER_SETS.standard.characters,
		cellSize = 8,
		color = "#ffffff",
		invert = false,
		width,
		height,
		showOriginalOnHover = false,
		transitionDuration = 300,
		class: className = "",
	}: GossamerImageProps = $props();

	// State
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let isLoading = true;
	let hasError = false;
	let isHovered = false;
	let loadedImage: HTMLImageElement | null = null;
	let imageWidth = 0;
	let imageHeight = 0;

	// Effective characters (possibly inverted)
	const effectiveCharacters = $derived(invert ? invertCharacters(characters) : characters);

	async function loadAndRender(): Promise<void> {
		isLoading = true;
		hasError = false;

		try {
			const img = await loadImage(src, { crossOrigin: "anonymous" });
			loadedImage = img;

			// Calculate dimensions
			const naturalWidth = img.naturalWidth;
			const naturalHeight = img.naturalHeight;
			const aspectRatio = naturalWidth / naturalHeight;

			if (width && height) {
				imageWidth = width;
				imageHeight = height;
			} else if (width) {
				imageWidth = width;
				imageHeight = Math.round(width / aspectRatio);
			} else if (height) {
				imageHeight = height;
				imageWidth = Math.round(height * aspectRatio);
			} else {
				imageWidth = naturalWidth;
				imageHeight = naturalHeight;
			}

			renderASCII();
			isLoading = false;
		} catch {
			hasError = true;
			isLoading = false;
		}
	}

	function renderASCII(): void {
		if (!canvas || !loadedImage) return;

		canvas.width = imageWidth;
		canvas.height = imageHeight;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Get image pixel data
		const pixelData = imageToPixelData(loadedImage, imageWidth, imageHeight);
		const cells = sampleImageCells(pixelData, cellSize, cellSize);

		// Clear canvas
		ctx.clearRect(0, 0, imageWidth, imageHeight);

		// Set up text rendering
		ctx.font = `${cellSize}px monospace`;
		ctx.textBaseline = "top";
		ctx.textAlign = "left";

		// Render each cell
		for (let row = 0; row < cells.length; row++) {
			for (let col = 0; col < cells[row].length; col++) {
				const cell = cells[row][col];
				const char = brightnessToChar(cell.brightness, effectiveCharacters);

				if (char !== " ") {
					// Use image color or fixed color
					ctx.fillStyle = color === "preserve" ? cell.color : color;
					ctx.fillText(char, col * cellSize, row * cellSize);
				}
			}
		}
	}

	// Lifecycle
	onMount(() => {
		loadAndRender();
	});

	// React to src changes
	$effect(() => {
		if (src) {
			loadAndRender();
		}
	});

	// React to render config changes
	$effect(() => {
		// Track these dependencies
		const _ = [characters, cellSize, color, invert, width, height];
		if (loadedImage) {
			renderASCII();
		}
	});

	function handleMouseEnter(): void {
		if (showOriginalOnHover) {
			isHovered = true;
		}
	}

	function handleMouseLeave(): void {
		isHovered = false;
	}
</script>

<div
	bind:this={container}
	class="gossamer-image {className}"
	class:loading={isLoading}
	class:error={hasError}
	class:hoverable={showOriginalOnHover}
	style:width={imageWidth ? `${imageWidth}px` : undefined}
	style:height={imageHeight ? `${imageHeight}px` : undefined}
	role="img"
	aria-label={alt}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	{#if isLoading}
		<div class="gossamer-image-loading">
			<span>Loading...</span>
		</div>
	{:else if hasError}
		<div class="gossamer-image-error">
			<span>Failed to load image</span>
		</div>
	{:else}
		<canvas
			bind:this={canvas}
			class="gossamer-canvas"
			class:hidden={showOriginalOnHover && isHovered}
			style:transition-duration="{transitionDuration}ms"
			aria-hidden="true"
		></canvas>

		{#if showOriginalOnHover && loadedImage}
			<img
				{src}
				{alt}
				class="gossamer-original"
				class:visible={isHovered}
				style:transition-duration="{transitionDuration}ms"
				width={imageWidth}
				height={imageHeight}
			/>
		{/if}
	{/if}
</div>

<style>
	.gossamer-image {
		position: relative;
		display: inline-block;
		overflow: hidden;
	}

	.gossamer-image.hoverable {
		cursor: pointer;
	}

	.gossamer-canvas {
		display: block;
		opacity: 1;
		transition-property: opacity;
		transition-timing-function: ease-in-out;
	}

	.gossamer-canvas.hidden {
		opacity: 0;
	}

	.gossamer-original {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0;
		transition-property: opacity;
		transition-timing-function: ease-in-out;
	}

	.gossamer-original.visible {
		opacity: 1;
	}

	.gossamer-image-loading,
	.gossamer-image-error {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 100px;
		color: currentColor;
		opacity: 0.5;
	}

	.gossamer-image-error {
		color: #ef4444;
	}
</style>
