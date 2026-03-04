<script lang="ts">
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { api } from "$lib/utils/api";
	import LanternFAB from "./LanternFAB.svelte";
	import LanternPanel from "./LanternPanel.svelte";
	import type { LanternLayoutData } from "./types";

	interface Props {
		data: LanternLayoutData;
	}

	let { data }: Props = $props();

	// Fetch friends on first panel open
	$effect(() => {
		if (lanternStore.open && !lanternStore.friendsLoaded && !lanternStore.friendsLoading) {
			lanternStore.setFriendsLoading(true);

			api
				.get<{ friends: Array<{ tenantId: string; name: string; subdomain: string; source: string }> }>("/api/lantern/friends")
				.then((result) => {
					lanternStore.setFriends(result?.friends ?? []);
				})
				.catch(() => {
					lanternStore.setFriends([]);
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
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="lantern-backdrop z-grove-fab"
		onclick={handleBackdropClick}
		aria-hidden="true"
	></div>
{/if}

<LanternFAB />
<LanternPanel {data} />

<style>
	.lantern-backdrop {
		position: fixed;
		inset: 0;
	}
</style>
