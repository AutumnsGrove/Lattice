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

<!-- Willow tree - drooping branches -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 120 140"
>
	<!-- Trunk -->
	<path fill={actualTrunkColor} d="M55 55 Q52 80 50 140 L70 140 Q68 80 65 55 Q60 50 55 55"/>

	<!-- Crown base -->
	<ellipse fill={foliageColor} cx="60" cy="35" rx="35" ry="28"/>

	<!-- Drooping branches - left side -->
	<path fill={foliageColor} d="M25 35 Q15 50 10 90 Q18 88 25 75 Q20 60 30 45 Q25 40 25 35"/>
	<path fill={foliageColor} d="M35 40 Q25 55 20 100 Q28 97 35 82 Q30 65 40 50 Q35 45 35 40"/>

	<!-- Drooping branches - center -->
	<path fill={foliageColor} d="M50 45 Q45 65 42 105 Q50 102 55 85 Q50 70 55 55 Q52 48 50 45"/>
	<path fill={foliageColor} d="M70 45 Q75 65 78 105 Q70 102 65 85 Q70 70 65 55 Q68 48 70 45"/>

	<!-- Drooping branches - right side -->
	<path fill={foliageColor} d="M85 40 Q95 55 100 100 Q92 97 85 82 Q90 65 80 50 Q85 45 85 40"/>
	<path fill={foliageColor} d="M95 35 Q105 50 110 90 Q102 88 95 75 Q100 60 90 45 Q95 40 95 35"/>
</svg>
