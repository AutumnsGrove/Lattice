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
		/** Cell size in pixels (height; width is computed from font metrics) */
		cellSize?: number;
		/** Target FPS for animation */
		fps?: number;
		/** Use a preset configuration */
		preset?: string;
		/** Sparsity bias: 0.0 = no bias, 1.0 = maximum sparsity */
		sparsity?: number;
		/** Alpha-by-brightness: 0.0 = uniform opacity, 1.0 = full brightness-based alpha */
		alphaByBrightness?: number;
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
		color = "#22c55e",
		opacity = 0.3,
		animated = true,
		speed = 0.5,
		frequency = 0.05,
		amplitude = 1.0,
		cellSize = 12,
		fps = 30,
		preset,
		sparsity = 0,
		alphaByBrightness = 0,
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
				sparsity: p.sparsity ?? sparsity,
				alphaByBrightness: p.alphaByBrightness ?? alphaByBrightness,
			};
		}
		return {
			pattern,
			characters,
			frequency,
			amplitude,
			speed,
			opacity,
			sparsity,
			alphaByBrightness,
		};
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
			sparsity: cfg.sparsity,
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
			sparsity: cfg.sparsity,
		});

		renderer.renderFromBrightnessGrid(grid);
	}

	// Measured cell width (computed from font metrics in setupRenderer)
	let measuredCellWidth = cellSize;

	function setupRenderer(width: number, height: number): void {
		if (!canvas) return;

		const cfg = config;

		// Create or update renderer
		if (renderer) {
			renderer.destroy();
		}

		canvas.width = width;
		canvas.height = height;

		// Phase 1: Compute cellWidth from actual font metrics
		// Monospace fonts are ~0.6:1 width:height, so using cellSize for both distorts characters
		const tempCtx = canvas.getContext("2d");
		if (tempCtx) {
			tempCtx.font = `${cellSize}px monospace`;
			const measured = tempCtx.measureText("M").width;
			measuredCellWidth = Math.ceil(measured);
		}

		renderer = new GossamerRenderer(canvas, {
			characters: cfg.characters,
			cellWidth: measuredCellWidth,
			cellHeight: cellSize,
			color,
			alphaByBrightness: cfg.alphaByBrightness,
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
				cellWidth: measuredCellWidth,
				cellHeight: cellSize,
				alphaByBrightness: cfg.alphaByBrightness,
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
