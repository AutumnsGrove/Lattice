<script lang="ts">
	import { authIcons } from "@autumnsgrove/prism/icons";
	import { friendsStore } from "$lib/ui/stores/friends.svelte";
	import { api } from "$lib/utils/api";
	import type { VisitingGrove } from "./types";

	interface Props {
		grove: VisitingGrove;
	}

	let { grove }: Props = $props();
	let adding = $state(false);
	let status = $state<"idle" | "added" | "error">("idle");

	async function addFriend() {
		if (adding) return;
		adding = true;
		status = "idle";

		try {
			const result = await api.post<{
				friend: { tenantId: string; name: string; subdomain: string; source: string };
			}>("/api/friends", { friendSubdomain: grove.subdomain });
			if (result?.friend) {
				friendsStore.addFriend(result.friend);
				status = "added";
			}
		} catch {
			status = "error";
		} finally {
			adding = false;
		}
	}
</script>

<div class="visiting-card">
	<div class="visiting-info">
		<span class="visiting-label">You're visiting</span>
		<span class="visiting-name">{grove.name}</span>
	</div>
	<button
		type="button"
		class="visiting-add"
		disabled={adding}
		onclick={addFriend}
		aria-label={adding ? `Adding ${grove.name}…` : `Add ${grove.name} as a friend`}
		aria-busy={adding}
	>
		{#if adding}
			<span class="visiting-spinner" aria-hidden="true"></span>
		{:else}
			<authIcons.userPlus size={14} aria-hidden="true" />
		{/if}
		<span>Add Friend</span>
	</button>
	<span class="sr-only" role="status" aria-live="polite">
		{#if status === "added"}
			{grove.name} added as a friend.
		{:else if status === "error"}
			Could not add {grove.name}. Try again.
		{/if}
	</span>
</div>

<style>
	.visiting-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		background: hsl(var(--accent) / 0.06);
		border: 1px solid hsl(var(--accent) / 0.15);
	}

	.visiting-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.visiting-label {
		font-size: 0.75rem;
		color: hsl(var(--foreground-muted));
		line-height: 1;
	}

	.visiting-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.visiting-add {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border: none;
		border-radius: 0.375rem;
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s ease;
		min-height: 44px;
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

	.visiting-add:hover:not(:disabled) {
		opacity: 0.9;
	}

	.visiting-add:focus-visible {
		outline: 2px solid hsl(var(--accent));
		outline-offset: 2px;
	}

	.visiting-add:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.visiting-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: visiting-spin 0.6s linear infinite;
	}

	@keyframes visiting-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.visiting-add {
			transition: none;
		}

		.visiting-spinner {
			animation: visiting-pulse 1s ease-in-out infinite;
		}

		@keyframes visiting-pulse {
			0%,
			100% {
				opacity: 0.4;
			}
			50% {
				opacity: 1;
			}
		}
	}
</style>
