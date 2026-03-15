<script lang="ts">
	/**
	 * CurioGuestbook — Display recent guestbook entries
	 *
	 * Fetches the 5 most recent guestbook entries and displays them.
	 * Supports two modes controlled by the owner's config:
	 *   - compact: simple list with emoji, name, message (default)
	 *   - styled: mini-collage showing signing styles at reduced scale
	 */

	import {
		getEntryRotation,
		getDeterministicStyle,
		type GuestbookSigningStyle,
		type GuestbookInlineMode,
	} from "$lib/curios/guestbook";

	let { arg = "" }: { arg?: string } = $props();

	type EntryData = {
		id: string;
		name: string;
		message: string;
		emoji: string;
		createdAt: string;
		entryStyle: GuestbookSigningStyle | null;
		entryColor: string | null;
	};

	let data = $state<{
		entries: EntryData[];
		pagination: { total: number; hasMore: boolean };
	} | null>(null);
	let inlineMode = $state<GuestbookInlineMode>("compact");
	let loading = $state(true);
	let error = $state(false);

	// Resolve display style/color for entries (handles legacy nulls)
	function entryStyle(entry: EntryData): GuestbookSigningStyle {
		return entry.entryStyle ?? getDeterministicStyle(entry.id, null);
	}

	function entryColor(entry: EntryData): string | undefined {
		return entry.entryColor ?? undefined;
	}

	$effect(() => {
		Promise.all([
			fetch("/api/curios/guestbook?limit=5").then((r) => {
				// csrf-ok
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			}),
			fetch("/api/curios/guestbook/config").then((r) => {
				// csrf-ok
				if (!r.ok) return null;
				return r.json() as Promise<{ inlineMode?: GuestbookInlineMode }>;
			}),
		])
			.then(([entries, config]) => {
				data = entries;
				if (config?.inlineMode) inlineMode = config.inlineMode;
				// Allow arg override: "styled" or "compact"
				if (arg === "styled" || arg === "compact") inlineMode = arg;
				loading = false;
			})
			.catch((err) => {
				console.warn("[CurioGuestbook] Failed to load:", err);
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
	<div
		class="guestbook"
		class:guestbook-styled={inlineMode === "styled"}
		role="region"
		aria-label="Recent guestbook entries"
	>
		{#if inlineMode === "styled"}
			<!-- Styled mini-collage -->
			<div class="guestbook-collage">
				{#each data.entries as entry (entry.id)}
					{@const style = entryStyle(entry)}
					{@const color = entryColor(entry)}
					<div
						class="mini-entry mini-{style}"
						style:--entry-color={color}
						style:--entry-rotation="{getEntryRotation(entry.id)}deg"
					>
						{#if entry.emoji}
							<span class="mini-emoji">{entry.emoji}</span>
						{/if}
						<strong class="mini-name">{entry.name}</strong>
						<p class="mini-message">{entry.message}</p>
					</div>
				{/each}
			</div>
		{:else}
			<!-- Compact list -->
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
		{/if}
		<div class="guestbook-footer">
			<span class="guestbook-total">{data.pagination.total} entries total</span>
		</div>
	</div>
{/if}

<style>
	/* ─── Shared ─── */
	.guestbook {
		padding: 1rem;
		border-radius: 0.5rem;
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

	/* ─── Compact Mode ─── */
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

	/* ─── Styled Mini-Collage ─── */
	.guestbook-collage {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.mini-entry {
		padding: 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.75rem;
		overflow: hidden;
	}

	.mini-emoji {
		font-size: 1rem;
		line-height: 1;
	}

	.mini-name {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		margin-bottom: 0.125rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.mini-message {
		margin: 0;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Mini signing styles */
	.mini-sticky {
		background: var(--entry-color, #e8d5a3);
		transform: rotate(var(--entry-rotation, 0deg));
		box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.1);
		font-family: "Caveat", cursive;
	}

	.mini-note {
		background: var(--color-background, #fff);
		border-left: 2px solid var(--entry-color, #e88f7a);
		border-top: 1px solid var(--color-border, #e5e7eb);
		font-family: "Caveat", cursive;
	}

	.mini-line {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0;
		border-left: 2px solid var(--entry-color, var(--color-primary));
		padding-left: 0.5rem;
		border-radius: 0;
	}

	.mini-line .mini-name {
		display: inline;
		white-space: normal;
	}

	.mini-line .mini-message {
		display: inline;
		-webkit-line-clamp: unset;
		line-clamp: unset;
	}

	.mini-letter {
		background: var(--color-background, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: 0.375rem;
	}

	.mini-letter .mini-name::before {
		content: "";
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--entry-color, #c4a7d7);
		margin-right: 0.25rem;
		vertical-align: middle;
	}

	.mini-postcard {
		background: var(--color-background, #fff);
		border: 1px solid var(--color-border, #e5e7eb);
		border-top: 3px solid var(--entry-color, #8cb8d4);
		border-radius: 0.375rem;
	}

	.mini-doodle {
		background: var(--color-background, #fff);
		border: 1.5px dashed var(--entry-color, #a3c4a3);
		border-radius: 0.375rem;
	}

	/* ─── Skeleton ─── */
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

	/* ─── Dark Mode ─── */
	:global(.dark) .guestbook-entry {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .guestbook-footer {
		border-top-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .guestbook-entry-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .mini-note {
		background: rgba(255, 255, 255, 0.04);
	}

	:global(.dark) .mini-letter,
	:global(.dark) .mini-postcard,
	:global(.dark) .mini-doodle {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.1);
	}

	/* ─── Reduced Motion ─── */
	@media (prefers-reduced-motion: reduce) {
		.mini-sticky {
			transform: none !important;
		}
	}
</style>
