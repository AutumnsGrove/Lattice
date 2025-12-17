<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		phase?: 'full' | 'waning' | 'crescent' | 'new';
		animate?: boolean;
	}

	let {
		class: className = 'w-10 h-10',
		color = '#fef9c3',
		phase = 'crescent',
		animate = true
	}: Props = $props();

	const glowColor = '#fef9c3';
</script>

<!-- Moon with phase options -->
<svg class="{className} {animate ? 'glow' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">
	<!-- Outer glow -->
	<circle fill={glowColor} cx="25" cy="25" r="24" opacity="0.15" />

	{#if phase === 'full'}
		<!-- Full moon -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<!-- Craters -->
		<circle fill="#e5e5dc" cx="18" cy="20" r="4" opacity="0.3" />
		<circle fill="#e5e5dc" cx="30" cy="28" r="5" opacity="0.25" />
		<circle fill="#e5e5dc" cx="22" cy="32" r="3" opacity="0.2" />
	{:else if phase === 'waning'}
		<!-- Waning gibbous -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<circle fill="#1e293b" cx="35" cy="25" r="15" />
	{:else if phase === 'crescent'}
		<!-- Crescent moon -->
		<circle fill={color} cx="25" cy="25" r="20" />
		<circle fill="#1e293b" cx="32" cy="25" r="17" />
	{:else}
		<!-- New moon (barely visible) -->
		<circle fill={color} cx="25" cy="25" r="20" opacity="0.1" />
		<circle fill={color} cx="22" cy="25" r="18" opacity="0.05" />
	{/if}
</svg>

<style>
	@keyframes glow {
		0%, 100% { filter: brightness(1) drop-shadow(0 0 5px rgba(254, 249, 195, 0.3)); }
		50% { filter: brightness(1.1) drop-shadow(0 0 10px rgba(254, 249, 195, 0.5)); }
	}

	.glow {
		animation: glow 4s ease-in-out infinite;
	}
</style>
