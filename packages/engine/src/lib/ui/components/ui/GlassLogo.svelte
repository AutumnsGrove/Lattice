<script lang="ts">
	/**
	 * GlassLogo - Grove Logo with glassmorphism styling
	 *
	 * A beautiful translucent logo with frosted glass effects,
	 * subtle highlights, and soft glows. Perfect for hero sections,
	 * glass cards, and modern UI designs.
	 *
	 * @example Basic glass logo
	 * ```svelte
	 * <GlassLogo class="w-16 h-20" />
	 * ```
	 *
	 * @example Accent variant with breathing
	 * ```svelte
	 * <GlassLogo variant="accent" breathing />
	 * ```
	 *
	 * @example Frosted variant for dark backgrounds
	 * ```svelte
	 * <GlassLogo variant="frosted" class="w-24 h-30" />
	 * ```
	 */

	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { browser } from '$app/environment';

	type GlassVariant =
		| "default"   // Light translucent - white/emerald tones
		| "accent"    // Accent-colored glass
		| "frosted"   // Strong frosted effect, more opaque
		| "dark"      // Dark translucent for light backgrounds
		| "ethereal"; // Dreamy, highly transparent with glow

	type BreathingSpeed = 'slow' | 'normal' | 'fast';

	interface Props {
		class?: string;
		/** Glass style variant */
		variant?: GlassVariant;
		/** Add subtle sway animation */
		animate?: boolean;
		/** Add breathing animation (for loading states) */
		breathing?: boolean;
		/** Breathing animation speed */
		breathingSpeed?: BreathingSpeed;
		/** Whether trunk should match foliage color */
		monochrome?: boolean;
		/** Custom accent color (CSS color value) */
		accentColor?: string;
		/** Unique ID for SVG filters (auto-generated if not provided) */
		filterId?: string;
	}

	let {
		class: className = 'w-6 h-6',
		variant = "default",
		animate = false,
		breathing = false,
		breathingSpeed = 'normal',
		monochrome = false,
		accentColor,
		filterId
	}: Props = $props();

	// Generate unique ID for SVG filters to avoid conflicts when multiple logos exist
	const uniqueId = filterId ?? `glass-logo-${Math.random().toString(36).slice(2, 9)}`;

	// Breathing speed presets
	const BREATHING_SPEEDS = {
		slow: 1500,
		normal: 800,
		fast: 400
	} as const;

	// Reduced motion preference
	const reducedMotionQuery = browser ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	let prefersReducedMotion = $state(reducedMotionQuery?.matches ?? false);

	$effect(() => {
		if (!reducedMotionQuery) return;
		const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
		reducedMotionQuery.addEventListener('change', handler);
		return () => reducedMotionQuery.removeEventListener('change', handler);
	});

	// Glass color schemes per variant
	const variantColors = $derived({
		default: {
			// Light translucent white/emerald
			gradientStart: 'rgba(255, 255, 255, 0.7)',
			gradientEnd: 'rgba(236, 253, 245, 0.5)',   // emerald-50
			highlight: 'rgba(255, 255, 255, 0.9)',
			shadow: 'rgba(16, 185, 129, 0.2)',         // emerald-500
			trunk: monochrome ? 'rgba(255, 255, 255, 0.5)' : 'rgba(93, 64, 55, 0.7)',
			glowColor: 'rgba(16, 185, 129, 0.3)'
		},
		accent: {
			// Accent-colored (uses CSS variable or custom color)
			gradientStart: accentColor ? `${accentColor}cc` : 'rgba(var(--accent-rgb, 16, 185, 129), 0.8)',
			gradientEnd: accentColor ? `${accentColor}99` : 'rgba(var(--accent-rgb, 16, 185, 129), 0.6)',
			highlight: 'rgba(255, 255, 255, 0.6)',
			shadow: accentColor ? `${accentColor}40` : 'rgba(var(--accent-rgb, 16, 185, 129), 0.25)',
			trunk: monochrome
				? (accentColor ? `${accentColor}99` : 'rgba(var(--accent-rgb, 16, 185, 129), 0.6)')
				: 'rgba(93, 64, 55, 0.8)',
			glowColor: accentColor ? `${accentColor}50` : 'rgba(var(--accent-rgb, 16, 185, 129), 0.3)'
		},
		frosted: {
			// Strong frosted, more opaque
			gradientStart: 'rgba(255, 255, 255, 0.85)',
			gradientEnd: 'rgba(248, 250, 252, 0.75)',  // slate-50
			highlight: 'rgba(255, 255, 255, 0.95)',
			shadow: 'rgba(100, 116, 139, 0.15)',       // slate-500
			trunk: monochrome ? 'rgba(255, 255, 255, 0.7)' : 'rgba(93, 64, 55, 0.85)',
			glowColor: 'rgba(148, 163, 184, 0.2)'     // slate-400
		},
		dark: {
			// Dark translucent for light backgrounds
			gradientStart: 'rgba(30, 41, 59, 0.7)',   // slate-800
			gradientEnd: 'rgba(15, 23, 42, 0.6)',     // slate-900
			highlight: 'rgba(148, 163, 184, 0.4)',    // slate-400
			shadow: 'rgba(0, 0, 0, 0.3)',
			trunk: monochrome ? 'rgba(30, 41, 59, 0.6)' : 'rgba(60, 45, 38, 0.8)',
			glowColor: 'rgba(100, 116, 139, 0.2)'
		},
		ethereal: {
			// Dreamy, highly transparent with strong glow
			gradientStart: 'rgba(255, 255, 255, 0.4)',
			gradientEnd: 'rgba(236, 254, 255, 0.25)', // cyan-50
			highlight: 'rgba(255, 255, 255, 0.7)',
			shadow: 'rgba(34, 211, 238, 0.2)',        // cyan-400
			trunk: monochrome ? 'rgba(255, 255, 255, 0.3)' : 'rgba(93, 64, 55, 0.5)',
			glowColor: 'rgba(34, 211, 238, 0.4)'
		}
	}[variant]);

	// Breathing animation
	const breathValue = tweened(0, { easing: cubicInOut });

	$effect(() => {
		const duration = BREATHING_SPEEDS[breathingSpeed];

		if (!breathing || prefersReducedMotion) {
			breathValue.set(0, { duration: Math.min(duration / 2, 300) });
			return;
		}

		let cancelled = false;

		async function pulse() {
			while (!cancelled) {
				await breathValue.set(1, { duration });
				if (cancelled) break;
				await breathValue.set(0, { duration });
				if (cancelled) break;
			}
		}

		pulse();

		return () => { cancelled = true; };
	});

	// Breathing expansion values
	const expansion = $derived($breathValue * 22);
	const diagExpansion = $derived($breathValue * 16);

	// Individual branch transforms for breathing
	const leftTransform = $derived(`translate(${-expansion}, 0)`);
	const rightTransform = $derived(`translate(${expansion}, 0)`);
	const topTransform = $derived(`translate(0, ${-expansion})`);
	const topLeftTransform = $derived(`translate(${-diagExpansion}, ${-diagExpansion})`);
	const topRightTransform = $derived(`translate(${diagExpansion}, ${-diagExpansion})`);
	const bottomLeftTransform = $derived(`translate(${-diagExpansion}, ${diagExpansion})`);
	const bottomRightTransform = $derived(`translate(${diagExpansion}, ${diagExpansion})`);

	// Glow intensity for breathing (pulses with breath)
	const glowIntensity = $derived(4 + $breathValue * 4);

	// Animation class
	const animationClass = $derived(animate && !breathing ? 'grove-glass-logo-sway' : '');

	// Decomposed foliage paths for breathing animation
	const centerPath = "M126 173.468 L171.476 124.872 L171.476 173.468 L126 173.468 M245.562 124.872 L290.972 173.268 L245.562 173.268 L245.562 124.872 M126.664 243.97 L171.476 243.97 L171.476 173.468 L126 173.468 L126.664 243.97 M290.252 243.77 L245.562 243.77 L245.562 173.268 L290.972 173.268 L290.252 243.77 M171.476 243.97 L208.519 258.11 L245.562 243.77 L245.562 173.268 L171.476 173.468 L171.476 243.97";
	const leftBarPath = "M0 173.468 L126 173.468 L126.664 243.97 L0 243.97 Z";
	const rightBarPath = "M290.972 173.268 L417 173.268 L417 243.77 L290.252 243.77 Z";
	const topBarPath = "M171.476 0 L245.562 0 L245.562 124.872 L171.476 124.872 Z";
	const topLeftDiagPath = "M126.068 173.468 L36.446 88.028 L86.037 37.043 L171.476 124.872 Z";
	const topRightDiagPath = "M245.562 124.872 L331 37.243 L380.552 88.028 L290.972 173.268 Z";
	const bottomLeftDiagPath = "M126.664 243.97 L36.446 331.601 L86.037 381.192 L208.519 258.11 L171.476 243.97 Z";
	const bottomRightDiagPath = "M290.252 243.77 L380.435 331.399 L331 381.192 L208.519 258.11 L245.562 243.77 Z";

	// Full foliage path for non-breathing state
	const fullFoliagePath = "M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z";
