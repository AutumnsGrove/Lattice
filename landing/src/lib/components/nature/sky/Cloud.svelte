<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		speed?: 'slow' | 'normal' | 'fast';
	}

	let {
		class: className = 'w-16 h-8',
		color = 'white',
		animate = true,
		speed = 'normal'
	}: Props = $props();

	const duration = {
		slow: '60s',
		normal: '40s',
		fast: '20s'
	}[speed];
</script>

<!-- Fluffy cloud -->
<svg
	class="{className} {animate ? 'drift' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 50"
	style="--drift-duration: {duration}"
>
	<g opacity="0.9">
		<!-- Main cloud body -->
		<ellipse fill={color} cx="50" cy="35" rx="35" ry="15" />
		<ellipse fill={color} cx="30" cy="30" rx="22" ry="18" />
		<ellipse fill={color} cx="70" cy="30" rx="22" ry="18" />
		<ellipse fill={color} cx="50" cy="22" rx="25" ry="16" />
		<ellipse fill={color} cx="35" cy="18" rx="18" ry="14" />
		<ellipse fill={color} cx="65" cy="18" rx="18" ry="14" />
	</g>
</svg>

<style>
	@keyframes drift {
		0% { transform: translateX(0); }
		100% { transform: translateX(20px); }
	}

	.drift {
		animation: drift var(--drift-duration, 40s) ease-in-out infinite alternate;
	}
</style>
