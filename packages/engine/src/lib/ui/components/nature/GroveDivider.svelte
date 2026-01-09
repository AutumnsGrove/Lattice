<!--
  Grove — A place to Be
  Copyright (c) 2026 Autumn Brown
  Licensed under AGPL-3.0

  GroveDivider - A decorative divider featuring alternating Grove logos

  Props:
    count     - Number of logos (default: 7)
    size      - 'xs' | 'sm' | 'md' | 'lg' (default: 'sm')
    glass     - Use GlassLogo instead of regular Logo
    variant   - Glass variant: 'default' | 'accent' | 'frosted' | 'dark' | 'ethereal'
    vertical  - Display vertically instead of horizontally
    breathing - Enable breathing animation
    monochrome - Trunk matches foliage color
    color     - Custom color override (regular Logo only)
    season    - Override season (uses seasonStore by default)
    gap       - Tailwind gap class (default: 'gap-1.5')
    spacing   - Gap in pixels or rem (overrides gap if provided)
    rotation  - Logo rotation mode: 'default' | 'left-right' | 'up-down' (default: auto based on orientation)
    class     - Additional CSS classes
-->
<script lang="ts">
	import Logo from './Logo.svelte';
	import GlassLogo from '../ui/GlassLogo.svelte';
	import type { GlassVariant } from '../ui/types';
	import type { Season } from './palette';
	import { seasonStore } from '../../stores/season';

	type RotationMode = 'default' | 'left-right' | 'up-down';

	interface Props {
		/** Number of logos to display (default: 7) */
		count?: number;
		/** Size of each logo: 'xs' | 'sm' | 'md' | 'lg' (default: 'sm') */
		size?: 'xs' | 'sm' | 'md' | 'lg';
		/** Override the season (uses seasonStore by default) */
		season?: Season;
		/** Additional CSS classes */
		class?: string;
		/** Gap between logos (Tailwind gap class, e.g., 'gap-1', 'gap-2') */
		gap?: string;
		/** Spacing in pixels or rem (e.g., '8px', '0.5rem') - overrides gap if provided */
		spacing?: string;
		/** Logo rotation mode: 'default' auto-selects based on orientation, 'left-right' alternates horizontal rotation, 'up-down' alternates vertical rotation */
		rotation?: RotationMode;
		/** Use GlassLogo instead of regular Logo */
		glass?: boolean;
		/** Glass variant (only applies when glass=true) */
		variant?: GlassVariant;
		/** Add breathing animation to logos */
		breathing?: boolean;
		/** Monochrome mode - trunk matches foliage color */
		monochrome?: boolean;
		/** Custom color override (for regular Logo) */
		color?: string;
		/** Display vertically instead of horizontally */
		vertical?: boolean;
	}

	let {
		count = 7,
		size = 'sm',
		season,
		class: className = '',
		gap = 'gap-1.5',
		spacing,
		rotation = 'default',
		glass = false,
		variant = 'default',
		breathing = false,
		monochrome = false,
		color,
		vertical = false
	}: Props = $props();

	// Size mappings
	const sizeClasses = {
		xs: 'w-3 h-3',
		sm: 'w-4 h-4',
		md: 'w-5 h-5',
		lg: 'w-6 h-6'
	};

	// Generate array for iteration
	const logos = $derived(Array.from({ length: count }, (_, i) => i));

	// Determine effective rotation mode based on orientation
	// - 'default': vertical orientation uses 'left-right', horizontal uses 'up-down'
	// - 'left-right': logos alternate rotating 90deg left and right (horizontal tilt)
	// - 'up-down': logos alternate upright and upside-down (180deg rotation)
	const effectiveRotation = $derived(
		rotation === 'default'
			? (vertical ? 'left-right' : 'up-down')
			: rotation
	);

	// Get rotation class based on mode and index
	function getRotationClass(index: number): string {
		if (index % 2 === 0) return ''; // Even indices: no rotation
		// Odd indices: apply rotation based on mode
		return effectiveRotation === 'left-right' ? 'rotate-90' : 'rotate-180';
	}

	const activeSeason = $derived(season ?? $seasonStore);

	// Compute inline style for spacing (overrides gap class)
	const containerStyle = $derived(spacing ? `gap: ${spacing}` : '');
</script>

<div
	class="flex items-center justify-center {spacing ? '' : gap} {vertical ? 'flex-col' : 'flex-row'} {className}"
	style={containerStyle}
	role="separator"
	aria-hidden="true"
>
	{#each logos as index}
		<div class={getRotationClass(index)}>
			{#if glass}
				<GlassLogo
					class={sizeClasses[size]}
					season={activeSeason}
					{variant}
					{breathing}
					{monochrome}
				/>
			{:else}
				<Logo
					class={sizeClasses[size]}
					season={activeSeason}
					{color}
					breathing={breathing}
				/>
			{/if}
		</div>
	{/each}
</div>
