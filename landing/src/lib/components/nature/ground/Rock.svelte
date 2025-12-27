<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { earth } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		variant?: 'round' | 'flat' | 'jagged';
	}

	let {
		class: className = 'w-6 h-4',
		color,
		variant = 'round'
	}: Props = $props();

	const rockColor = $derived(color ?? earth.stone);
	const highlightColor = earth.pebble;
	const shadowColor = earth.slate;
</script>

<!-- Rock/stone - matte natural appearance -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
	{#if variant === 'round'}
		<!-- Rounded boulder with natural matte finish -->
		<ellipse fill={rockColor} cx="30" cy="26" rx="27" ry="14" />
		<!-- Subtle surface variation instead of shiny highlight -->
		<ellipse fill={highlightColor} cx="22" cy="22" rx="8" ry="4" opacity="0.15" />
		<ellipse fill={highlightColor} cx="35" cy="20" rx="5" ry="3" opacity="0.1" />
		<!-- Darker underside shadow -->
		<ellipse fill={shadowColor} cx="30" cy="32" rx="20" ry="5" opacity="0.15" />
		<!-- Surface texture marks -->
		<path fill={shadowColor} d="M18 24 Q20 26 22 24" opacity="0.12" stroke={shadowColor} stroke-width="0.5" />
		<path fill={shadowColor} d="M38 22 Q40 24 42 23" opacity="0.1" stroke={shadowColor} stroke-width="0.5" />
	{:else if variant === 'flat'}
		<!-- Flat stepping stone with weathered look -->
		<ellipse fill={rockColor} cx="30" cy="28" rx="27" ry="11" />
		<!-- Subtle worn surface -->
		<ellipse fill={highlightColor} cx="24" cy="26" rx="12" ry="4" opacity="0.12" />
		<ellipse fill={highlightColor} cx="38" cy="25" rx="6" ry="3" opacity="0.08" />
		<!-- Surface cracks/weathering -->
		<path fill="none" stroke={shadowColor} stroke-width="0.5" d="M20 28 L28 27" opacity="0.15" />
		<path fill="none" stroke={shadowColor} stroke-width="0.5" d="M35 29 L40 28" opacity="0.12" />
	{:else}
		<!-- Jagged rock with rough texture -->
		<polygon fill={rockColor} points="5,40 15,22 28,38 38,12 48,28 55,18 58,40" />
		<!-- Muted face highlights -->
		<polygon fill={highlightColor} points="15,22 28,38 38,12 32,20 24,32" opacity="0.12" />
		<!-- Shadowed face -->
		<polygon fill={shadowColor} points="38,12 48,28 55,18 58,40 48,38 44,25" opacity="0.15" />
		<!-- Surface texture -->
		<path fill="none" stroke={shadowColor} stroke-width="0.5" d="M22 30 L26 28" opacity="0.15" />
		<path fill="none" stroke={shadowColor} stroke-width="0.5" d="M42 25 L46 28" opacity="0.12" />
	{/if}
</svg>
