<script lang="ts">
	import { bark, earth } from '../palette';

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

	const fur = furColor ?? bark.warmBark;
	const lightFur = earth.sand;
	const scaleX = facing === 'left' ? -1 : 1;
</script>

<!-- Sitting squirrel -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 60 70"
	style="transform: scaleX({scaleX})"
>
	<!-- Tail (fluffy!) -->
	<g class={animate ? 'tail-flick' : ''}>
		<path
			fill={fur}
			d="M5 35 Q0 20 10 10 Q20 5 25 15 Q28 25 20 35 Q15 40 10 38 Q5 40 5 35"
		/>
		<path
			fill={lightFur}
			d="M10 30 Q8 22 15 15 Q20 12 22 18 Q23 24 18 30"
			opacity="0.5"
		/>
	</g>

	<!-- Back leg -->
	<ellipse fill={fur} cx="25" cy="58" rx="10" ry="8" />

	<!-- Body -->
	<ellipse fill={fur} cx="32" cy="45" rx="14" ry="16" />

	<!-- Belly -->
	<ellipse fill={lightFur} cx="35" cy="48" rx="8" ry="10" />

	<!-- Front paws (holding something) -->
	<ellipse fill={fur} cx="42" cy="52" rx="4" ry="6" />
	<ellipse fill={fur} cx="48" cy="50" rx="4" ry="5" />

	<!-- Head -->
	<circle fill={fur} cx="48" cy="32" r="12" />

	<!-- Cheek -->
	<ellipse fill={lightFur} cx="52" cy="36" rx="6" ry="5" />

	<!-- Ears -->
	<ellipse fill={fur} cx="42" cy="20" rx="4" ry="6" />
	<ellipse fill={lightFur} cx="42" cy="20" rx="2" ry="4" />
	<ellipse fill={fur} cx="52" cy="18" rx="4" ry="6" />
	<ellipse fill={lightFur} cx="52" cy="18" rx="2" ry="4" />

	<!-- Eye -->
	<circle fill="#1a1a1a" cx="52" cy="30" r="3" />
	<circle fill="white" cx="53" cy="29" r="1" />

	<!-- Nose -->
	<circle fill="#1a1a1a" cx="58" cy="34" r="2" />

	<!-- Acorn (optional detail) -->
	<ellipse fill={bark.bark} cx="45" cy="56" rx="3" ry="4" />
	<path fill={bark.darkBark} d="M42 53 Q45 51 48 53 L48 54 Q45 52 42 54 Z" />
</svg>

<style>
	@keyframes tail-flick {
		0%, 80%, 100% { transform: rotate(0deg); }
		85% { transform: rotate(5deg); }
		90% { transform: rotate(-3deg); }
		95% { transform: rotate(2deg); }
	}

	.tail-flick {
		transform-origin: bottom right;
		animation: tail-flick 3s ease-in-out infinite;
	}
</style>
