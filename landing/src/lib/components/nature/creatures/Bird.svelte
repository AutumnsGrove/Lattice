<script lang="ts">
	import { bark, earth, accents } from '../palette';

	interface Props {
		class?: string;
		bodyColor?: string;
		breastColor?: string;
		beakColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-6',
		bodyColor,
		breastColor,
		beakColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	const body = bodyColor ?? bark.bark;
	const breast = breastColor ?? earth.clay;
	const beak = beakColor ?? accents.flower.yellow;

	const scaleX = facing === 'left' ? -1 : 1;
</script>

<!-- Perched bird -->
<svg
	class="{className} {animate ? 'bob' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 50"
	style="transform: scaleX({scaleX})"
>
	<!-- Tail feathers -->
	<path fill={body} d="M5 28 Q0 32 2 38 Q8 36 12 30 Q8 28 5 28" />

	<!-- Body -->
	<ellipse fill={body} cx="22" cy="30" rx="15" ry="12" />

	<!-- Wing -->
	<path fill={bark.darkBark} d="M15 25 Q10 30 12 38 Q20 36 25 28 Q20 24 15 25" opacity="0.7" />

	<!-- Breast -->
	<ellipse fill={breast} cx="28" cy="32" rx="8" ry="9" />

	<!-- Head -->
	<circle fill={body} cx="35" cy="20" r="10" />

	<!-- Eye -->
	<circle fill="white" cx="38" cy="18" r="3" />
	<circle fill={bark.darkBark} cx="39" cy="18" r="1.5" />

	<!-- Beak -->
	<path fill={beak} d="M44 20 L50 22 L44 24 Z" />

	<!-- Legs -->
	<path fill="none" stroke={bark.warmBark} stroke-width="1.5" d="M20 42 L20 50 M18 48 L22 48" />
	<path fill="none" stroke={bark.warmBark} stroke-width="1.5" d="M28 42 L28 50 M26 48 L30 48" />
</svg>

<style>
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-2px); }
	}

	.bob {
		animation: bob 1.5s ease-in-out infinite;
	}
</style>
