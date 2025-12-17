<script lang="ts">
	import { accents } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		rays?: boolean;
		animate?: boolean;
	}

	let {
		class: className = 'w-12 h-12',
		color,
		rays = true,
		animate = true
	}: Props = $props();

	const sunColor = color ?? accents.flower.yellow;
</script>

<!-- Sun with optional rays -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
	{#if rays}
		<!-- Sun rays -->
		<g class={animate ? 'spin' : ''} opacity="0.8">
			<line x1="50" y1="5" x2="50" y2="20" stroke={sunColor} stroke-width="3" stroke-linecap="round" />
			<line x1="50" y1="80" x2="50" y2="95" stroke={sunColor} stroke-width="3" stroke-linecap="round" />
			<line x1="5" y1="50" x2="20" y2="50" stroke={sunColor} stroke-width="3" stroke-linecap="round" />
			<line x1="80" y1="50" x2="95" y2="50" stroke={sunColor} stroke-width="3" stroke-linecap="round" />
			<!-- Diagonal rays -->
			<line x1="18" y1="18" x2="28" y2="28" stroke={sunColor} stroke-width="2.5" stroke-linecap="round" />
			<line x1="72" y1="28" x2="82" y2="18" stroke={sunColor} stroke-width="2.5" stroke-linecap="round" />
			<line x1="18" y1="82" x2="28" y2="72" stroke={sunColor} stroke-width="2.5" stroke-linecap="round" />
			<line x1="72" y1="72" x2="82" y2="82" stroke={sunColor} stroke-width="2.5" stroke-linecap="round" />
		</g>
	{/if}

	<!-- Sun body -->
	<circle fill={sunColor} cx="50" cy="50" r="25" class={animate ? 'pulse' : ''} />

	<!-- Inner glow -->
	<circle fill="white" cx="50" cy="50" r="15" opacity="0.3" />
</svg>

<style>
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.02); }
	}

	.spin {
		transform-origin: center center;
		animation: spin 60s linear infinite;
	}

	.pulse {
		transform-origin: center center;
		animation: pulse 4s ease-in-out infinite;
	}
</style>
