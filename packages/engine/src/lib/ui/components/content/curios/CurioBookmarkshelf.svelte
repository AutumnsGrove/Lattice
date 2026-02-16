<script lang="ts">
	/**
	 * CurioBookmarkshelf — Display organized bookmark shelves
	 *
	 * Fetches bookmark shelves from the API and displays them as sections
	 * with shelf names as headings. Each bookmark shows a cover image
	 * (if available), title, author, and reading status badges.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		shelves: Array<{
			id: string;
			name: string;
			description: string;
			bookmarks: Array<{
				id: string;
				url: string;
				title: string;
				author: string;
				description: string;
				coverUrl: string | null;
				isCurrentlyReading: boolean;
				isFavorite: boolean;
			}>;
		}>;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		fetch('/api/curios/bookmarkshelf') // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn('[CurioBookmarkshelf] Failed to load:', err);
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading bookmarks…</span>
		<div class="bookmarkshelf-skeleton">
			{#each Array(3) as _}
				<div class="shelf-section-placeholder">
					<div class="shelf-title-placeholder">&nbsp;</div>
					<div class="shelf-bookmarks-placeholder">
						{#each Array(2) as _}
							<div class="bookmark-placeholder">&nbsp;</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Bookmarks unavailable</span>
{:else if data}
	<div class="bookmarkshelf" role="region" aria-label="Bookmark shelves">
		{#each data.shelves as shelf (shelf.id)}
			<section class="shelf-section">
				<h2 class="shelf-title">{shelf.name}</h2>
				{#if shelf.description}
					<p class="shelf-description">{shelf.description}</p>
				{/if}
				{#if shelf.bookmarks.length === 0}
					<p class="shelf-empty">No bookmarks on this shelf yet</p>
				{:else}
					<div class="bookmarks-grid">
						{#each shelf.bookmarks as bookmark (bookmark.id)}
							<a
								href={bookmark.url}
								target="_blank"
								rel="noopener noreferrer"
								class="bookmark-card"
								title={bookmark.title}
							>
								{#if bookmark.coverUrl}
									<img
										src={bookmark.coverUrl}
										alt="Cover for {bookmark.title}"
										class="bookmark-cover"
									/>
								{:else}
									<div class="bookmark-cover-placeholder">
										<span class="sr-only">No cover available</span>
									</div>
								{/if}
								<div class="bookmark-info">
									<h3 class="bookmark-title">{bookmark.title}</h3>
									{#if bookmark.author}
										<p class="bookmark-author">by {bookmark.author}</p>
									{/if}
									<div class="bookmark-badges">
										{#if bookmark.isCurrentlyReading}
											<span class="badge badge-reading" title="Currently reading">
												Reading
											</span>
										{/if}
										{#if bookmark.isFavorite}
											<span class="badge badge-favorite" title="Favorite">
												Favorite
											</span>
										{/if}
									</div>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	</div>
{/if}

<style>
	.bookmarkshelf {
		padding: 0.5rem 0;
	}

	.shelf-section {
		margin-bottom: 2rem;
	}

	.shelf-section:last-child {
		margin-bottom: 0;
	}

	.shelf-title {
		margin: 0 0 0.5rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.shelf-description {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		opacity: 0.7;
	}

	.shelf-empty {
		margin: 1rem 0;
		font-size: 0.875rem;
		opacity: 0.6;
		font-style: italic;
	}

	.bookmarks-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1rem;
	}

	.bookmark-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s ease;
	}

	.bookmark-card:hover {
		transform: translateY(-2px);
	}

	.bookmark-card:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
		border-radius: 0.375rem;
	}

	.bookmark-cover {
		width: 100%;
		height: 6rem;
		object-fit: cover;
		border-radius: 0.375rem;
		background: rgba(0, 0, 0, 0.05);
	}

	.bookmark-cover-placeholder {
		width: 100%;
		height: 6rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.bookmark-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.bookmark-title {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.bookmark-author {
		margin: 0;
		font-size: 0.75rem;
		opacity: 0.7;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bookmark-badges {
		display: flex;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.badge {
		display: inline-block;
		padding: 0.1875rem 0.375rem;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 0.1875rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		opacity: 0.8;
	}

	.badge-reading {
		background: rgba(59, 130, 246, 0.1);
		color: rgb(37, 99, 235);
	}

	.badge-favorite {
		background: rgba(236, 72, 153, 0.1);
		color: rgb(190, 24, 93);
	}

	.bookmarkshelf-skeleton {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.shelf-section-placeholder {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.shelf-title-placeholder {
		height: 1.5rem;
		width: 50%;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.shelf-bookmarks-placeholder {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1rem;
	}

	.bookmark-placeholder {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.bookmark-placeholder::before {
		content: '';
		display: block;
		width: 100%;
		height: 6rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
	}

	.bookmark-placeholder::after {
		content: '';
		display: block;
		height: 0.875rem;
		background: rgba(0, 0, 0, 0.06);
		border-radius: 0.1875rem;
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

	:global(.dark) .bookmark-cover-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .badge {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .shelf-title-placeholder {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .bookmark-placeholder::before {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .bookmark-placeholder::after {
		background: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .badge-reading {
		background: rgba(59, 130, 246, 0.15);
		color: rgb(147, 197, 253);
	}

	:global(.dark) .badge-favorite {
		background: rgba(236, 72, 153, 0.15);
		color: rgb(249, 168, 212);
	}
</style>
