<script lang="ts">
	import { winter } from '../palette';
	import SnowflakeFalling from './SnowflakeFalling.svelte';

	type SnowflakeVariant = 'crystal' | 'simple' | 'star' | 'delicate' | 'dot';

	// Animation constants
	const SNOW_OPACITY = { min: 0.4, max: 0.9 } as const;
	const FALL_DURATION = { min: 10, max: 18 } as const;
	const FALL_DISTANCE = { min: 100, max: 120 } as const;
	const DRIFT_RANGE = 15; // -7.5 to +7.5 vw
	const SPAWN_DELAY_MAX = 12;

	interface Props {
		/** Total number of snowflakes */
		count?: number;
		/** Base z-index for the snow layer */
		zIndex?: number;
		/** Enable snowfall animation */
		enabled?: boolean;
	}

	let {
		count = 60,
		zIndex = 50,
		enabled = true
	}: Props = $props();

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

	// Deterministic hash for natural distribution
	function hashSeed(seed: number): number {
		return Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
	}

	// Generate snowflakes across the viewport
	function generateSnowflakes(): Snowflake[] {
		const snowflakes: Snowflake[] = [];

		for (let i = 0; i < count; i++) {
			// Distribute across full width with some randomness
			const x = (i / count) * 100 + (Math.random() - 0.5) * 10;

			// Start above viewport with staggered heights
			const y = -5 - Math.random() * 15;

			// Size based on "depth" - smaller = further away
			const depthFactor = Math.random();
			const size = 4 + depthFactor * 12; // 4-16px

			// Distant flakes are smaller dots, close ones are detailed crystals
			let variant: SnowflakeVariant;
			if (depthFactor < 0.3) {
				variant = 'dot';
			} else if (depthFactor < 0.5) {
				variant = 'simple';
			} else {
				variant = snowflakeVariants[Math.floor(hashSeed(i)) % 4] as SnowflakeVariant;
			}

			snowflakes.push({
				id: i,
				x,
				y,
				size,
				variant,
				duration: FALL_DURATION.min + Math.random() * (FALL_DURATION.max - FALL_DURATION.min),
				delay: Math.random() * SPAWN_DELAY_MAX,
				drift: (Math.random() - 0.5) * DRIFT_RANGE,
				opacity: SNOW_OPACITY.min + depthFactor * (SNOW_OPACITY.max - SNOW_OPACITY.min),
				fallDistance: FALL_DISTANCE.min + Math.random() * (FALL_DISTANCE.max - FALL_DISTANCE.min)
			});
		}

		return snowflakes;
	}

	// Generate snowflakes once
	const snowflakes = generateSnowflakes();
</script>

{#if enabled}
	<!-- Snowfall layer - covers the viewport -->
	<div
		class="fixed inset-0 pointer-events-none overflow-hidden"
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
