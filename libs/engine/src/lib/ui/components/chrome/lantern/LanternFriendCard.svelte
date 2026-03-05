<script lang="ts">
	import { X } from "lucide-svelte";
	import type { LanternFriend } from "./types";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { api } from "$lib/utils/api";

	interface Props {
		friend: LanternFriend;
	}

	let { friend }: Props = $props();
	let removing = $state(false);

	async function removeFriend() {
		if (removing) return;
		removing = true;

		try {
			await api.delete(`/api/lantern/friends/${friend.tenantId}`);
			lanternStore.removeFriend(friend.tenantId);
		} catch {
			// Silently fail — user can retry
		} finally {
			removing = false;
		}
	}
</script>

<div
	class="flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors hover:bg-surface-hover group"
>
	<a
		href="https://{friend.subdomain}.grove.place"
		class="flex-1 min-w-0 flex flex-col gap-0.5 no-underline text-inherit focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
		target="_blank"
		rel="noopener noreferrer"
	>
		<span class="text-sm font-medium text-foreground truncate">{friend.name}</span>
		<span class="text-xs text-foreground-muted truncate">{friend.subdomain}.grove.place</span>
	</a>
	<button
		type="button"
		class="remove-btn flex-shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] rounded border-none bg-transparent text-foreground-subtle cursor-pointer opacity-40 transition-opacity
			group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]
			hover:text-destructive disabled:opacity-25 disabled:cursor-not-allowed"
		onclick={removeFriend}
		disabled={removing}
		aria-label="Remove {friend.name}"
		title="Remove friend"
	>
		<X size={14} />
	</button>
</div>

<style>
	@media (prefers-reduced-motion: reduce) {
		.remove-btn {
			transition: none;
		}
	}
</style>
