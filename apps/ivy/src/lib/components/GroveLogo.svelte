<script lang="ts">
	/**
	 * Grove Logo Component
	 *
	 * A logo that respects the user's accent color by default.
	 * The foliage uses `currentColor` which inherits from --accent-color
	 * when placed in an accent-colored context, or can be overridden.
	 *
	 * The trunk defaults to Grove's classic bark brown (#5d4037).
	 */

	interface Props {
		class?: string;
		/** Size in pixels */
		size?: number;
		/** Foliage color - defaults to currentColor (inherits accent) */
		color?: string;
		/** Trunk color - defaults to classic bark brown */
		trunkColor?: string;
		/** Whether foliage and trunk should be the same color */
		monochrome?: boolean;
	}

	let { class: className = "", size = 24, color, trunkColor, monochrome = false }: Props = $props();

	// Classic bark brown from the nature palette
	const BARK_BROWN = "#5d4037";

	// Compute actual colors
	const foliageColor = color ?? "currentColor";
	const actualTrunkColor = monochrome ? foliageColor : (trunkColor ?? BARK_BROWN);
</script>

<svg
	class={className}
	width={size}
	height={size}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 417 512.238"
	aria-label="Grove logo"
>
	<!-- Trunk -->
	<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z" />
	<!-- Foliage -->
	<path
		fill={foliageColor}
		d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"
	/>
</svg>
