<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, accents } from '../palette';

	interface Props {
		class?: string;
		frameColor?: string;
		lit?: boolean;
		animate?: boolean;
		variant?: 'hanging' | 'standing' | 'post';
	}

	let {
		class: className = 'w-6 h-10',
		frameColor,
		lit = true,
		animate = true,
		variant = 'hanging'
	}: Props = $props();

	const frame = $derived(frameColor ?? bark.darkBark);
	const glowColor = $derived(accents.firefly.glow);
</script>

<!-- Lantern -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60">
	{#if variant === 'hanging'}
		<!-- Top finial (attachment point) -->
		<circle fill={frame} cx="20" cy="3" r="2.5" />

		<!-- Hanging arms connecting finial to lantern roof -->
		<path fill="none" stroke={frame} stroke-width="2" d="M17.5 3.5 Q12 7 12 12" />
		<path fill="none" stroke={frame} stroke-width="2" d="M22.5 3.5 Q28 7 28 12" />

		<!-- Lantern top cap -->
		<polygon fill={frame} points="10,12 20,6 30,12" />

		<!-- Small decorative cap finial connecting to arms -->
		<circle fill={frame} cx="20" cy="6" r="1.5" />
	{:else if variant === 'post'}
		<!-- Post -->
		<rect fill={frame} x="17" y="40" width="6" height="20" />
		<!-- Top finial -->
		<circle fill={frame} cx="20" cy="9" r="2" />
		<!-- Lantern top -->
		<polygon fill={frame} points="10,18 20,11 30,18" />
	{:else}
		<!-- Standing base -->
		<rect fill={frame} x="12" y="52" width="16" height="4" rx="1" />
		<rect fill={frame} x="17" y="48" width="6" height="6" />
		<!-- Top finial -->
		<circle fill={frame} cx="20" cy="9" r="2" />
		<!-- Lantern top -->
		<polygon fill={frame} points="10,18 20,11 30,18" />
	{/if}

	<!-- Lantern body frame -->
	<rect fill={frame} x="10" y="18" width="20" height="30" rx="1" />

	<!-- Glass panels (with glow if lit) -->
	{#if lit}
		<!-- Glow effect -->
		<rect fill={glowColor} x="12" y="20" width="16" height="26" opacity="0.3" class={animate ? 'flicker' : ''} />
		<rect fill={glowColor} x="14" y="22" width="12" height="22" opacity="0.5" class={animate ? 'flicker-inner' : ''} />
		<!-- Outer glow -->
		<ellipse fill={glowColor} cx="20" cy="33" rx="18" ry="20" opacity="0.15" class={animate ? 'flicker-outer' : ''} />
	{:else}
		<rect fill="#cbd5e1" x="12" y="20" width="16" height="26" opacity="0.3" />
	{/if}

	<!-- Frame details -->
	<rect fill={frame} x="10" y="32" width="20" height="2" />
	<rect fill={frame} x="19" y="20" width="2" height="26" />

	<!-- Bottom cap -->
	<rect fill={frame} x="8" y="48" width="24" height="3" rx="1" />
</svg>

<style>
	@keyframes flicker {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 0.6; }
		75% { opacity: 0.45; }
	}

	@keyframes flicker-inner {
		0%, 100% { opacity: 0.7; }
		30% { opacity: 0.75; }
		60% { opacity: 0.65; }
	}

	@keyframes flicker-outer {
		0%, 100% { opacity: 0.15; }
		50% { opacity: 0.2; }
	}

	.flicker {
		animation: flicker 2s ease-in-out infinite;
	}

	.flicker-inner {
		animation: flicker-inner 1.5s ease-in-out infinite;
		animation-delay: 0.2s;
	}

	.flicker-outer {
		animation: flicker-outer 3s ease-in-out infinite;
	}
</style>
