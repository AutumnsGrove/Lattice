<!--
  Blaze — Content marker badge.

  Renders a small pill with icon + label. Can display either an auto blaze
  (from BLAZE_CONFIG) or a custom blaze (from a BlazeDefinition).
  Label collapses on mobile viewports (<sm).

  Supports both named palette colors (e.g. "grove", "rose") and custom
  hex colors (e.g. "#e88f7a") for maximum creative flexibility.
-->
<script lang="ts">
	import { BLAZE_CONFIG, BLAZE_COLORS, resolveLucideIcon } from "$lib/blazes/index.js";

	interface AutoProps {
		/** Auto blaze: pass the post type */
		postType: "bloom" | "note";
		definition?: never;
	}

	interface CustomProps {
		/** Custom blaze: pass the resolved definition */
		postType?: never;
		definition: { label: string; icon: string; color: string };
	}

	type Props = AutoProps | CustomProps;

	const { postType, definition }: Props = $props();

	/** Check if a string is a hex color */
	function isHexColor(color: string): boolean {
		return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
	}

	const resolved = $derived.by(() => {
		if (postType) {
			const config = BLAZE_CONFIG[postType];
			return { icon: config.icon, label: config.label, classes: config.classes, hexColor: null };
		}
		// Check if color is a hex value (custom color)
		if (isHexColor(definition.color)) {
			return {
				icon: resolveLucideIcon(definition.icon),
				label: definition.label,
				classes: "",
				hexColor: definition.color,
			};
		}
		// Named palette color
		const colorClasses = BLAZE_COLORS[definition.color]?.classes ?? BLAZE_COLORS.slate.classes;
		return {
			icon: resolveLucideIcon(definition.icon),
			label: definition.label,
			classes: colorClasses,
			hexColor: null,
		};
	});

	const Icon = $derived(resolved.icon);
</script>

{#if resolved.hexColor}
	<span
		class="blaze-custom-hex inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
		style:--blaze-hex={resolved.hexColor}
		aria-label="{resolved.label} post"
	>
		<Icon class="h-3.5 w-3.5" aria-hidden="true" />
		<span class="hidden sm:inline">{resolved.label}</span>
	</span>
{:else}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {resolved.classes}"
		aria-label="{resolved.label} post"
	>
		<Icon class="h-3.5 w-3.5" aria-hidden="true" />
		<span class="hidden sm:inline">{resolved.label}</span>
	</span>
{/if}

<style>
	/* Custom hex color rendering — uses CSS custom property for the color */
	.blaze-custom-hex {
		background: color-mix(in srgb, var(--blaze-hex) 15%, transparent);
		color: var(--blaze-hex);
	}

	:global(.dark) .blaze-custom-hex {
		background: color-mix(in srgb, var(--blaze-hex) 20%, transparent);
		color: color-mix(in srgb, var(--blaze-hex) 70%, white);
	}
</style>
