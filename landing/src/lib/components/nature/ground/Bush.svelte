<script lang="ts">
	import type { Season } from '../palette';
	import { greens, autumn, bark } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		season?: Season;
		animate?: boolean;
	}

	let {
		class: className = 'w-8 h-8',
		color,
		season = 'summer',
		animate = false
	}: Props = $props();

	// Bushes turn warm colors in autumn
	const defaultColor = season === 'autumn' ? autumn.amber : greens.grove;
	const foliageColor = color ?? defaultColor;
	const shadowColor = season === 'autumn' ? autumn.rust : greens.deepGreen;
</script>

<!-- Round bush/shrub -->
<svg class="{className} {animate ? 'sway' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 60">
	<!-- Base shadow/depth -->
	<ellipse fill={shadowColor} cx="40" cy="45" rx="35" ry="15" opacity="0.5" />

	<!-- Main foliage clusters -->
	<ellipse fill={foliageColor} cx="40" cy="35" rx="32" ry="25" />
	<ellipse fill={foliageColor} cx="22" cy="40" rx="20" ry="18" />
	<ellipse fill={foliageColor} cx="58" cy="40" rx="20" ry="18" />
	<ellipse fill={foliageColor} cx="40" cy="22" rx="22" ry="16" />
	<ellipse fill={foliageColor} cx="28" cy="28" rx="15" ry="12" />
	<ellipse fill={foliageColor} cx="52" cy="28" rx="15" ry="12" />

	<!-- Ground hint -->
	<ellipse fill={bark.bark} cx="40" cy="55" rx="15" ry="4" opacity="0.3" />
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(0.5deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 4s ease-in-out infinite;
	}
</style>
