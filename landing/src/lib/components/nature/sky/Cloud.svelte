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
		variant?: 'fluffy' | 'wispy' | 'puffy' | 'scattered';
		direction?: 'left' | 'right';
	}

	let {
		class: className = 'w-16 h-8',
		color = 'white',
		animate = true,
		speed = 'normal',
		variant = 'fluffy',
		direction = 'right'
	}: Props = $props();

	const duration = $derived(
		{
			slow: '120s',
			normal: '80s',
			fast: '50s'
		}[speed]
	);

	const animClass = $derived(animate ? `drift-${direction}` : '');
</script>

{#if variant === 'fluffy'}
	<!-- Classic fluffy cumulus cloud -->
	<svg
		class="{className} {animClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 100 50"
		style="--drift-duration: {duration}"
	>
		<g opacity="0.9">
			<ellipse fill={color} cx="50" cy="35" rx="35" ry="15" />
			<ellipse fill={color} cx="30" cy="30" rx="22" ry="18" />
			<ellipse fill={color} cx="70" cy="30" rx="22" ry="18" />
			<ellipse fill={color} cx="50" cy="22" rx="25" ry="16" />
			<ellipse fill={color} cx="35" cy="18" rx="18" ry="14" />
			<ellipse fill={color} cx="65" cy="18" rx="18" ry="14" />
		</g>
	</svg>
{:else if variant === 'wispy'}
	<!-- Thin wispy cirrus cloud -->
	<svg
		class="{className} {animClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 120 40"
		style="--drift-duration: {duration}"
	>
		<g opacity="0.7">
			<ellipse fill={color} cx="30" cy="20" rx="25" ry="8" />
			<ellipse fill={color} cx="60" cy="22" rx="30" ry="10" />
			<ellipse fill={color} cx="90" cy="18" rx="22" ry="7" />
			<ellipse fill={color} cx="45" cy="15" rx="18" ry="6" />
			<ellipse fill={color} cx="75" cy="25" rx="20" ry="8" />
		</g>
	</svg>
{:else if variant === 'puffy'}
	<!-- Rounded puffy cloud -->
	<svg
		class="{className} {animClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 110 55"
		style="--drift-duration: {duration}"
	>
		<g opacity="0.85">
			<circle fill={color} cx="25" cy="35" r="20" />
			<circle fill={color} cx="45" cy="28" r="24" />
			<circle fill={color} cx="55" cy="35" r="22" />
			<circle fill={color} cx="75" cy="30" r="20" />
			<circle fill={color} cx="90" cy="38" r="18" />
			<ellipse fill={color} cx="55" cy="40" rx="40" ry="15" />
		</g>
	</svg>
{:else if variant === 'scattered'}
	<!-- Scattered small cloudlets -->
	<svg
		class="{className} {animClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 100 45"
		style="--drift-duration: {duration}"
	>
		<g opacity="0.75">
			<ellipse fill={color} cx="20" cy="25" rx="18" ry="12" />
			<ellipse fill={color} cx="30" cy="18" rx="12" ry="10" />
			<ellipse fill={color} cx="55" cy="30" rx="20" ry="14" />
			<ellipse fill={color} cx="65" cy="22" rx="14" ry="11" />
			<ellipse fill={color} cx="80" cy="28" rx="16" ry="13" />
		</g>
	</svg>
{/if}

<style>
	@keyframes drift-right {
		0% { transform: translateX(-10vw); }
		100% { transform: translateX(110vw); }
	}

	@keyframes drift-left {
		0% { transform: translateX(110vw); }
		100% { transform: translateX(-10vw); }
	}

	.drift-right {
		animation: drift-right var(--drift-duration, 80s) linear infinite;
	}

	.drift-left {
		animation: drift-left var(--drift-duration, 80s) linear infinite;
	}
</style>
