<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { accents } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-20 h-12',
		color,
		animate = true
	}: Props = $props();

	const waterColor = $derived(color ?? accents.water.surface);
	const deepColor = $derived(accents.water.deep);
</script>

<!-- Pond with subtle ripple effect -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">
	<defs>
		<ellipse id="pond-shape" cx="60" cy="35" rx="55" ry="25" />
		<clipPath id="pond-clip">
			<use href="#pond-shape" />
		</clipPath>
	</defs>

	<!-- Water body -->
	<ellipse fill={deepColor} cx="60" cy="35" rx="55" ry="25" />
	<ellipse fill={waterColor} cx="60" cy="32" rx="52" ry="22" opacity="0.7" />

	<!-- Ripples -->
	<g clip-path="url(#pond-clip)">
		<ellipse
			fill="none"
			stroke="white"
			stroke-width="1"
			cx="40"
			cy="30"
			rx="8"
			ry="4"
			opacity="0.3"
			class={animate ? 'ripple ripple-1' : ''}
		/>
		<ellipse
			fill="none"
			stroke="white"
			stroke-width="0.5"
			cx="40"
			cy="30"
			rx="15"
			ry="7"
			opacity="0.2"
			class={animate ? 'ripple ripple-2' : ''}
		/>
		<ellipse
			fill="none"
			stroke="white"
			stroke-width="1"
			cx="75"
			cy="38"
			rx="6"
			ry="3"
			opacity="0.25"
			class={animate ? 'ripple ripple-3' : ''}
		/>
	</g>

	<!-- Reflection highlight -->
	<ellipse fill="white" cx="45" cy="28" rx="12" ry="5" opacity="0.15" />

	<!-- Edge shadow -->
	<ellipse
		fill="none"
		stroke="rgba(0,0,0,0.1)"
		stroke-width="2"
		cx="60"
		cy="35"
		rx="55"
		ry="25"
	/>
</svg>

<style>
	@keyframes ripple {
		0% { transform: scale(0.8); opacity: 0.4; }
		100% { transform: scale(1.5); opacity: 0; }
	}

	.ripple {
		transform-origin: center center;
		animation: ripple 3s ease-out infinite;
	}

	.ripple-1 { animation-delay: 0s; }
	.ripple-2 { animation-delay: 0.5s; }
	.ripple-3 { animation-delay: 1.5s; }
</style>
