<script lang="ts">
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import LanternFAB from "./LanternFAB.svelte";
	import LanternPanel from "./LanternPanel.svelte";
	import type { LanternLayoutData } from "./types";

	interface Props {
		data: LanternLayoutData;
	}

	let { data }: Props = $props();

	// Signal to other fixed-position elements (e.g. MobileTOC) that the Lantern FAB exists
	$effect(() => {
		document.body.setAttribute("data-lantern", "");
		return () => document.body.removeAttribute("data-lantern");
	});

	// Move focus into the dialog when panel opens
	$effect(() => {
		if (lanternStore.open) {
			requestAnimationFrame(() => {
				const panel = document.querySelector<HTMLElement>(".lantern-panel");
				const firstFocusable = panel?.querySelector<HTMLElement>(
					"a[href], button:not([disabled]), input",
				);
				firstFocusable?.focus();
			});
		}
	});

	// Handle Escape key and click-outside
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && lanternStore.open) {
			lanternStore.close();
			// Return focus to FAB
			const fab = document.querySelector<HTMLButtonElement>(".lantern-fab");
			fab?.focus();
		}
	}

	function handleBackdropClick() {
		if (lanternStore.open) {
			lanternStore.close();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if lanternStore.open}
	<div class="lantern-backdrop z-grove-fab" onclick={handleBackdropClick} aria-hidden="true"></div>
{/if}

<LanternFAB />
<LanternPanel {data} />

<style>
	.lantern-backdrop {
		position: fixed;
		inset: 0;
	}
</style>
