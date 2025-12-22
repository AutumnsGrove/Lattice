<script lang="ts">
	/**
	 * Grove Logo Component
	 *
	 * A logo that respects the user's accent color by default.
	 * The foliage uses `currentColor` which inherits from --accent-color
	 * when placed in an accent-colored context, or can be overridden.
	 *
	 * The trunk defaults to Grove's classic bark brown (#5d4037).
	 *
	 * @example Loading state (breathing animation)
	 * ```svelte
	 * <Logo breathing />
	 * <Logo breathing breathingSpeed="slow" />
	 * ```
	 * Note: breathing is intended for single loading indicators, not lists.
	 */

	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { browser } from '$app/environment';

	type BreathingSpeed = 'slow' | 'normal' | 'fast';

	interface Props {
		class?: string;
		/** Foliage color - defaults to currentColor (inherits accent) */
		color?: string;
		/** Trunk color - defaults to classic bark brown */
		trunkColor?: string;
		/** Whether foliage and trunk should be the same color */
		monochrome?: boolean;
		/** Add subtle sway animation */
		animate?: boolean;
		/** Add breathing animation (for loading states, not lists) */
		breathing?: boolean;
		/** Breathing animation speed - 'slow' (1500ms), 'normal' (800ms), 'fast' (400ms) */
		breathingSpeed?: BreathingSpeed;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		trunkColor,
		monochrome = false,
		animate = false,
		breathing = false,
		breathingSpeed = 'normal'
	}: Props = $props();

	// Breathing speed presets (duration per half-cycle in ms)
	const BREATHING_SPEEDS = {
		slow: 1500,    // 3s full cycle - calm, meditative
		normal: 800,   // 1.6s full cycle - balanced
		fast: 400      // 0.8s full cycle - urgent
	} as const;

	// Respect user's reduced motion preference (reactive to system changes)
	const reducedMotionQuery = browser ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	let prefersReducedMotion = $state(reducedMotionQuery?.matches ?? false);

	$effect(() => {
		if (!reducedMotionQuery) return;
		const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
		reducedMotionQuery.addEventListener('change', handler);
		return () => reducedMotionQuery.removeEventListener('change', handler);
	});

	// Classic bark brown from the nature palette
	const BARK_BROWN = '#5d4037';

	// Compute actual colors
	const foliageColor = color ?? 'currentColor';
	const actualTrunkColor = monochrome
		? foliageColor
		: (trunkColor ?? BARK_BROWN);

	// Breathing animation using tweened store (duration set dynamically in $effect)
	const breathValue = tweened(0, { easing: cubicInOut });

	// Animation loop for breathing effect
	// Re-runs when breathing or breathingSpeed changes, ensuring reactive duration updates
	$effect(() => {
		const duration = BREATHING_SPEEDS[breathingSpeed];

		// Disable animation if breathing is off or user prefers reduced motion
		if (!breathing || prefersReducedMotion) {
			// Use half the breathing duration for smoother exit transition
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

		return () => {
			cancelled = true;
		};
	});

	// Expansion values for breathing animation (in SVG units, tied to viewBox 417×512.238)
	// These are absolute values within the SVG coordinate system, so they scale
	// proportionally with the logo regardless of rendered size.
	const expansion = $derived($breathValue * 22);
	const diagExpansion = $derived($breathValue * 16); // ~16px at 45° angles

	// Individual branch transforms
	const leftTransform = $derived(`translate(${-expansion}, 0)`);
	const rightTransform = $derived(`translate(${expansion}, 0)`);
	const topTransform = $derived(`translate(0, ${-expansion})`);
	const topLeftTransform = $derived(`translate(${-diagExpansion}, ${-diagExpansion})`);
	const topRightTransform = $derived(`translate(${diagExpansion}, ${-diagExpansion})`);
	const bottomLeftTransform = $derived(`translate(${-diagExpansion}, ${diagExpansion})`);
	const bottomRightTransform = $derived(`translate(${diagExpansion}, ${diagExpansion})`);

	// Build animation classes (sway only, breathing uses transforms)
	const animationClass = $derived(animate && !breathing ? 'grove-logo-sway' : '');

	// Decomposed foliage paths (8 pieces) for breathing animation
	// Original path: "M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"
	// Decomposed by tracing path commands and isolating geometric boundaries where arms meet center.
	// If modifying, ensure pieces align at rest (breathValue=0) to match the original silhouette.

	// Center anchor - the hub where all branches connect (stays stationary)
	const centerPath = "M126 173.468 L171.476 124.872 L171.476 173.468 L126 173.468 M245.562 124.872 L290.972 173.268 L245.562 173.268 L245.562 124.872 M126.664 243.97 L171.476 243.97 L171.476 173.468 L126 173.468 L126.664 243.97 M290.252 243.77 L245.562 243.77 L245.562 173.268 L290.972 173.268 L290.252 243.77 M171.476 243.97 L208.519 258.11 L245.562 243.77 L245.562 173.268 L171.476 173.468 L171.476 243.97";

	// Left horizontal bar
	const leftBarPath = "M0 173.468 L126 173.468 L126.664 243.97 L0 243.97 Z";

	// Right horizontal bar
	const rightBarPath = "M290.972 173.268 L417 173.268 L417 243.77 L290.252 243.77 Z";

	// Top vertical bar
	const topBarPath = "M171.476 0 L245.562 0 L245.562 124.872 L171.476 124.872 Z";

	// Top-left diagonal branch (arrow shape)
	const topLeftDiagPath = "M126.068 173.468 L36.446 88.028 L86.037 37.043 L171.476 124.872 Z";

	// Top-right diagonal branch (arrow shape)
	const topRightDiagPath = "M245.562 124.872 L331 37.243 L380.552 88.028 L290.972 173.268 Z";

	// Bottom-left diagonal branch (arrow shape)
	const bottomLeftDiagPath = "M126.664 243.97 L36.446 331.601 L86.037 381.192 L208.519 258.11 L171.476 243.97 Z";

	// Bottom-right diagonal branch (arrow shape)
	const bottomRightDiagPath = "M290.252 243.77 L380.435 331.399 L331 381.192 L208.519 258.11 L245.562 243.77 Z";
</script>

<svg
	class="{className} {animationClass}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 417 512.238"
	aria-label="Grove logo"
>
	<!-- Trunk (always static) -->
	<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>

	{#if breathing}
		<!-- Decomposed foliage with breathing animation -->

		<!-- Center anchor (stationary) -->
		<path fill={foliageColor} d={centerPath}/>

		<!-- Left horizontal bar -->
		<g transform={leftTransform}>
			<path fill={foliageColor} d={leftBarPath}/>
		</g>

		<!-- Right horizontal bar -->
		<g transform={rightTransform}>
			<path fill={foliageColor} d={rightBarPath}/>
		</g>

		<!-- Top vertical bar -->
		<g transform={topTransform}>
			<path fill={foliageColor} d={topBarPath}/>
		</g>

		<!-- Top-left diagonal -->
		<g transform={topLeftTransform}>
			<path fill={foliageColor} d={topLeftDiagPath}/>
		</g>

		<!-- Top-right diagonal -->
		<g transform={topRightTransform}>
			<path fill={foliageColor} d={topRightDiagPath}/>
		</g>

		<!-- Bottom-left diagonal -->
		<g transform={bottomLeftTransform}>
			<path fill={foliageColor} d={bottomLeftDiagPath}/>
		</g>

		<!-- Bottom-right diagonal -->
		<g transform={bottomRightTransform}>
			<path fill={foliageColor} d={bottomRightDiagPath}/>
		</g>
	{:else}
		<!-- Original single foliage path (for non-breathing state) -->
		<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
	{/if}
</svg>

<style>
	@keyframes grove-logo-sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(1deg); }
	}

	.grove-logo-sway {
		transform-origin: center bottom;
		animation: grove-logo-sway 4s ease-in-out infinite;
	}
</style>
