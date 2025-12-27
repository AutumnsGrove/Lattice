<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth } from '../palette';

	interface Props {
		class?: string;
		barkColor?: string;
	}

	let {
		class: className = 'w-12 h-4',
		barkColor
	}: Props = $props();

	const barkFill = $derived(barkColor ?? bark.warmBark);
	const innerColor = earth.sand;
	const ringColor = bark.bark;
</script>

<!-- Fallen log -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 35">
	<!-- Main log body -->
	<path fill={barkFill} d="M15 8 L85 5 Q95 10 95 20 Q95 30 85 32 L15 30 Q5 25 5 18 Q5 12 15 8" />

	<!-- Log end (cut face) -->
	<ellipse fill={innerColor} cx="90" cy="18" rx="8" ry="14" />
	<ellipse fill="none" stroke={ringColor} stroke-width="1" cx="90" cy="18" rx="5" ry="10" opacity="0.5" />
	<ellipse fill="none" stroke={ringColor} stroke-width="0.5" cx="90" cy="18" rx="2" ry="5" opacity="0.4" />

	<!-- Bark texture -->
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M20 10 Q22 18 20 28" opacity="0.3" />
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M40 8 Q42 18 40 30" opacity="0.3" />
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M60 6 Q62 17 60 31" opacity="0.3" />
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M75 6 Q77 17 75 31" opacity="0.3" />

	<!-- Highlight -->
	<path fill={earth.clay} d="M20 10 Q50 6 80 7 Q50 12 20 14" opacity="0.2" />
</svg>
