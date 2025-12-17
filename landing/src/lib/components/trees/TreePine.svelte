<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
	}

	let { class: className = 'w-6 h-6', color, trunkColor }: Props = $props();

	const foliageColor = color ?? 'currentColor';
	const actualTrunkColor = trunkColor ?? '#6B4423';
</script>

<!-- Pine/Conifer tree - triangular layered design -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 140"
>
	<!-- Trunk -->
	<rect fill={actualTrunkColor} x="42" y="100" width="16" height="40" rx="2"/>

	<!-- Bottom layer (widest) -->
	<polygon fill={foliageColor} points="50,55 10,105 90,105"/>

	<!-- Middle layer -->
	<polygon fill={foliageColor} points="50,30 18,75 82,75"/>

	<!-- Top layer (smallest) -->
	<polygon fill={foliageColor} points="50,5 28,50 72,50"/>
</svg>
