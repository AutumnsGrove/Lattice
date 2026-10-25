<script lang="ts">
	import { ArborSection, ShortLinksManager } from "@autumnsgrove/lattice/ui/arbor";
	import { actionIcons } from "@autumnsgrove/prism/icons";

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Short Links - Arbor</title>
</svelte:head>

<ArborSection
	title="Short Links"
	description="Short, easy-to-share addresses for your grove at link.grove.place."
	icon={actionIcons.link}
>
	<ShortLinksManager
		links={data.links}
		{form}
		targetPlaceholder={`https://${data.subdomain ?? "yourname"}.grove.place/about`}
		targetHint="Short links point to pages in your own grove. Every bloom already gets one from the garden."
	/>
</ArborSection>
