<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		open?: boolean;
	}

	let {
		class: className = 'w-16 h-16',
		color,
		open = false
	}: Props = $props();

	const gateColor = $derived(color ?? bark.warmBark);
	const postColor = $derived(bark.bark);
	const hingeColor = $derived(earth.stone);
</script>

<!-- Garden gate with posts -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
	<!-- Left post -->
	<rect fill={postColor} x="5" y="10" width="10" height="90" />
	<rect fill={bark.darkBark} x="5" y="10" width="10" height="5" />
	<!-- Post cap -->
	<polygon fill={postColor} points="0,15 10,5 20,15" />

	<!-- Right post -->
	<rect fill={postColor} x="85" y="10" width="10" height="90" />
	<rect fill={bark.darkBark} x="85" y="10" width="10" height="5" />
	<!-- Post cap -->
	<polygon fill={postColor} points="80,15 90,5 100,15" />

	<!-- Gate -->
	<g transform={open ? 'rotate(-30 15 50)' : ''}>
		<!-- Gate frame -->
		<rect fill={gateColor} x="15" y="25" width="70" height="70" rx="2" />
		<!-- Inner cutout (transparent) -->
		<rect fill="#e0f2fe" x="20" y="30" width="60" height="60" rx="1" opacity="0.3" />

		<!-- Lattice pattern on gate -->
		<line x1="20" y1="30" x2="80" y2="90" stroke={gateColor} stroke-width="3" />
		<line x1="80" y1="30" x2="20" y2="90" stroke={gateColor} stroke-width="3" />
		<line x1="50" y1="30" x2="50" y2="90" stroke={gateColor} stroke-width="2" />
		<line x1="20" y1="60" x2="80" y2="60" stroke={gateColor} stroke-width="2" />

		<!-- Gate arch top -->
		<path
			fill={gateColor}
			d="M15 25 L15 20 Q50 5 85 20 L85 25 Q50 12 15 25"
		/>

		<!-- Hinges -->
		<rect fill={hingeColor} x="13" y="35" width="8" height="6" rx="1" />
		<rect fill={hingeColor} x="13" y="75" width="8" height="6" rx="1" />

		<!-- Handle -->
		<circle fill={hingeColor} cx="75" cy="60" r="4" />
		<circle fill={bark.darkBark} cx="75" cy="60" r="2" />
	</g>

	<!-- Ground line -->
	<line x1="0" y1="100" x2="100" y2="100" stroke={earth.mud} stroke-width="2" />
</svg>
