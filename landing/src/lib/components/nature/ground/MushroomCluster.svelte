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
	}

	let {
		class: className = 'w-8 h-8',
		capColor,
		stemColor
	}: Props = $props();

	const cap = $derived(capColor ?? accents.mushroom.brownCap);
	const stem = $derived(stemColor ?? earth.sand);
</script>

<!-- Cluster of small mushrooms -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60">
	<!-- Large mushroom (center) -->
	<path fill={stem} d="M36 32 Q34 45 33 60 L47 60 Q46 45 44 32 Q40 30 36 32" />
	<ellipse fill={cap} cx="40" cy="24" rx="18" ry="14" />
	<ellipse fill={cap} cx="40" cy="32" rx="12" ry="4" />

	<!-- Small mushroom (left) -->
	<path fill={stem} d="M12 42 Q11 50 10 60 L22 60 Q21 50 20 42 Q16 40 12 42" />
	<ellipse fill={cap} cx="16" cy="36" rx="12" ry="10" />
	<ellipse fill={cap} cx="16" cy="42" rx="8" ry="3" />

	<!-- Tiny mushroom (right) -->
	<path fill={stem} d="M60 48 Q59 54 58 60 L68 60 Q67 54 66 48 Q63 46 60 48" />
	<ellipse fill={cap} cx="63" cy="43" rx="9" ry="7" />
	<ellipse fill={cap} cx="63" cy="48" rx="6" ry="2" />
</svg>
