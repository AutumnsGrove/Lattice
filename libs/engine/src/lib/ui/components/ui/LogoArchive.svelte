<script lang="ts">
	/**
	 * LogoArchive - Legacy Grove Asterisk Logo (Archived)
	 *
	 * This is the original asterisk-style Grove logo, preserved for
	 * backwards compatibility and historical reference.
	 *
	 * For new implementations, use the updated Logo component which
	 * features the new tree design with seasonal variants.
	 *
	 * @deprecated Use Logo.svelte for new implementations
	 *
	 * @example Basic usage
	 * ```svelte
	 * <LogoArchive />  <!-- Summer green by default -->
	 * <LogoArchive season="spring" />  <!-- Cherry blossom pink -->
	 * <LogoArchive season="autumn" />  <!-- Warm orange -->
	 * <LogoArchive season="winter" />  <!-- Frosted green -->
	 * ```
	 *
	 * @example Loading state (breathing animation)
	 * ```svelte
	 * <LogoArchive breathing />
	 * <LogoArchive breathing breathingSpeed="slow" />
	 * ```
	 */

	import { tweened } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';
	import { browser } from '$app/environment';

	type Season = 'spring' | 'summer' | 'autumn' | 'winter';
	type BreathingSpeed = 'slow' | 'normal' | 'fast';

	// Seasonal color palette - matches GlassLogo for consistency
	const seasonalColors = {
		spring: '#f472b6',    // pink-400 - cherry blossom
		summer: '#10b981',    // emerald-500 - lush growth
		autumn: '#fb923c',    // orange-400 - warm harvest
		winter: '#86efac'     // green-300 - frosted evergreen
	} as const;

	interface Props {
		class?: string;
		/** Seasonal color theme - defaults to summer */
		season?: Season;
		/** Custom foliage color - overrides season if provided */
		color?: string;
		/** Trunk color - defaults to classic bark brown */
		trunkColor?: string;
		/** Whether foliage and trunk should be the same color */
		monochrome?: boolean;
		/** Add breathing animation (for loading states, not lists) */
		breathing?: boolean;
		/** Breathing animation speed - 'slow' (1500ms), 'normal' (800ms), 'fast' (400ms) */
		breathingSpeed?: BreathingSpeed;
	}

	let {
		class: className = 'w-6 h-6',
		season = 'summer',
		color,
		trunkColor,
		monochrome = false,
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

	// Compute actual colors - use custom color if provided, otherwise use seasonal color
	const foliageColor = $derived(color ?? seasonalColors[season]);
	const actualTrunkColor = $derived(monochrome
		? foliageColor
		: (trunkColor ?? BARK_BROWN));

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

	// Decomposed foliage paths for breathing animation
	// Each bar extends toward the center so they overlap at rest, forming the complete logo
	// When expanded, the overlapping regions separate creating the burst effect

	// Left horizontal bar - extends right to center
	const leftBarPath = "M0 173.468 L171.476 173.468 L171.476 243.97 L0 243.97 Z";

	// Right horizontal bar - extends left to center
	const rightBarPath = "M245.562 173.268 L417 173.268 L417 243.77 L245.562 243.77 Z";

	// Top vertical bar - extends down to center
	const topBarPath = "M171.476 0 L245.562 0 L245.562 173.468 L171.476 173.468 Z";

	// Top-left diagonal - arrow with extended inner edge
	const topLeftDiagPath = "M171.476 173.468 L171.476 124.872 L86.037 37.043 L36.446 88.028 L126 173.468 Z";

	// Top-right diagonal - arrow with extended inner edge
	const topRightDiagPath = "M245.562 173.268 L245.562 124.872 L331 37.243 L380.552 88.028 L290.972 173.268 Z";

	// Bottom-left diagonal - arrow with extended inner edge to center point
	const bottomLeftDiagPath = "M171.476 243.97 L208.519 258.11 L86.037 381.192 L36.446 331.601 L126.664 243.97 Z";

	// Bottom-right diagonal - arrow with extended inner edge to center point
	const bottomRightDiagPath = "M245.562 243.77 L208.519 258.11 L331 381.192 L380.435 331.399 L290.252 243.77 Z";
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 -30 417 542.238"
	aria-label="Grove logo (legacy)"
>
	<!-- Trunk (always static) -->
	<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>

	{#if breathing}
		<!-- Decomposed foliage with breathing animation - bars expand outward from center -->

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
