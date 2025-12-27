<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents, earth } from '../palette';

	interface Props {
		class?: string;
		capColor?: string;
		stemColor?: string;
		spotted?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		capColor,
		stemColor,
		spotted = true
	}: Props = $props();

	const cap = $derived(capColor ?? accents.mushroom.redCap);
	const stem = $derived(stemColor ?? earth.sand);
	const spots = accents.mushroom.spots;
</script>

<!-- Classic toadstool mushroom -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 70">
	<!-- Stem -->
	<path fill={stem} d="M22 40 Q20 55 18 70 L42 70 Q40 55 38 40 Q30 38 22 40" />

	<!-- Cap -->
	<ellipse fill={cap} cx="30" cy="28" rx="28" ry="20" />
	<ellipse fill={cap} cx="30" cy="38" rx="20" ry="6" />

	<!-- Spots -->
	{#if spotted}
		<circle fill={spots} cx="20" cy="22" r="4" />
		<circle fill={spots} cx="38" cy="18" r="5" />
		<circle fill={spots} cx="30" cy="30" r="3" />
		<circle fill={spots} cx="44" cy="28" r="3" />
		<circle fill={spots} cx="14" cy="32" r="2.5" />
	{/if}

	<!-- Cap underside hint -->
	<ellipse fill={accents.mushroom.gill} cx="30" cy="40" rx="14" ry="3" opacity="0.6" />
</svg>
