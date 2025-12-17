<script lang="ts">
	import { accents, bark } from '../palette';

	interface Props {
		class?: string;
		wingColor?: string;
		accentColor?: string;
		animate?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		wingColor,
		accentColor,
		animate = true
	}: Props = $props();

	const wing = wingColor ?? accents.flower.purple;
	const accent = accentColor ?? accents.flower.yellow;
	const bodyColor = bark.darkBark;
</script>

<!-- Butterfly with flapping wings -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40">
	<!-- Left wings -->
	<g class={animate ? 'wing-left' : ''}>
		<!-- Upper wing -->
		<ellipse fill={wing} cx="12" cy="15" rx="12" ry="10" />
		<circle fill={accent} cx="10" cy="13" r="3" opacity="0.7" />
		<circle fill={accent} cx="16" cy="17" r="2" opacity="0.5" />

		<!-- Lower wing -->
		<ellipse fill={wing} cx="14" cy="30" rx="10" ry="8" />
		<circle fill={accent} cx="12" cy="28" r="2" opacity="0.6" />
	</g>

	<!-- Right wings -->
	<g class={animate ? 'wing-right' : ''}>
		<!-- Upper wing -->
		<ellipse fill={wing} cx="38" cy="15" rx="12" ry="10" />
		<circle fill={accent} cx="40" cy="13" r="3" opacity="0.7" />
		<circle fill={accent} cx="34" cy="17" r="2" opacity="0.5" />

		<!-- Lower wing -->
		<ellipse fill={wing} cx="36" cy="30" rx="10" ry="8" />
		<circle fill={accent} cx="38" cy="28" r="2" opacity="0.6" />
	</g>

	<!-- Body -->
	<ellipse fill={bodyColor} cx="25" cy="20" rx="3" ry="12" />

	<!-- Head -->
	<circle fill={bodyColor} cx="25" cy="6" r="3" />

	<!-- Antennae -->
	<path fill="none" stroke={bodyColor} stroke-width="1" d="M23 4 Q20 0 18 2" />
	<path fill="none" stroke={bodyColor} stroke-width="1" d="M27 4 Q30 0 32 2" />
	<circle fill={bodyColor} cx="18" cy="2" r="1" />
	<circle fill={bodyColor} cx="32" cy="2" r="1" />
</svg>

<style>
	@keyframes flutter-left {
		0%, 100% { transform: scaleX(1) rotate(0deg); }
		50% { transform: scaleX(0.7) rotate(-5deg); }
	}

	@keyframes flutter-right {
		0%, 100% { transform: scaleX(1) rotate(0deg); }
		50% { transform: scaleX(0.7) rotate(5deg); }
	}

	.wing-left {
		transform-origin: right center;
		animation: flutter-left 0.3s ease-in-out infinite;
	}

	.wing-right {
		transform-origin: left center;
		animation: flutter-right 0.3s ease-in-out infinite;
	}
</style>
