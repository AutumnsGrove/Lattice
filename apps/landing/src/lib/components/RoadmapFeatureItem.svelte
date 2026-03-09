<!--
	RoadmapFeatureItem.svelte
	Renders a single feature in a roadmap phase list.

	Accepts a Feature, a PhaseStyle for the visual treatment,
	and optional per-feature color/border overrides resolved by the caller.
-->
<script lang="ts">
	import { FeatureStar, GroveTerm } from "@autumnsgrove/lattice/ui";
	import { roadmapFeatureIcons, stateIcons, type RoadmapFeatureIconKey } from "$lib/utils/icons";
	import type { Feature, PhaseStyle } from "$lib/data/roadmapData";

	interface Props {
		feature: Feature;
		style: PhaseStyle;
		/** Resolved icon color class (falls back to style.iconColor) */
		iconColor?: string;
		/** Resolved border class for this feature */
		borderClass?: string;
	}

	let { feature, style, iconColor, borderClass = "" }: Props = $props();

	// Resolve icon: First Frost always uses Check, others look up by feature.icon
	const IconComponent = $derived(
		style.useCheckIcon
			? stateIcons.check
			: feature.icon
				? (roadmapFeatureIcons[feature.icon as RoadmapFeatureIconKey] ?? stateIcons.circle)
				: stateIcons.circle,
	);

	const resolvedIconColor = $derived(iconColor ?? style.iconColor);
</script>

<li
	class="flex items-start gap-3 p-4 rounded-lg {style.li} {borderClass}
		{feature.internal && style.showInternalBadge ? 'opacity-75' : ''}"
>
	<IconComponent class="w-5 h-5 {resolvedIconColor} mt-0.5 flex-shrink-0" aria-hidden="true" />
	<div class="flex-1">
		<div class="flex items-center gap-2">
			<span class="font-medium {style.nameColor}">
				{#if feature.articleSlug}
					<a
						href="/knowledge/help/{feature.articleSlug}"
						class="hover:text-accent transition-colors underline-offset-2 hover:underline"
					>
						{#if feature.termSlug}<GroveTerm term={feature.termSlug}>{feature.name}</GroveTerm
							>{:else}{feature.name}{/if}
					</a>
				{:else if feature.termSlug}<GroveTerm term={feature.termSlug}>{feature.name}</GroveTerm
					>{:else}{feature.name}{/if}
			</span>
			{#if feature.major}
				<FeatureStar variant={style.featureStar} />
			{/if}
			{#if feature.internal && style.showInternalBadge}
				<span class="px-2 py-0.5 text-xs font-medium rounded bg-bark-200 text-bark-700"
					>Internal</span
				>
			{/if}
		</div>
		<p class="text-sm {style.descColor}">{feature.description}</p>
	</div>
</li>
