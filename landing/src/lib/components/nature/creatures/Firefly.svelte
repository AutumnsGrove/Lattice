<script lang="ts">
	import { accents, greens } from '../palette';

	interface Props {
		class?: string;
		glowColor?: string;
		bodyColor?: string;
		animate?: boolean;
		intensity?: 'subtle' | 'normal' | 'bright';
	}

	let {
		class: className = 'w-3 h-3',
		glowColor,
		bodyColor,
		animate = true,
		intensity = 'normal'
	}: Props = $props();

	const glow = glowColor ?? accents.firefly.glow;
	const body = bodyColor ?? accents.firefly.body;

	const glowOpacity = {
		subtle: 0.4,
		normal: 0.6,
		bright: 0.8
	}[intensity];
</script>

<!-- Firefly with glowing abdomen -->
<svg class="{className} {animate ? 'float' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
	<!-- Outer glow -->
	<circle
		fill={glow}
		cx="15"
		cy="18"
		r="12"
		opacity={glowOpacity}
		class={animate ? 'pulse' : ''}
	/>

	<!-- Inner glow -->
	<circle
		fill={glow}
		cx="15"
		cy="18"
		r="7"
		opacity={glowOpacity + 0.2}
		class={animate ? 'pulse-inner' : ''}
	/>

	<!-- Body -->
	<ellipse fill={body} cx="15" cy="12" rx="3" ry="4" />

	<!-- Glowing abdomen -->
	<ellipse fill={glow} cx="15" cy="18" rx="4" ry="5" class={animate ? 'glow' : ''} />

	<!-- Wings (subtle) -->
	<ellipse fill={greens.pale} cx="11" cy="10" rx="4" ry="2" opacity="0.3" transform="rotate(-20 11 10)" />
	<ellipse fill={greens.pale} cx="19" cy="10" rx="4" ry="2" opacity="0.3" transform="rotate(20 19 10)" />

	<!-- Antennae -->
	<path fill="none" stroke={body} stroke-width="0.5" d="M13 8 Q11 4 10 3" />
	<path fill="none" stroke={body} stroke-width="0.5" d="M17 8 Q19 4 20 3" />
</svg>

<style>
	@keyframes float {
		0%, 100% { transform: translateY(0) translateX(0); }
		25% { transform: translateY(-3px) translateX(2px); }
		50% { transform: translateY(-1px) translateX(-1px); }
		75% { transform: translateY(-4px) translateX(1px); }
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.4; }
		50% { opacity: 0.7; }
	}

	@keyframes pulse-inner {
		0%, 100% { opacity: 0.6; }
		50% { opacity: 0.9; }
	}

	@keyframes glow {
		0%, 100% { filter: brightness(1); }
		50% { filter: brightness(1.3); }
	}

	.float {
		animation: float 4s ease-in-out infinite;
	}

	.pulse {
		animation: pulse 2s ease-in-out infinite;
	}

	.pulse-inner {
		animation: pulse-inner 2s ease-in-out infinite;
		animation-delay: 0.2s;
	}

	.glow {
		animation: glow 2s ease-in-out infinite;
	}
</style>
