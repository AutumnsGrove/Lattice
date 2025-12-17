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

<!-- Oak tree - round full canopy -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 120"
>
	<!-- Trunk -->
	<path fill={actualTrunkColor} d="M40 70 L42 120 L58 120 L60 70 Q50 75 40 70"/>

	<!-- Main canopy - organic cloud-like shape -->
	<ellipse fill={foliageColor} cx="50" cy="45" rx="42" ry="35"/>
	<ellipse fill={foliageColor} cx="30" cy="50" rx="25" ry="22"/>
	<ellipse fill={foliageColor} cx="70" cy="50" rx="25" ry="22"/>
	<ellipse fill={foliageColor} cx="50" cy="25" rx="28" ry="22"/>
	<ellipse fill={foliageColor} cx="35" cy="30" rx="20" ry="18"/>
	<ellipse fill={foliageColor} cx="65" cy="30" rx="20" ry="18"/>
</svg>
