<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { greens, spring } from '../palette';

	interface Props {
		class?: string;
		style?: string;
		petalColor?: string;
		stemColor?: string;
		variant?: 'red' | 'pink' | 'yellow' | 'purple';
		animate?: boolean;
	}

	let {
		class: className = 'w-4 h-8',
		style,
		petalColor,
		stemColor,
		variant = 'red',
		animate = true
	}: Props = $props();

	// Tulip color variants
	const variantColors = {
		red: spring.tulipRed,
		pink: spring.tulipPink,
		yellow: spring.daffodil,
		purple: spring.crocus
	};

	const petals = $derived(petalColor ?? variantColors[variant]);
	const stem = $derived(stemColor ?? greens.deepGreen);

	// Slightly darker shade for inner petals
	const innerPetal = $derived(variant === 'red' ? '#e11d48' :
		variant === 'pink' ? '#f472b6' :
		variant === 'yellow' ? '#facc15' :
		'#8b5cf6');
</script>

<!-- Classic tulip - spring icon -->
<svg class="{className} {animate ? 'sway' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 80" style={style}>
	<!-- Stem -->
	<path fill="none" stroke={stem} stroke-width="3" d="M20 80 Q18 60 20 40" />

	<!-- Leaves -->
	<path fill={stem} d="M20 70 Q8 60 5 65 Q12 55 20 60" />
	<path fill={stem} d="M20 60 Q32 50 35 55 Q28 45 20 52" />

	<!-- Tulip bloom - cup shape with overlapping petals -->
	<!-- Back petals -->
	<path fill={innerPetal} d="M10 35 Q8 20 15 10 Q20 5 25 10 Q32 20 30 35 Q20 38 10 35" />

	<!-- Side petals -->
	<path fill={petals} d="M8 36 Q5 25 10 12 Q15 5 20 10 Q12 15 10 25 Q8 32 8 36" />
	<path fill={petals} d="M32 36 Q35 25 30 12 Q25 5 20 10 Q28 15 30 25 Q32 32 32 36" />

	<!-- Front petal -->
	<path fill={petals} d="M12 38 Q10 30 15 18 Q20 12 25 18 Q30 30 28 38 Q20 42 12 38" />

	<!-- Petal highlights -->
	<path fill="white" d="M18 20 Q20 15 22 20 Q20 25 18 20" opacity="0.2" />
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(2deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 3s ease-in-out infinite;
	}
</style>
