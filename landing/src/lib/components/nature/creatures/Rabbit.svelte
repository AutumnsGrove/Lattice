<script lang="ts">
	import { earth, natural } from '../palette';

	interface Props {
		class?: string;
		furColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-8 h-8',
		furColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	const fur = furColor ?? earth.clay;
	const innerEar = natural.cream;
	const scaleX = facing === 'left' ? -1 : 1;
</script>

<!-- Sitting rabbit -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 60"
	style="transform: scaleX({scaleX})"
>
	<!-- Back leg -->
	<ellipse fill={fur} cx="15" cy="50" rx="10" ry="8" />

	<!-- Body -->
	<ellipse fill={fur} cx="22" cy="42" rx="14" ry="12" />

	<!-- Front leg -->
	<ellipse fill={fur} cx="32" cy="52" rx="5" ry="7" />

	<!-- Head -->
	<circle fill={fur} cx="35" cy="28" r="12" />

	<!-- Ears -->
	<g class={animate ? 'ear-twitch' : ''}>
		<ellipse fill={fur} cx="30" cy="10" rx="4" ry="12" />
		<ellipse fill={innerEar} cx="30" cy="10" rx="2" ry="8" />
	</g>
	<g class={animate ? 'ear-twitch-delay' : ''}>
		<ellipse fill={fur} cx="40" cy="8" rx="4" ry="12" transform="rotate(15 40 8)" />
		<ellipse fill={innerEar} cx="40" cy="8" rx="2" ry="8" transform="rotate(15 40 8)" />
	</g>

	<!-- Eye -->
	<circle fill="#1a1a1a" cx="40" cy="26" r="2.5" />
	<circle fill="white" cx="41" cy="25" r="1" />

	<!-- Nose -->
	<ellipse fill={innerEar} cx="46" cy="30" rx="2" ry="1.5" />

	<!-- Whiskers -->
	<path fill="none" stroke={earth.stone} stroke-width="0.5" d="M46 30 L54 28" opacity="0.5" />
	<path fill="none" stroke={earth.stone} stroke-width="0.5" d="M46 31 L54 31" opacity="0.5" />
	<path fill="none" stroke={earth.stone} stroke-width="0.5" d="M46 32 L54 34" opacity="0.5" />

	<!-- Tail -->
	<circle fill={natural.cream} cx="8" cy="40" r="5" />
</svg>

<style>
	@keyframes ear-twitch {
		0%, 90%, 100% { transform: rotate(0deg); }
		93% { transform: rotate(-5deg); }
		96% { transform: rotate(3deg); }
	}

	.ear-twitch {
		transform-origin: center bottom;
		animation: ear-twitch 4s ease-in-out infinite;
	}

	.ear-twitch-delay {
		transform-origin: center bottom;
		animation: ear-twitch 4s ease-in-out infinite;
		animation-delay: 0.1s;
	}
</style>
