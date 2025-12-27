<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		speed?: 'slow' | 'normal' | 'fast';
	}

	let {
		class: className = 'w-20 h-6',
		color = 'white',
		animate = true,
		speed = 'slow'
	}: Props = $props();

	const duration = $derived(
		{
			slow: '80s',
			normal: '50s',
			fast: '30s'
		}[speed]
	);
</script>

<!-- Thin wispy cirrus cloud -->
<svg
	class="{className} {animate ? 'drift' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 120 30"
	style="--drift-duration: {duration}"
>
	<!-- Main wispy cloud body - soft feathery shapes -->
	<g opacity="0.5">
		<!-- Central wisp strand with soft cloud-like bulges -->
		<ellipse fill={color} cx="60" cy="15" rx="50" ry="4" opacity="0.4" />

		<!-- Feathery tendrils extending from main body -->
		<ellipse fill={color} cx="25" cy="13" rx="18" ry="5" opacity="0.5" />
		<ellipse fill={color} cx="50" cy="11" rx="15" ry="4" opacity="0.45" />
		<ellipse fill={color} cx="75" cy="14" rx="20" ry="5" opacity="0.5" />
		<ellipse fill={color} cx="100" cy="12" rx="15" ry="4" opacity="0.4" />

		<!-- Upper wisps -->
		<ellipse fill={color} cx="35" cy="8" rx="12" ry="3" opacity="0.35" />
		<ellipse fill={color} cx="65" cy="7" rx="10" ry="3" opacity="0.3" />
		<ellipse fill={color} cx="90" cy="9" rx="14" ry="3" opacity="0.35" />

		<!-- Lower tendrils for depth -->
		<ellipse fill={color} cx="40" cy="18" rx="10" ry="2.5" opacity="0.3" />
		<ellipse fill={color} cx="70" cy="19" rx="12" ry="3" opacity="0.35" />
		<ellipse fill={color} cx="95" cy="17" rx="8" ry="2" opacity="0.25" />

		<!-- Fine wispy edges -->
		<ellipse fill={color} cx="15" cy="14" rx="8" ry="2" opacity="0.25" />
		<ellipse fill={color} cx="110" cy="13" rx="8" ry="2" opacity="0.25" />
	</g>

	<!-- Secondary wisp layer for more depth -->
	<g opacity="0.35">
		<ellipse fill={color} cx="45" cy="20" rx="25" ry="3" opacity="0.4" />
		<ellipse fill={color} cx="80" cy="6" rx="20" ry="2.5" opacity="0.35" />
	</g>
</svg>

<style>
	@keyframes drift {
		0% { transform: translateX(0); }
		100% { transform: translateX(20px); }
	}

	.drift {
		animation: drift var(--drift-duration, 80s) ease-in-out infinite alternate;
	}
</style>
