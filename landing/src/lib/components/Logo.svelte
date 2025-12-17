<script lang="ts">
	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
	}

	let { class: className = 'w-6 h-6', color, trunkColor }: Props = $props();

	// Use trunk color if provided, otherwise fall back to main color
	const foliageColor = color ?? 'currentColor';
	const actualTrunkColor = trunkColor ?? foliageColor;
</script>

<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 417 512.238"
>
	<!-- Trunk -->
	<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
	<!-- Foliage -->
	<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
</svg>
