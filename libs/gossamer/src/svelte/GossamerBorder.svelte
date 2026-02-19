<script lang="ts" module>
	export type BorderStyle = "dots" | "dashes" | "stars" | "corners" | "simple" | "double";

	export interface GossamerBorderProps {
		/** Border style preset */
		style?: BorderStyle;
		/** Custom characters for border (overrides style) */
		characters?: {
			horizontal?: string;
			vertical?: string;
			topLeft?: string;
			topRight?: string;
			bottomLeft?: string;
			bottomRight?: string;
		};
		/** Border color */
		color?: string;
		/** Border thickness in characters */
		thickness?: number;
		/** Character size in pixels */
		charSize?: number;
		/** Enable animation */
		animated?: boolean;
		/** Animation speed */
		speed?: number;
		/** Padding inside the border */
		padding?: number;
		/** Additional CSS class */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { createResizeObserver, createVisibilityObserver, onReducedMotionChange } from "../index";

	// Props with defaults
	let {
		style = "simple",
		characters,
		color = "currentColor",
		thickness = 1,
		charSize = 12,
		animated = false,
		speed = 0.5,
		padding = 0,
		class: className = "",
	}: GossamerBorderProps = $props();

	// Border character presets
	const BORDER_STYLES: Record<
		BorderStyle,
		{
			horizontal: string;
			vertical: string;
			topLeft: string;
			topRight: string;
			bottomLeft: string;
			bottomRight: string;
		}
	> = {
		simple: {
			horizontal: "─",
			vertical: "│",
			topLeft: "┌",
			topRight: "┐",
			bottomLeft: "└",
			bottomRight: "┘",
		},
		double: {
			horizontal: "═",
			vertical: "║",
			topLeft: "╔",
			topRight: "╗",
			bottomLeft: "╚",
			bottomRight: "╝",
		},
		dots: {
			horizontal: "·",
			vertical: "·",
			topLeft: "·",
			topRight: "·",
			bottomLeft: "·",
			bottomRight: "·",
		},
		dashes: {
			horizontal: "─",
			vertical: "¦",
			topLeft: "┌",
			topRight: "┐",
			bottomLeft: "└",
			bottomRight: "┘",
		},
		stars: {
			horizontal: "*",
			vertical: "*",
			topLeft: "*",
			topRight: "*",
			bottomLeft: "*",
			bottomRight: "*",
		},
		corners: {
			horizontal: " ",
			vertical: " ",
			topLeft: "╭",
			topRight: "╮",
			bottomLeft: "╰",
			bottomRight: "╯",
		},
	};

	// State
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let isVisible = true;
	let reducedMotion = false;
	let animationId: number | null = null;
	let borderWidth = 0;
	let borderHeight = 0;

	// Get effective border characters
	const borderChars = $derived({
		...BORDER_STYLES[style],
		...characters,
	});

	const shouldAnimate = $derived(animated && isVisible && !reducedMotion);

	function renderBorder(time: number = 0): void {
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.font = `${charSize}px monospace`;
		ctx.textBaseline = "top";
		ctx.fillStyle = color;

		const cols = Math.floor(borderWidth / charSize);
		const rows = Math.floor(borderHeight / charSize);

		if (cols < 3 || rows < 3) return;

		// Animation offset for marching effect
		const offset = animated ? Math.floor(time * speed * 0.01) : 0;

		// Draw corners
		ctx.fillText(borderChars.topLeft, 0, 0);
		ctx.fillText(borderChars.topRight, (cols - 1) * charSize, 0);
		ctx.fillText(borderChars.bottomLeft, 0, (rows - 1) * charSize);
		ctx.fillText(borderChars.bottomRight, (cols - 1) * charSize, (rows - 1) * charSize);

		// Draw horizontal borders (top and bottom)
		for (let col = 1; col < cols - 1; col++) {
			const animIndex = (col + offset) % 2;
			const topChar = animated && animIndex === 0 ? " " : borderChars.horizontal;
			const bottomChar = animated && animIndex === 1 ? " " : borderChars.horizontal;

			if (topChar !== " ") {
				ctx.fillText(topChar, col * charSize, 0);
			}
			if (bottomChar !== " ") {
				ctx.fillText(bottomChar, col * charSize, (rows - 1) * charSize);
			}
		}

		// Draw vertical borders (left and right)
		for (let row = 1; row < rows - 1; row++) {
			const animIndex = (row + offset) % 2;
			const leftChar = animated && animIndex === 0 ? " " : borderChars.vertical;
			const rightChar = animated && animIndex === 1 ? " " : borderChars.vertical;

			if (leftChar !== " ") {
				ctx.fillText(leftChar, 0, row * charSize);
			}
			if (rightChar !== " ") {
				ctx.fillText(rightChar, (cols - 1) * charSize, row * charSize);
			}
		}

		// Draw additional thickness layers if needed
		for (let t = 1; t < thickness; t++) {
			const innerCol = t;
			const outerCol = cols - 1 - t;
			const innerRow = t;
			const outerRow = rows - 1 - t;

			// Inner horizontal lines
			for (let col = innerCol; col <= outerCol; col++) {
				ctx.fillText(borderChars.horizontal, col * charSize, innerRow * charSize);
				ctx.fillText(borderChars.horizontal, col * charSize, outerRow * charSize);
			}

			// Inner vertical lines
			for (let row = innerRow; row <= outerRow; row++) {
				ctx.fillText(borderChars.vertical, innerCol * charSize, row * charSize);
				ctx.fillText(borderChars.vertical, outerCol * charSize, row * charSize);
			}
		}
	}

	let startTime = 0;

	function animate(currentTime: number): void {
		if (!shouldAnimate) return;

		const elapsed = currentTime - startTime;
		renderBorder(elapsed);
		animationId = requestAnimationFrame(animate);
	}

	function startAnimation(): void {
		if (animationId !== null) return;
		startTime = performance.now();
		animationId = requestAnimationFrame(animate);
	}

	function stopAnimation(): void {
		if (animationId !== null) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
	}

	function setupCanvas(width: number, height: number): void {
		if (!canvas) return;

		borderWidth = width;
		borderHeight = height;
		canvas.width = width;
		canvas.height = height;

		if (shouldAnimate) {
			startAnimation();
		} else {
			renderBorder();
		}
	}

	// Lifecycle
	onMount(() => {
		const cleanupMotion = onReducedMotionChange((prefers) => {
			reducedMotion = prefers;
		});

		const cleanupVisibility = createVisibilityObserver(
			container,
			(visible) => {
				isVisible = visible;
				if (visible && shouldAnimate) {
					startAnimation();
				} else {
					stopAnimation();
				}
			},
			0.1,
		);

		const cleanupResize = createResizeObserver(
			container,
			(width, height) => {
				setupCanvas(width, height);
			},
			100,
		);

		const rect = container.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			setupCanvas(rect.width, rect.height);
		}

		return () => {
			cleanupMotion();
			cleanupVisibility();
			cleanupResize();
			stopAnimation();
		};
	});

	$effect(() => {
		if (shouldAnimate) {
			startAnimation();
		} else {
			stopAnimation();
			renderBorder();
		}
	});
</script>

<div bind:this={container} class="gossamer-border {className}" style:padding="{padding}px">
	<canvas bind:this={canvas} aria-hidden="true" class="gossamer-border-canvas"></canvas>
	<div class="gossamer-border-content">
		<slot />
	</div>
</div>

<style>
	.gossamer-border {
		position: relative;
		display: block;
	}

	.gossamer-border-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 0;
	}

	.gossamer-border-content {
		position: relative;
		z-index: 1;
	}
</style>
