<script lang="ts">
	import { earth } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		variant?: 'round' | 'flat' | 'jagged';
	}

	let {
		class: className = 'w-6 h-4',
		color,
		variant = 'round'
	}: Props = $props();

	const rockColor = color ?? earth.stone;
	const highlightColor = earth.pebble;
	const shadowColor = earth.slate;
</script>

<!-- Rock/stone -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40">
	{#if variant === 'round'}
		<!-- Rounded boulder -->
		<ellipse fill={rockColor} cx="30" cy="25" rx="28" ry="15" />
		<ellipse fill={highlightColor} cx="24" cy="20" rx="10" ry="6" opacity="0.4" />
		<ellipse fill={shadowColor} cx="38" cy="30" rx="12" ry="5" opacity="0.3" />
	{:else if variant === 'flat'}
		<!-- Flat stepping stone -->
		<ellipse fill={rockColor} cx="30" cy="28" rx="28" ry="12" />
		<ellipse fill={highlightColor} cx="25" cy="25" rx="15" ry="6" opacity="0.3" />
	{:else}
		<!-- Jagged rock -->
		<polygon fill={rockColor} points="5,40 15,20 25,35 35,10 45,25 55,15 58,40" />
		<polygon fill={highlightColor} points="15,20 25,35 35,10 30,18 22,28" opacity="0.3" />
		<polygon fill={shadowColor} points="35,10 45,25 55,15 58,40 45,40 40,30" opacity="0.3" />
	{/if}
</svg>
