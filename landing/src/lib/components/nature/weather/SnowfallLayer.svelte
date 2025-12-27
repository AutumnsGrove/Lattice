<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { winter } from '../palette';
	import SnowflakeFalling from './SnowflakeFalling.svelte';

	type SnowflakeVariant = 'crystal' | 'simple' | 'star' | 'delicate' | 'dot';

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	interface Props {
		/** Total number of snowflakes */
		count?: number;
		/** Base z-index for the snow layer */
		zIndex?: number;
		/** Enable snowfall animation */
		enabled?: boolean;
		/** Opacity range for snowflakes (depth affects final value) */
		opacity?: { min: number; max: number };
		/** Fall duration range in seconds (slower = gentler snowfall) */
		fallDuration?: { min: number; max: number };
		/** Horizontal drift range in vw units (higher = more wind) */
		driftRange?: number;
		/** Maximum spawn delay in seconds (staggers initial appearance) */
		spawnDelay?: number;
	}

	let {
		count = 60,
		zIndex = 50,
		enabled = true,
		opacity = { min: 0.4, max: 0.9 },
		fallDuration = { min: 10, max: 18 },
		driftRange = 15,
		spawnDelay = 12
	}: Props = $props();

	// Derived animation constants from props
	const FALL_DISTANCE = { min: 100, max: 120 } as const;

	// Reduce snowflake count for reduced motion or use fewer for performance
	const actualCount = $derived(prefersReducedMotion ? Math.floor(count / 4) : count);

	const snowflakeVariants: SnowflakeVariant[] = ['crystal', 'simple', 'star', 'delicate', 'dot'];

	interface Snowflake {
		id: number;
		x: number;
		y: number;
		size: number;
		variant: SnowflakeVariant;
		duration: number;
		delay: number;
		drift: number;
		opacity: number;
		fallDistance: number;
	}

	// Deterministic hash for natural distribution (returns 0-1 range)
	// Using different prime multipliers for each property ensures varied but consistent results
	function hashRandom(seed: number): number {
		const hash = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
		return hash - Math.floor(hash); // Fractional part gives 0-1 range
	}

	// Generate snowflakes across the viewport
	// All randomization is deterministic to prevent SSR hydration mismatches
	function generateSnowflakes(): Snowflake[] {
		const snowflakes: Snowflake[] = [];

		for (let i = 0; i < actualCount; i++) {
			// Use different seed multipliers for each property to get varied distributions
			const xRand = hashRandom(i * 7);
			const yRand = hashRandom(i * 11);
			const depthRand = hashRandom(i * 13);
			const durationRand = hashRandom(i * 17);
			const delayRand = hashRandom(i * 19);
			const driftRand = hashRandom(i * 23);
			const distanceRand = hashRandom(i * 29);

			// Distribute across full width with some randomness
			const x = (i / actualCount) * 100 + (xRand - 0.5) * 10;

			// Start positions: most above viewport, some within for immediate visibility
			// This creates a natural "already snowing" effect on page load
			const y = yRand < 0.3
				? yRand * 80  // 30% start within viewport (0-24% from top)
				: -5 - yRand * 15; // 70% start above viewport

			// Depth-based sizing algorithm:
			// depthFactor 0.0 = far away (small, simple dots, lower opacity)
			// depthFactor 1.0 = close up (large, detailed crystals, higher opacity)
			// This creates a parallax-like depth effect with smaller background flakes
			const depthFactor = depthRand;
			const size = 8 + depthFactor * 16; // 8-24px range for better visibility

			// Variant selection based on depth:
			// - Far (0.0-0.3): tiny dots for distant snow
			// - Mid (0.3-0.5): simple shapes
			// - Close (0.5-1.0): detailed crystal/star/delicate variants (excludes dot)
			let variant: SnowflakeVariant;
			if (depthFactor < 0.3) {
				variant = 'dot';
			} else if (depthFactor < 0.5) {
				variant = 'simple';
			} else {
				// Use % 4 intentionally to select from first 4 variants (crystal, simple, star, delicate)
				// This excludes 'dot' which is reserved for distant snowflakes
				variant = snowflakeVariants[Math.floor(hashRandom(i) * 4)] as SnowflakeVariant;
			}

			// Snowflakes starting in viewport get minimal delay for immediate visibility
			const isInViewport = y >= 0;
			const actualDelay = isInViewport ? delayRand * 2 : delayRand * spawnDelay;

			snowflakes.push({
				id: i,
				x,
				y,
				size,
				variant,
				duration: fallDuration.min + durationRand * (fallDuration.max - fallDuration.min),
				delay: actualDelay,
				drift: (driftRand - 0.5) * driftRange,
				opacity: opacity.min + depthFactor * (opacity.max - opacity.min),
				fallDistance: FALL_DISTANCE.min + distanceRand * (FALL_DISTANCE.max - FALL_DISTANCE.min)
			});
		}

		return snowflakes;
	}

	// Generate snowflakes once
	const snowflakes = $derived(generateSnowflakes());
</script>

{#if enabled}
	<!-- Snowfall layer - covers the page content area -->
	<div
		class="absolute inset-0 pointer-events-none overflow-hidden"
		style="z-index: {zIndex};"
	>
		{#each snowflakes as flake (flake.id)}
			<div
				class="absolute"
				style="
					left: {flake.x}%;
					top: {flake.y}%;
					width: {flake.size}px;
					height: {flake.size}px;
				"
			>
				<SnowflakeFalling
					class="w-full h-full"
					variant={flake.variant}
					color={winter.snow}
					duration={flake.duration}
					delay={flake.delay}
					drift={flake.drift}
					fallDistance={flake.fallDistance}
					opacity={flake.opacity}
					seed={flake.id}
					animate={true}
				/>
			</div>
		{/each}
	</div>
{/if}
