<script lang="ts">
	import { X } from "@lucide/svelte";
	import type { Friend } from "$lib/types/friend";
	import { friendsStore } from "$lib/ui/stores/friends.svelte";
	import { api } from "$lib/utils/api";

	interface Props {
		friend: Friend;
		/** True when the user is currently visiting this friend's grove */
		visiting?: boolean;
	}

	let { friend, visiting = false }: Props = $props();
	let removing = $state(false);

	async function removeFriend() {
		if (removing) return;
		removing = true;

		try {
			await api.delete(`/api/friends/${friend.tenantId}`);
			friendsStore.removeFriend(friend.tenantId);
		} catch {
			// Silently fail — user can retry
		} finally {
			removing = false;
		}
	}
</script>

<div
	class="friend-card flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors hover:bg-surface-hover group"
	class:visiting
>
	<a
		href="https://{friend.subdomain}.grove.place"
		class="flex-1 min-w-0 flex flex-col gap-0.5 no-underline text-inherit focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
		target="_blank"
		rel="noopener noreferrer"
		aria-current={visiting ? "true" : undefined}
	>
		<span class="text-sm font-medium text-foreground truncate">{friend.name}</span>
		<span class="text-xs text-foreground-muted truncate">{friend.subdomain}.grove.place</span>
		{#if visiting}
			<span class="sr-only">(currently visiting)</span>
		{/if}
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
	.friend-card.visiting {
		background: hsl(var(--accent) / 0.08);
		border: 1px solid hsl(var(--accent) / 0.2);
		position: relative;
	}

	.friend-card.visiting::before {
		content: "";
		position: absolute;
		left: 0;
		top: 25%;
		bottom: 25%;
		width: 3px;
		border-radius: 0 2px 2px 0;
		background: hsl(var(--accent));
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.remove-btn {
			transition: none;
		}
	}
</style>
