<script lang="ts" module>
	import type { PatternType } from "../index";

	export type BlendMode =
		| "normal"
		| "multiply"
		| "screen"
		| "overlay"
		| "soft-light"
		| "hard-light"
		| "difference";

	export interface GossamerOverlayProps {
		/** Pattern type */
		pattern?: PatternType;
		/** Character set (light to dark) */
		characters?: string;
		/** Foreground color */
		color?: string;
		/** Overall opacity (0-1) */
		opacity?: number;
		/** CSS blend mode */
		blendMode?: BlendMode;
		/** Enable animation */
		animated?: boolean;
		/** Animation speed */
		speed?: number;
		/** Pattern frequency */
		frequency?: number;
		/** Pattern amplitude */
		amplitude?: number;
		/** Cell size in pixels */
		cellSize?: number;
		/** Target FPS */
		fps?: number;
		/** Additional CSS class */
		class?: string;
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import {
		GossamerRenderer,
		generateBrightnessGrid,
		createVisibilityObserver,
		createResizeObserver,
		onReducedMotionChange,
		CHARACTER_SETS,
	} from "../index";

	// Props with defaults
	let {
		pattern = "perlin",
		characters = CHARACTER_SETS.minimal.characters,
		color = "currentColor",
		opacity = 0.15,
		blendMode = "overlay",
		animated = true,
		speed = 0.3,
		frequency = 0.03,
		amplitude = 0.6,
		cellSize = 16,
		fps = 30,
		class: className = "",
	}: GossamerOverlayProps = $props();

	// State
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let renderer: GossamerRenderer | null = null;
	let isVisible = true;
	let reducedMotion = false;
	let animationId: number | null = null;

	const shouldAnimate = $derived(animated && isVisible && !reducedMotion);

	let startTime = 0;

	function animate(currentTime: number): void {
		if (!renderer || !shouldAnimate) return;

		const elapsed = (currentTime - startTime) / 1000;
		const { cols, rows } = renderer.getCellCount();

		const grid = generateBrightnessGrid(cols, rows, pattern, elapsed, {
			frequency,
			amplitude,
			speed,
		});

		renderer.renderFromBrightnessGrid(grid);
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

	function renderStatic(): void {
		if (!renderer) return;

		const { cols, rows } = renderer.getCellCount();
		const grid = generateBrightnessGrid(cols, rows, pattern, 0, { frequency, amplitude, speed: 0 });

		renderer.renderFromBrightnessGrid(grid);
	}

	function setupRenderer(width: number, height: number): void {
		if (!canvas) return;

		if (renderer) {
			renderer.destroy();
		}

		canvas.width = width;
		canvas.height = height;

		renderer = new GossamerRenderer(canvas, {
			characters,
			cellWidth: cellSize,
			cellHeight: cellSize,
			color,
		});

		if (shouldAnimate) {
			startAnimation();
		} else {
			renderStatic();
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
				setupRenderer(width, height);
			},
			100,
		);

		const rect = container.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			setupRenderer(rect.width, rect.height);
		}

		return () => {
			cleanupMotion();
			cleanupVisibility();
			cleanupResize();
			stopAnimation();
			renderer?.destroy();
		};
	});

	$effect(() => {
		if (renderer) {
			renderer.updateConfig({
				characters,
				color,
				cellWidth: cellSize,
				cellHeight: cellSize,
			});

			if (shouldAnimate) {
				startAnimation();
			} else {
				stopAnimation();
				renderStatic();
			}
		}
	});
</script>

<div
	bind:this={container}
	class="gossamer-overlay {className}"
	style:opacity
	style:mix-blend-mode={blendMode}
>
	<canvas bind:this={canvas} aria-hidden="true" class="gossamer-canvas"></canvas>
</div>

<style>
	.gossamer-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
		z-index: 1;
	}

	.gossamer-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
