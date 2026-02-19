<script lang="ts">
	/**
	 * CurioBlogroll — Display list of blog links
	 *
	 * Fetches a blogroll and displays blog links with favicons,
	 * titles, and descriptions in a vertical list.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		items: Array<{
			id: string;
			url: string;
			title: string;
			description: string;
			faviconUrl: string;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/blogroll') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioBlogroll] Failed to load:', err);
				error = true;
				loading = false;
			});
	});

	function truncate(text: string, length: number): string {
		if (text.length <= length) return text;
		return text.slice(0, length) + '…';
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading blogroll…</span>
		<div class="blogroll-skeleton">
			{#each Array(4) as _}
				<div class="blogroll-item-placeholder">&nbsp;</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Blogroll unavailable</span>
{:else if data}
	<div class="blogroll" role="region" aria-label="Blog recommendations">
		<div class="blogroll-items">
			{#each data.items as item (item.id)}
				<a href={item.url} class="blogroll-item" rel="noopener noreferrer" target="_blank">
					{#if item.faviconUrl}
						<img src={item.faviconUrl} alt="" class="blogroll-favicon" width="16" height="16" />
					{:else}
						<div class="blogroll-favicon-placeholder"></div>
					{/if}
					<div class="blogroll-content">
						<div class="blogroll-title">{item.title}</div>
						<div class="blogroll-description">{truncate(item.description, 80)}</div>
					</div>
					<span class="blogroll-arrow">→</span>
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	.blogroll {
		padding: 1rem;
		border-radius: 0.5rem;
	}

	.blogroll-items {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.blogroll-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.04);
		border-radius: 0.375rem;
		text-decoration: none;
		color: inherit;
		transition: background-color 0.2s ease;
	}

	.blogroll-item:hover {
		background: rgba(0, 0, 0, 0.08);
	}

	.blogroll-item:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: -2px;
	}

	.blogroll-favicon {
		width: 1rem;
		height: 1rem;
		border-radius: 2px;
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.blogroll-favicon-placeholder {
		width: 1rem;
		height: 1rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 2px;
		flex-shrink: 0;
	}

	.blogroll-content {
		flex: 1;
		min-width: 0;
	}

	.blogroll-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.blogroll-description {
		font-size: 0.75rem;
		opacity: 0.7;
		line-height: 1.3;
		word-wrap: break-word;
	}

	.blogroll-arrow {
		opacity: 0;
		font-size: 0.875rem;
		flex-shrink: 0;
		transition: opacity 0.2s ease;
	}

	.blogroll-item:hover .blogroll-arrow {
		opacity: 1;
	}

	.blogroll-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.blogroll-item-placeholder {
		height: 3rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
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

	:global(.dark) .blogroll-item {
		background: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .blogroll-item:hover {
		background: rgba(255, 255, 255, 0.12);
	}

	:global(.dark) .blogroll-favicon-placeholder {
		background: rgba(255, 255, 255, 0.15);
	}

	:global(.dark) .blogroll-item-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}
</style>
