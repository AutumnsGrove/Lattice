<script lang="ts">
	/**
	 * CurioGuestbook — Display recent guestbook entries
	 *
	 * Fetches the 5 most recent guestbook entries and displays them
	 * in a compact list with emoji, name, and message.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		entries: Array<{ id: string; name: string; message: string; emoji: string; createdAt: string }>;
		pagination: { total: number; hasMore: boolean };
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/guestbook?limit=5') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioGuestbook] Failed to load:', err);
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading guestbook entries…</span>
		<div class="guestbook-skeleton">
			{#each Array(3) as _}
				<div class="guestbook-entry-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Guestbook unavailable</span>
{:else if data}
	<div class="guestbook" role="region" aria-label="Recent guestbook entries">
		<div class="guestbook-entries">
			{#each data.entries as entry (entry.id)}
				<div class="guestbook-entry">
					{#if entry.emoji}
						<span class="guestbook-emoji">{entry.emoji}</span>
					{/if}
					<div class="guestbook-content">
						<strong class="guestbook-name">{entry.name}</strong>
						<p class="guestbook-message">{entry.message}</p>
					</div>
				</div>
			{/each}
		</div>
		<div class="guestbook-footer">
			<span class="guestbook-total">{data.pagination.total} entries total</span>
		</div>
	</div>
{/if}

<style>
	.guestbook {
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.guestbook-entries {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.guestbook-entry {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.04);
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.guestbook-emoji {
		font-size: 1.25rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.guestbook-content {
		flex: 1;
		min-width: 0;
	}

	.guestbook-name {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.guestbook-message {
		margin: 0;
		line-height: 1.4;
		word-wrap: break-word;
	}

	.guestbook-footer {
		text-align: center;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(0, 0, 0, 0.08);
	}

	.guestbook-total {
		font-size: 0.75rem;
		opacity: 0.6;
		font-style: italic;
	}

	.guestbook-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.guestbook-entry-placeholder {
		padding: 0.5rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
		height: 2.5rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}

	:global(.dark) .guestbook-entry {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .guestbook-footer {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .guestbook-entry-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
