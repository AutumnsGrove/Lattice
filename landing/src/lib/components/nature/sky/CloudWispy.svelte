<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		speed?: 'slow' | 'normal' | 'fast';
	}

	let {
		class: className = 'w-20 h-4',
		color = 'white',
		animate = true,
		speed = 'slow'
	}: Props = $props();

	const duration = {
		slow: '80s',
		normal: '50s',
		fast: '30s'
	}[speed];
</script>

<!-- Thin wispy cloud / cirrus -->
<svg
	class="{className} {animate ? 'drift' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 120 25"
	style="--drift-duration: {duration}"
>
	<g opacity="0.6">
		<!-- Wispy strands -->
		<path
			fill={color}
			d="M0 15 Q20 10 40 14 Q60 8 80 12 Q100 6 120 10 L120 14 Q95 10 75 16 Q55 12 35 18 Q15 14 0 18 Z"
		/>
		<path
			fill={color}
			d="M10 8 Q30 5 50 9 Q70 3 90 7 Q110 2 115 6 L112 10 Q88 6 68 11 Q48 5 28 12 Q12 8 10 12 Z"
			opacity="0.7"
		/>
	</g>
</svg>

<style>
	@keyframes drift {
		0% { transform: translateX(0); }
		100% { transform: translateX(30px); }
	}

	.drift {
		animation: drift var(--drift-duration, 80s) ease-in-out infinite alternate;
	}
</style>
