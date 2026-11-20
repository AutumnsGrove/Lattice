<script lang="ts">
	import { stateIcons } from "@autumnsgrove/prism/icons";
	import GroveTermPopup from "$lib/components/terminology/GroveTermPopup.svelte";
	import type { GroveTermManifest } from "$lib/components/terminology/types";
	import manifestData from "$lib/data/grove-term-manifest.json";
	import { getTermEntry } from "$lib/ui/utils/grove-term-resolve";

	/**
	 * LanternTermHelp — a small "?" beside a Grove term in the Lantern panel.
	 *
	 * Opens the term's definition popup. It is a sibling of the destination link,
	 * never inside it, so the link keeps its normal click behaviour. Renders
	 * nothing for a slug that is not a Grove term.
	 */

	interface Props {
		/** Term slug from the Grove term manifest (e.g. "canopy") */
		slug: string;
	}

	let { slug }: Props = $props();

	const manifest = manifestData as GroveTermManifest;
	const entry = $derived(getTermEntry(slug));

	let open = $state(false);
</script>

{#if entry}
	<button
		type="button"
		class="term-help relative flex items-center justify-center shrink-0 w-5 h-5 rounded-full border border-default bg-transparent text-foreground-muted cursor-pointer transition-colors hover:text-accent-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
		aria-label="About {entry.term}"
		aria-haspopup="dialog"
		onclick={() => (open = true)}
	>
		<stateIcons.help size={12} />
	</button>

	<GroveTermPopup bind:open {entry} {manifest} />
{/if}

<style>
	/* Keep the 20px visual size but meet the 44px touch target (WCAG 2.5.5), as Waystone does. */
	.term-help::before {
		content: "";
		position: absolute;
		inset: -12px;
		border-radius: 50%;
	}

	@media (prefers-reduced-motion: reduce) {
		.term-help {
			transition: none;
		}
	}
</style>
