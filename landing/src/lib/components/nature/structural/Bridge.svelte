<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth } from '../palette';

	interface Props {
		class?: string;
		woodColor?: string;
	}

	let {
		class: className = 'w-20 h-12',
		woodColor
	}: Props = $props();

	const wood = $derived(woodColor ?? bark.warmBark);
	const railColor = $derived(bark.bark);
	const shadow = $derived(bark.darkBark);
</script>

<!-- Small wooden bridge -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 70">
	<!-- Shadow under bridge -->
	<ellipse fill="rgba(0,0,0,0.1)" cx="60" cy="65" rx="55" ry="8" />

	<!-- Bridge deck (arched) -->
	<path
		fill={wood}
		d="M5 50 Q60 30 115 50 L115 58 Q60 38 5 58 Z"
	/>

	<!-- Deck planks -->
	<line x1="20" y1="42" x2="20" y2="54" stroke={shadow} stroke-width="1" opacity="0.3" />
	<line x1="35" y1="38" x2="35" y2="50" stroke={shadow} stroke-width="1" opacity="0.3" />
	<line x1="50" y1="35" x2="50" y2="47" stroke={shadow} stroke-width="1" opacity="0.3" />
	<line x1="65" y1="34" x2="65" y2="46" stroke={shadow} stroke-width="1" opacity="0.3" />
	<line x1="80" y1="36" x2="80" y2="48" stroke={shadow} stroke-width="1" opacity="0.3" />
	<line x1="95" y1="40" x2="95" y2="52" stroke={shadow} stroke-width="1" opacity="0.3" />

	<!-- Left railing -->
	<rect fill={railColor} x="8" y="25" width="4" height="30" rx="1" />
	<rect fill={railColor} x="22" y="20" width="4" height="28" rx="1" />
	<!-- Railing top bar -->
	<path fill="none" stroke={railColor} stroke-width="3" d="M10 25 Q30 15 40 18" />

	<!-- Right railing -->
	<rect fill={railColor} x="108" y="25" width="4" height="30" rx="1" />
	<rect fill={railColor} x="94" y="20" width="4" height="28" rx="1" />
	<!-- Railing top bar -->
	<path fill="none" stroke={railColor} stroke-width="3" d="M110 25 Q90 15 80 18" />

	<!-- Deck edge highlight -->
	<path
		fill={bark.lightBark}
		d="M8 50 Q60 30 112 50 L112 52 Q60 32 8 52 Z"
		opacity="0.3"
	/>

	<!-- Ground at ends -->
	<ellipse fill={earth.mud} cx="10" cy="60" rx="12" ry="5" opacity="0.5" />
	<ellipse fill={earth.mud} cx="110" cy="60" rx="12" ry="5" opacity="0.5" />
</svg>
