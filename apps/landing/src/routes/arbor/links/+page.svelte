<script lang="ts">
	/**
	 * Short Links Admin Page (Landing)
	 *
	 * The Wayfinder's personal short links at link.grove.place. Wanderers manage
	 * theirs from their own Arbor; both use the shared ShortLinksManager.
	 */

	import { actionIcons } from "@autumnsgrove/prism/icons";
	import { ShortLinksManager } from "@autumnsgrove/lattice/ui/arbor";
	const Link = actionIcons.link;

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Short Links - Admin</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-serif text-foreground flex items-center gap-2">
			<Link class="w-6 h-6 text-grove-600 dark:text-grove-400" />
			Short Links
		</h1>
		<p class="text-foreground-muted font-sans mt-1">
			Your own short links. Point them anywhere that starts with https.
		</p>
	</div>

	<ShortLinksManager
		links={data.links}
		{form}
		targetPlaceholder="https://example.com/a/very/long/address"
		targetHint="Any address that starts with https://."
	/>
</div>
