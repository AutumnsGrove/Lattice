<!--
  Grove — A place to Be
  Copyright (c) 2026 Autumn Brown
  Licensed under AGPL-3.0

  GroveDivider - A decorative divider featuring alternating Grove logos

  @example Basic usage
  ```svelte
  <GroveDivider />                    <!-- 7 logos (default) -->
  <GroveDivider count={5} />          <!-- 5 logos -->
  <GroveDivider count={12} size="md" /> <!-- 12 medium logos -->
  ```

  @example Glass variant
  ```svelte
  <GroveDivider glass />                          <!-- Glass logos -->
  <GroveDivider glass variant="frosted" />        <!-- Frosted glass -->
  <GroveDivider glass variant="ethereal" breathing /> <!-- Dreamy animated -->
  ```
-->
<script lang="ts">
	import Logo from './Logo.svelte';
	import GlassLogo from '../ui/GlassLogo.svelte';
	import type { Season } from './palette';
	import { seasonStore } from '../../stores/season';

	type GlassVariant = 'default' | 'accent' | 'frosted' | 'dark' | 'ethereal';

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
	}

	let {
		count = 7,
		size = 'sm',
		season,
		class: className = '',
		gap = 'gap-1.5',
		glass = false,
		variant = 'default',
		breathing = false,
		monochrome = false,
		color
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

	// Determine if a logo should be flipped (every odd index)
	function isFlipped(index: number): boolean {
		return index % 2 === 1;
	}

	const activeSeason = $derived(season ?? $seasonStore);
</script>

<div
	class="flex items-center justify-center {gap} {className}"
	role="separator"
	aria-hidden="true"
>
	{#each logos as index}
		<div class={isFlipped(index) ? 'rotate-180' : ''}>
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
