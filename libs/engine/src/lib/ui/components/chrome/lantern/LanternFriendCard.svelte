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

<div class="friend-card">
	<a
		href="https://{friend.subdomain}.grove.place"
		class="friend-link"
		target="_blank"
		rel="noopener noreferrer"
	>
		<span class="friend-name">{friend.name}</span>
		<span class="friend-subdomain">{friend.subdomain}.grove.place</span>
	</a>
	<button
		type="button"
		class="remove-btn"
		onclick={removeFriend}
		disabled={removing}
		aria-label="Remove {friend.name}"
		title="Remove friend"
	>
		<X size={14} />
	</button>
</div>

<style>
	.friend-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 8px;
		transition: background-color 0.15s ease;
	}

	.friend-card:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .friend-card:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.friend-link {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		text-decoration: none;
		color: inherit;
	}

	.friend-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.friend-subdomain {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			color 0.15s ease;
	}

	.friend-card:hover .remove-btn {
		opacity: 1;
	}

	.remove-btn:hover {
		color: var(--destructive, #ef4444);
	}

	.remove-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
