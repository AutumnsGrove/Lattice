<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, earth } from '../palette';

	interface Props {
		class?: string;
		capColor?: string;
		nutColor?: string;
	}

	let {
		class: className = 'w-4 h-5',
		capColor,
		nutColor
	}: Props = $props();

	const cap = $derived(capColor ?? bark.bark);
	const nut = $derived(nutColor ?? earth.clay);
	const capDetail = bark.darkBark;
</script>

<!-- Acorn -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40">
	<!-- Stem -->
	<path fill={capDetail} d="M15 0 Q18 0 18 4 L15 6 L12 4 Q12 0 15 0" />

	<!-- Cap -->
	<ellipse fill={cap} cx="15" cy="12" rx="13" ry="8" />
	<!-- Cap texture (crosshatch pattern suggestion) -->
	<path fill="none" stroke={capDetail} stroke-width="0.5" d="M5 10 Q15 14 25 10" opacity="0.4" />
	<path fill="none" stroke={capDetail} stroke-width="0.5" d="M4 13 Q15 17 26 13" opacity="0.3" />
	<path fill="none" stroke={capDetail} stroke-width="0.5" d="M8 8 L8 16" opacity="0.2" />
	<path fill="none" stroke={capDetail} stroke-width="0.5" d="M15 6 L15 16" opacity="0.2" />
	<path fill="none" stroke={capDetail} stroke-width="0.5" d="M22 8 L22 16" opacity="0.2" />

	<!-- Nut body -->
	<ellipse fill={nut} cx="15" cy="26" rx="11" ry="14" />

	<!-- Nut highlight -->
	<ellipse fill="white" cx="12" cy="22" rx="4" ry="5" opacity="0.15" />

	<!-- Bottom point -->
	<path fill={nut} d="M10 38 Q15 42 20 38 L15 40 Z" />
</svg>
