<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	interface Props {
		class?: string;
		opacity?: number;
		animate?: boolean;
	}

	let {
		class: className = 'w-32 h-16',
		opacity = 0.6,
		animate = false
	}: Props = $props();
</script>

<!-- Rainbow arc -->
<svg class="{className} {animate ? 'fade-in' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
	<defs>
		<!-- Rainbow gradient arcs -->
		<linearGradient id="rainbow-red" x1="0%" y1="0%" x2="100%" y2="0%">
			<stop offset="0%" stop-color="#ef4444" stop-opacity="0" />
			<stop offset="20%" stop-color="#ef4444" stop-opacity="1" />
			<stop offset="80%" stop-color="#ef4444" stop-opacity="1" />
			<stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
		</linearGradient>
	</defs>

	<g opacity={opacity}>
		<!-- Red (outer) -->
		<path
			fill="none"
			stroke="#ef4444"
			stroke-width="8"
			d="M10 100 Q10 20 100 20 Q190 20 190 100"
			opacity="0.8"
		/>
		<!-- Orange -->
		<path
			fill="none"
			stroke="#f97316"
			stroke-width="8"
			d="M20 100 Q20 30 100 30 Q180 30 180 100"
			opacity="0.8"
		/>
		<!-- Yellow -->
		<path
			fill="none"
			stroke="#eab308"
			stroke-width="8"
			d="M30 100 Q30 40 100 40 Q170 40 170 100"
			opacity="0.8"
		/>
		<!-- Green -->
		<path
			fill="none"
			stroke="#22c55e"
			stroke-width="8"
			d="M40 100 Q40 50 100 50 Q160 50 160 100"
			opacity="0.8"
		/>
		<!-- Blue -->
		<path
			fill="none"
			stroke="#3b82f6"
			stroke-width="8"
			d="M50 100 Q50 60 100 60 Q150 60 150 100"
			opacity="0.8"
		/>
		<!-- Indigo -->
		<path
			fill="none"
			stroke="#6366f1"
			stroke-width="8"
			d="M60 100 Q60 70 100 70 Q140 70 140 100"
			opacity="0.8"
		/>
		<!-- Violet (inner) -->
		<path
			fill="none"
			stroke="#a855f7"
			stroke-width="8"
			d="M70 100 Q70 80 100 80 Q130 80 130 100"
			opacity="0.8"
		/>
	</g>
</svg>

<style>
	@keyframes fade-in {
		0% { opacity: 0; }
		100% { opacity: 1; }
	}

	.fade-in {
		animation: fade-in 3s ease-out forwards;
	}
</style>
