<script lang="ts" module>
	import type { PatternType, PatternConfig } from "../index";

	export interface GossamerCloudsProps {
		/** Pattern type for generation */
		pattern?: PatternType;
		/** Character set (light to dark) */
		characters?: string;
		/** Foreground color */
		color?: string;
		/** Overall opacity (0-1) */
		opacity?: number;
		/** Enable animation */
		animated?: boolean;
		/** Animation speed multiplier */
		speed?: number;
		/** Pattern frequency (scale) */
		frequency?: number;
		/** Pattern amplitude (intensity) */
		amplitude?: number;
		/** Cell size in pixels */
		cellSize?: number;
		/** Target FPS for animation */
		fps?: number;
		/** Use a preset configuration */
		preset?: string;
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
		prefersReducedMotion,
		onReducedMotionChange,
		CHARACTER_SETS,
	} from "../index";
	import { PRESETS } from "./presets";

	// Props with defaults
	let {
		pattern = "perlin",
		characters = CHARACTER_SETS.grove.characters,
		color = "currentColor",
		opacity = 0.3,
		animated = true,
		speed = 0.5,
		frequency = 0.05,
		amplitude = 1.0,
		cellSize = 12,
		fps = 30,
		preset,
		class: className = "",
	}: GossamerCloudsProps = $props();

	// State
	let canvas: HTMLCanvasElement;
	let container: HTMLDivElement;
	let renderer: GossamerRenderer | null = null;
	let isVisible = true;
	let reducedMotion = false;
	let animationId: number | null = null;

	// Apply preset if specified
	const config = $derived.by(() => {
		if (preset && PRESETS[preset]) {
			const p = PRESETS[preset];
			return {
				pattern: p.pattern as PatternType,
				characters: p.characters,
				frequency: p.frequency,
				amplitude: p.amplitude,
				speed: p.speed,
				opacity: p.opacity,
			};
		}
		return { pattern, characters, frequency, amplitude, speed, opacity };
	});

	// Should animate based on all factors
	const shouldAnimate = $derived(animated && isVisible && !reducedMotion);

	// Animation state
	let startTime = 0;

	function animate(currentTime: number): void {
		if (!renderer || !shouldAnimate) return;

		const elapsed = (currentTime - startTime) / 1000;
		const { cols, rows } = renderer.getCellCount();
		const cfg = config;

		const grid = generateBrightnessGrid(cols, rows, cfg.pattern, elapsed, {
			frequency: cfg.frequency,
			amplitude: cfg.amplitude,
			speed: cfg.speed,
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
		const cfg = config;

		const grid = generateBrightnessGrid(cols, rows, cfg.pattern, 0, {
			frequency: cfg.frequency,
			amplitude: cfg.amplitude,
			speed: 0,
		});

		renderer.renderFromBrightnessGrid(grid);
	}

	function setupRenderer(width: number, height: number): void {
		if (!canvas) return;

		const cfg = config;

		// Create or update renderer
		if (renderer) {
			renderer.destroy();
		}

		canvas.width = width;
		canvas.height = height;

		renderer = new GossamerRenderer(canvas, {
			characters: cfg.characters,
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
		// Watch for reduced motion preference
		const cleanupMotion = onReducedMotionChange((prefers) => {
			reducedMotion = prefers;
		});

		// Watch for visibility changes
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

		// Watch for resize
		const cleanupResize = createResizeObserver(
			container,
			(width, height) => {
				setupRenderer(width, height);
			},
			100,
		);

		// Initial setup
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

	// React to prop changes
	$effect(() => {
		if (renderer) {
			const cfg = config;
			renderer.updateConfig({
				characters: cfg.characters,
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

<div bind:this={container} class="gossamer-clouds {className}" style:opacity={config.opacity}>
	<canvas bind:this={canvas} aria-hidden="true" class="gossamer-canvas"></canvas>
</div>

<style>
	.gossamer-clouds {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: hidden;
		pointer-events: none;
		z-index: 0;
	}

	.gossamer-canvas {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
