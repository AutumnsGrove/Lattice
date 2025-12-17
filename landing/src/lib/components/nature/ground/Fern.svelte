<script lang="ts">
	import type { Season } from '../palette';
	import { greens, autumn } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		animate?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		season = 'summer',
		animate = true
	}: Props = $props();

	// Ferns turn golden/brown in autumn
	const defaultColor = season === 'autumn' ? autumn.gold : greens.deepGreen;
	const frondColor = color ?? defaultColor;
</script>

<!-- Curled fern frond -->
<svg class="{className} {animate ? 'sway' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70">
	<!-- Main stem -->
	<path
		fill="none"
		stroke={frondColor}
		stroke-width="2"
		d="M25 70 Q24 50 26 35 Q28 20 35 8"
	/>

	<!-- Left leaflets -->
	<path fill={frondColor} d="M24 60 Q15 55 10 58 Q18 52 24 55" />
	<path fill={frondColor} d="M24 50 Q12 44 6 48 Q16 40 24 45" />
	<path fill={frondColor} d="M25 40 Q14 32 8 36 Q17 28 25 34" />
	<path fill={frondColor} d="M27 30 Q18 22 14 26 Q21 18 27 24" />
	<path fill={frondColor} d="M30 22 Q24 15 22 18 Q27 12 32 16" />

	<!-- Right leaflets -->
	<path fill={frondColor} d="M26 60 Q35 55 40 58 Q32 52 26 55" />
	<path fill={frondColor} d="M26 50 Q38 44 44 48 Q34 40 26 45" />
	<path fill={frondColor} d="M27 40 Q38 32 44 36 Q35 28 27 34" />
	<path fill={frondColor} d="M29 30 Q38 22 42 26 Q35 18 29 24" />
	<path fill={frondColor} d="M33 22 Q38 16 40 18 Q36 12 32 16" />

	<!-- Curled tip -->
	<path
		fill="none"
		stroke={frondColor}
		stroke-width="1.5"
		d="M35 8 Q42 4 44 8 Q44 12 40 12"
	/>
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
