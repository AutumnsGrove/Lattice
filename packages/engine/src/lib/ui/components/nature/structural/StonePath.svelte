<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { earth } from '../palette';

	interface Props {
		class?: string;
		stoneColor?: string;
	}

	let {
		class: className = 'w-16 h-8',
		stoneColor
	}: Props = $props();

	const stone = $derived(stoneColor ?? earth.stone);
	const highlight = $derived(earth.pebble);
	const shadow = $derived(earth.slate);
</script>

<!-- Stepping stones path -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40">
	<!-- Stone 1 (left) -->
	<ellipse fill={stone} cx="18" cy="22" rx="16" ry="10" />
	<ellipse fill={highlight} cx="14" cy="19" rx="6" ry="4" opacity="0.2" />
	<ellipse fill={shadow} cx="22" cy="26" rx="8" ry="4" opacity="0.15" />

	<!-- Stone 2 (center-left) -->
	<ellipse fill={stone} cx="42" cy="18" rx="14" ry="9" />
	<ellipse fill={highlight} cx="38" cy="15" rx="5" ry="3" opacity="0.2" />

	<!-- Stone 3 (center) -->
	<ellipse fill={stone} cx="62" cy="24" rx="13" ry="8" />
	<ellipse fill={highlight} cx="58" cy="21" rx="5" ry="3" opacity="0.2" />
	<ellipse fill={shadow} cx="66" cy="27" rx="6" ry="3" opacity="0.15" />

	<!-- Stone 4 (right) -->
	<ellipse fill={stone} cx="85" cy="20" rx="12" ry="9" />
	<ellipse fill={highlight} cx="82" cy="17" rx="4" ry="3" opacity="0.2" />

	<!-- Small pebbles between -->
	<circle fill={earth.pebble} cx="30" cy="28" r="3" opacity="0.6" />
	<circle fill={earth.pebble} cx="52" cy="32" r="2" opacity="0.5" />
	<circle fill={earth.pebble} cx="74" cy="30" r="2.5" opacity="0.5" />
</svg>
