<script lang="ts" module>
	import type { PatternType } from "../index";

	export interface GossamerTextProps {
		/** Text content to display */
		text: string;
		/** Character set for effect (light to dark) */
		characters?: string;
		/** Text color */
		color?: string;
		/** Font size in pixels */
		fontSize?: number;
		/** Font family */
		fontFamily?: string;
		/** Enable animation effect */
		animated?: boolean;
		/** Animation pattern */
		pattern?: PatternType;
		/** Animation speed */
		speed?: number;
		/** Effect intensity */
		intensity?: number;
		/** Target FPS */
		fps?: number;
		/** Additional CSS class */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import {
		perlinNoise2D,
		createVisibilityObserver,
		onReducedMotionChange,
		CHARACTER_SETS,
	} from "../index";

	// Props with defaults
	let {
		text,
		characters = CHARACTER_SETS.minimal.characters,
		color = "currentColor",
		fontSize = 48,
		fontFamily = "monospace",
		animated = false,
		pattern = "perlin",
		speed = 0.5,
		intensity = 0.3,
		fps = 30,
		class: className = "",
	}: GossamerTextProps = $props();

	// State
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let isVisible = true;
	let reducedMotion = false;
	let animationId: number | null = null;
	let textMetrics: { width: number; height: number } = { width: 0, height: 0 };

	const shouldAnimate = $derived(animated && isVisible && !reducedMotion);

	function measureText(): void {
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.font = `${fontSize}px ${fontFamily}`;
		const metrics = ctx.measureText(text);

		textMetrics = {
			width: Math.ceil(metrics.width) + 20,
			height: fontSize + 20,
		};

		canvas.width = textMetrics.width;
		canvas.height = textMetrics.height;
	}

	function renderText(time: number = 0): void {
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.font = `${fontSize}px ${fontFamily}`;
		ctx.textBaseline = "top";
		ctx.fillStyle = color;

		// Render each character with potential effect
		let x = 10;
		const y = 10;

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const charWidth = ctx.measureText(char).width;

			if (animated && time > 0) {
				// Apply noise-based effect to character
				const noise = perlinNoise2D(i * 0.5 + time * speed * 0.001, time * speed * 0.0005);

				// Slight position offset based on noise
				const offsetY = noise * intensity * 5;

				// Slight opacity variation
				ctx.globalAlpha = 0.7 + (noise + 1) * 0.15;

				ctx.fillText(char, x, y + offsetY);
				ctx.globalAlpha = 1;
			} else {
				ctx.fillText(char, x, y);
			}

			x += charWidth;
		}
	}

	let startTime = 0;

	function animate(currentTime: number): void {
		if (!shouldAnimate) return;

		const elapsed = currentTime - startTime;
		renderText(elapsed);
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

	// Lifecycle
	onMount(() => {
		measureText();
		renderText();

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
					renderText();
				}
			},
			0.1,
		);

		if (shouldAnimate) {
			startAnimation();
		}

		return () => {
			cleanupMotion();
			cleanupVisibility();
			stopAnimation();
		};
	});

	// React to text changes
	$effect(() => {
		if (text) {
			measureText();
			if (shouldAnimate) {
				// Animation will handle rendering
			} else {
				renderText();
			}
		}
	});

	// React to animation state changes
	$effect(() => {
		if (shouldAnimate) {
			startAnimation();
		} else {
			stopAnimation();
			renderText();
		}
	});
</script>

<div
	bind:this={container}
	class="gossamer-text {className}"
	style:width={textMetrics.width ? `${textMetrics.width}px` : "auto"}
	style:height={textMetrics.height ? `${textMetrics.height}px` : "auto"}
>
	<canvas bind:this={canvas} aria-hidden="true" class="gossamer-canvas"></canvas>
	<span class="gossamer-text-sr">{text}</span>
</div>

<style>
	.gossamer-text {
		position: relative;
		display: inline-block;
	}

	.gossamer-canvas {
		display: block;
	}

	.gossamer-text-sr {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
