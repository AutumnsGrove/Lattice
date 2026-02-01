<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import { themed, resolveThemed } from '../palette';

	interface Props {
		class?: string;
		/** Moon color. Defaults to warm pale yellow (works well in both themes). */
		color?: string;
		phase?: 'full' | 'waning' | 'crescent' | 'new';
		animate?: boolean;
	}

	let {
		class: className = 'w-10 h-10',
		color = '#fef9c3',
		phase = 'crescent',
		animate = true
	}: Props = $props();

	const glowColor = '#fef9c3';

	// Theme-aware crater color: lighter in light mode, darker in dark for contrast
	const craterColor = $derived(resolveThemed(themed.moonCrater));

	// IntersectionObserver to pause animations when off-screen (consistency with other nature components)
	let svgRef: SVGSVGElement | null = $state(null);
	let isVisible = $state(true);

	$effect(() => {
		if (!browser || !svgRef) return;

		const observer = new IntersectionObserver(
			(entries) => {
				isVisible = entries[0]?.isIntersecting ?? true;
			},
			{ threshold: 0 }
		);

		observer.observe(svgRef);
		return () => observer.disconnect();
	});

	// Only animate if both animate prop is true AND element is visible
	const shouldAnimate = $derived(animate && isVisible);
</script>

<!-- Moon with phase options -->
<svg bind:this={svgRef} class="{className} {shouldAnimate ? 'glow' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" aria-hidden="true">
	<!-- Outer glow -->
	<circle fill={glowColor} cx="25" cy="25" r="24" opacity="0.15" />

	{#if phase === 'full'}
		<!-- Full moon -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<!-- Craters -->
		<circle fill={craterColor} cx="18" cy="20" r="4" opacity="0.3" />
		<circle fill={craterColor} cx="30" cy="28" r="5" opacity="0.25" />
		<circle fill={craterColor} cx="22" cy="32" r="3" opacity="0.2" />
	{:else if phase === 'waning'}
		<!-- Waning gibbous -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<circle fill="#1e293b" cx="35" cy="25" r="15" />
	{:else if phase === 'crescent'}
		<!-- Crescent moon -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<circle fill="#1e293b" cx="32" cy="25" r="17" />
	{:else}
		<!-- New moon (barely visible) -->
		<circle fill={color} cx="25" cy="25" r="20" opacity="0.1" />
		<circle fill={color} cx="22" cy="25" r="18" opacity="0.05" />
	{/if}
</svg>

<style>
	/* Use opacity instead of filter to avoid expensive layer repaints */
	@keyframes glow {
		0%, 100% { opacity: 0.9; }
		50% { opacity: 1; }
	}

	.glow {
		animation: glow 4s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: reduce) {
		.glow {
			animation: none;
		}
	}
</style>
