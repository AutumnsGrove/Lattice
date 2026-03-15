<script lang="ts">
	import { phaseIcons } from "@autumnsgrove/prism/icons";

	/**
	 * FeatureStar - Inline star indicator for key/featured items
	 *
	 * Used to mark important features on the roadmap without implying interactivity.
	 * The star is decorative (aria-hidden) since context already conveys meaning.
	 *
	 * @example Default amber star
	 * ```svelte
	 * <FeatureStar />
	 * ```
	 *
	 * @example Midnight variant (lighter amber for dark backgrounds)
	 * ```svelte
	 * <FeatureStar variant="midnight" />
	 * ```
	 */

	interface Props {
		/** Color variant: "default" (amber-500) or "midnight" (amber-400 for dark backgrounds) */
		variant?: "default" | "midnight";
	}

	let { variant = "default" }: Props = $props();

	const colorClass = $derived(
		variant === "midnight" ? "text-accent-muted fill-accent-muted" : "text-accent fill-accent",
	);
</script>

<phaseIcons.star class="w-4 h-4 {colorClass}" aria-hidden="true" />
