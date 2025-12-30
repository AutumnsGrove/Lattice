<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth, accents } from '../palette';

	interface Props {
		class?: string;
		bodyColor?: string;
		roofColor?: string;
	}

	let {
		class: className = 'w-8 h-12',
		bodyColor,
		roofColor
	}: Props = $props();

	const body = $derived(bodyColor ?? earth.sand);
	const roof = $derived(roofColor ?? bark.warmBark);
	const pole = bark.bark;
	const hole = bark.darkBark;
	const perch = bark.lightBark;
</script>

<!-- Birdhouse on pole -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 80">
	<!-- Pole -->
	<rect fill={pole} x="22" y="50" width="6" height="30" />

	<!-- House body -->
	<rect fill={body} x="10" y="25" width="30" height="28" rx="2" />

	<!-- Roof -->
	<polygon fill={roof} points="5,27 25,8 45,27" />
	<!-- Roof overhang shadow -->
	<polygon fill={bark.darkBark} points="8,27 25,12 42,27 40,27 25,14 10,27" opacity="0.3" />

	<!-- Entrance hole -->
	<circle fill={hole} cx="25" cy="38" r="6" />

	<!-- Perch -->
	<rect fill={perch} x="22" y="48" width="6" height="3" rx="1" />
	<ellipse fill={perch} cx="25" cy="51" rx="4" ry="2" />

	<!-- Roof detail lines -->
	<line x1="25" y1="10" x2="25" y2="26" stroke={bark.darkBark} stroke-width="1" opacity="0.3" />

	<!-- Body highlight -->
	<rect fill="white" x="12" y="27" width="8" height="24" rx="1" opacity="0.1" />
</svg>
