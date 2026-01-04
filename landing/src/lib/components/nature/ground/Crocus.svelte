<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { greens, wildflowers } from '../palette';

	interface Props {
		class?: string;
		style?: string;
		petalColor?: string;
		centerColor?: string;
		stemColor?: string;
		variant?: 'purple' | 'yellow' | 'white';
		animate?: boolean;
	}

	let {
		class: className = 'w-4 h-6',
		style,
		petalColor,
		centerColor,
		stemColor,
		variant = 'purple',
		animate = true
	}: Props = $props();

	// Crocus color variants - early spring bloomers
	const variantColors = {
		purple: wildflowers.crocus,
		yellow: wildflowers.buttercup,
		white: '#fafafa'
	};

	const petals = $derived(petalColor ?? variantColors[variant]);
	const center = $derived(centerColor ?? '#f97316');  // Orange stamen
	const stem = $derived(stemColor ?? greens.deepGreen);

	// Slightly different shade for depth
	const petalDark = $derived(variant === 'purple' ? '#7c3aed' :
		variant === 'yellow' ? '#eab308' :
		'#e5e5e5');
</script>

<!-- Crocus - first flowers of spring, often peeking through snow -->
<svg class="{className} {animate ? 'emerge' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60" style={style}>
	<!-- Stem - short, crocus blooms close to ground -->
	<path fill="none" stroke={stem} stroke-width="2" d="M20 60 Q19 50 20 42" />

	<!-- Grass-like leaves -->
	<path fill={stem} d="M20 58 Q14 50 12 55 Q16 48 20 52" />
	<path fill={stem} d="M20 55 Q26 47 28 52 Q24 45 20 50" />
	<path fill={stem} d="M18 52 Q10 40 8 45 Q14 38 18 45" />
	<path fill={stem} d="M22 52 Q30 40 32 45 Q26 38 22 45" />

	<!-- Crocus bloom - goblet-shaped with pointed petals -->
	<!-- Outer petals -->
	<path fill={petals} d="M10 40 Q8 28 14 15 Q20 8 20 8 Q12 20 10 40" />
	<path fill={petals} d="M30 40 Q32 28 26 15 Q20 8 20 8 Q28 20 30 40" />
	<path fill={petals} d="M15 42 Q10 30 18 12 Q20 8 20 8 Q15 18 15 42" />
	<path fill={petals} d="M25 42 Q30 30 22 12 Q20 8 20 8 Q25 18 25 42" />

	<!-- Inner petals (darker) -->
	<path fill={petalDark} d="M17 38 Q15 28 19 16 Q20 12 20 12 Q18 22 17 38" opacity="0.6" />
	<path fill={petalDark} d="M23 38 Q25 28 21 16 Q20 12 20 12 Q22 22 23 38" opacity="0.6" />

	<!-- Center/stamen - distinctive orange -->
	<ellipse fill={center} cx="20" cy="35" rx="3" ry="4" />
	<path fill="#ea580c" d="M19 32 L20 25 L21 32" opacity="0.8" />
</svg>

<style>
	@keyframes emerge {
		0%, 100% { transform: translateY(0) scale(1); }
		50% { transform: translateY(-1px) scale(1.02); }
	}

	.emerge {
		transform-origin: center bottom;
		animation: emerge 4s ease-in-out infinite;
	}
</style>
