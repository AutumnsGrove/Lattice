<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents, greens } from '../palette';

	interface Props {
		class?: string;
		berryColor?: string;
		variant?: 'cluster' | 'single' | 'branch';
	}

	let {
		class: className = 'w-6 h-6',
		berryColor,
		variant = 'cluster'
	}: Props = $props();

	const berry = $derived(berryColor ?? accents.berry.ripe);
	const stem = greens.deepGreen;
	const highlight = 'white';
</script>

<!-- Berries -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
	{#if variant === 'single'}
		<!-- Single berry -->
		<circle fill={berry} cx="25" cy="28" r="15" />
		<circle fill={highlight} cx="20" cy="23" r="4" opacity="0.3" />
		<path fill="none" stroke={stem} stroke-width="2" d="M25 13 Q25 5 20 2" />
		<!-- Calyx -->
		<path fill={stem} d="M20 14 L25 18 L30 14 L28 16 L25 14 L22 16 Z" />
	{:else if variant === 'cluster'}
		<!-- Berry cluster -->
		<path fill="none" stroke={stem} stroke-width="1.5" d="M25 5 L25 15 M25 15 L18 22 M25 15 L32 22 M25 15 L25 25" />

		<circle fill={berry} cx="18" cy="28" r="10" />
		<circle fill={highlight} cx="14" cy="24" r="2.5" opacity="0.3" />

		<circle fill={berry} cx="32" cy="28" r="10" />
		<circle fill={highlight} cx="28" cy="24" r="2.5" opacity="0.3" />

		<circle fill={berry} cx="25" cy="38" r="10" />
		<circle fill={highlight} cx="21" cy="34" r="2.5" opacity="0.3" />
	{:else}
		<!-- Berry branch -->
		<path fill="none" stroke={stem} stroke-width="2" d="M5 25 Q15 20 25 22 Q35 24 45 20" />
		<!-- Leaves -->
		<ellipse fill={stem} cx="12" cy="22" rx="5" ry="3" transform="rotate(-20 12 22)" />
		<ellipse fill={stem} cx="38" cy="20" rx="5" ry="3" transform="rotate(15 38 20)" />

		<!-- Berries along branch -->
		<circle fill={berry} cx="18" cy="28" r="6" />
		<circle fill={highlight} cx="16" cy="26" r="1.5" opacity="0.3" />

		<circle fill={berry} cx="28" cy="30" r="6" />
		<circle fill={highlight} cx="26" cy="28" r="1.5" opacity="0.3" />

		<circle fill={berry} cx="22" cy="36" r="5" />
		<circle fill={highlight} cx="20" cy="34" r="1.2" opacity="0.3" />

		<circle fill={berry} cx="32" cy="38" r="5" />
		<circle fill={highlight} cx="30" cy="36" r="1.2" opacity="0.3" />
	{/if}
</svg>
