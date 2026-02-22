<!--
  Blaze — Content marker badge.

  Renders a small pill with icon + label. Can display either an auto blaze
  (from BLAZE_CONFIG) or a custom blaze (from a BlazeDefinition).
  Label collapses on mobile viewports (<sm).
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

	const resolved = $derived.by(() => {
		if (postType) {
			const config = BLAZE_CONFIG[postType];
			return { icon: config.icon, label: config.label, classes: config.classes };
		}
		const colorClasses = BLAZE_COLORS[definition.color]?.classes ?? BLAZE_COLORS.slate.classes;
		return {
			icon: resolveLucideIcon(definition.icon),
			label: definition.label,
			classes: colorClasses,
		};
	});

	const Icon = $derived(resolved.icon);
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {resolved.classes}"
	aria-label="{resolved.label} post"
>
	<Icon class="h-3.5 w-3.5" aria-hidden="true" />
	<span class="hidden sm:inline">{resolved.label}</span>
</span>