</script>

<svg
	class="{className} {animationClass}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 417 512.238"
	aria-label="Grove logo"
>
	<defs>
		<!-- Main glass gradient for foliage -->
		<linearGradient id="{uniqueId}-foliage-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color={variantColors.gradientStart} />
			<stop offset="50%" stop-color={variantColors.gradientEnd} />
			<stop offset="100%" stop-color={variantColors.gradientStart} />
		</linearGradient>

		<!-- Highlight gradient (top-left shine) -->
		<linearGradient id="{uniqueId}-highlight" x1="0%" y1="0%" x2="50%" y2="50%">
			<stop offset="0%" stop-color={variantColors.highlight} />
			<stop offset="100%" stop-color="transparent" />
		</linearGradient>

		<!-- Trunk gradient -->
		<linearGradient id="{uniqueId}-trunk-grad" x1="0%" y1="0%" x2="100%" y2="100%">
			<stop offset="0%" stop-color={variantColors.trunk} />
			<stop offset="100%" stop-color={variantColors.trunk} stop-opacity="0.8" />
		</linearGradient>

		<!-- Soft glow filter -->
		<filter id="{uniqueId}-glow" x="-30%" y="-30%" width="160%" height="160%">
			<feGaussianBlur in="SourceGraphic" stdDeviation={glowIntensity} result="blur" />
			<feFlood flood-color={variantColors.glowColor} />
			<feComposite in2="blur" operator="in" />
			<feMerge>
				<feMergeNode />
				<feMergeNode in="SourceGraphic" />
			</feMerge>
		</filter>

		<!-- Inner shadow/depth filter -->
		<filter id="{uniqueId}-inner-shadow" x="-10%" y="-10%" width="120%" height="120%">
			<feOffset dx="2" dy="2" />
			<feGaussianBlur stdDeviation="3" result="shadow" />
			<feFlood flood-color={variantColors.shadow} />
			<feComposite in2="shadow" operator="in" />
			<feComposite in2="SourceGraphic" operator="over" />
		</filter>

		<!-- Glass edge highlight mask -->
		<mask id="{uniqueId}-edge-mask">
			<path d={fullFoliagePath} fill="white" />
		</mask>
	</defs>

	<!-- Trunk with glass effect -->
	<path
		fill="url(#{uniqueId}-trunk-grad)"
		d="M171.274 344.942h74.09v167.296h-74.09V344.942z"
		filter="url(#{uniqueId}-inner-shadow)"
	/>

	{#if breathing}
		<!-- Decomposed foliage with breathing animation -->
		<g filter="url(#{uniqueId}-glow)">
			<!-- Center anchor (stationary) -->
			<path fill="url(#{uniqueId}-foliage-grad)" d={centerPath} />

			<!-- Left horizontal bar -->
			<g transform={leftTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={leftBarPath} />
			</g>

			<!-- Right horizontal bar -->
			<g transform={rightTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={rightBarPath} />
			</g>

			<!-- Top vertical bar -->
			<g transform={topTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={topBarPath} />
			</g>

			<!-- Top-left diagonal -->
			<g transform={topLeftTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={topLeftDiagPath} />
			</g>

			<!-- Top-right diagonal -->
			<g transform={topRightTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={topRightDiagPath} />
			</g>

			<!-- Bottom-left diagonal -->
			<g transform={bottomLeftTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={bottomLeftDiagPath} />
			</g>

			<!-- Bottom-right diagonal -->
			<g transform={bottomRightTransform}>
				<path fill="url(#{uniqueId}-foliage-grad)" d={bottomRightDiagPath} />
			</g>
		</g>

		<!-- Highlight overlay for breathing (simplified) -->
		<path
			d={centerPath}
			fill="url(#{uniqueId}-highlight)"
			opacity="0.5"
		/>
	{:else}
		<!-- Static foliage with glass effect -->
		<g filter="url(#{uniqueId}-glow)">
			<path
				fill="url(#{uniqueId}-foliage-grad)"
				d={fullFoliagePath}
			/>
		</g>

		<!-- Top-left highlight/shine overlay -->
		<path
			d={fullFoliagePath}
			fill="url(#{uniqueId}-highlight)"
			opacity="0.5"
		/>

		<!-- Subtle edge highlight (inner stroke effect) -->
		<path
			d={fullFoliagePath}
			fill="none"
			stroke={variantColors.highlight}
			stroke-width="2"
			stroke-opacity="0.3"
		/>
	{/if}
</svg>

<style>
	@keyframes grove-glass-logo-sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(1deg); }
	}

	.grove-glass-logo-sway {
		transform-origin: center bottom;
		animation: grove-glass-logo-sway 4s ease-in-out infinite;
	}
</style>
