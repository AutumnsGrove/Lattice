<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Card, Badge, Button, ContentSearch, GroveSwap, GroveIntro } from '$lib/ui';

	let { data } = $props();

	// Get accent color from site settings (falls back to default if not set)
	const accentColor = $derived(data.siteSettings?.accent_color || null);

	// Get initial values from URL params
	const initialQuery = page.url.searchParams.get('q') || '';
	const initialTag = page.url.searchParams.get('tag') || '';

	let searchQuery = $state(initialQuery);
	let selectedTag = $state(initialTag);

	// Pre-compute lowercase searchable fields for performance
	let postsWithLowercase = $derived.by(() => {
		return data.posts.map(post => ({
			...post,
			titleLower: post.title.toLowerCase(),
			descriptionLower: post.description.toLowerCase(),
			tagsLower: post.tags.map(tag => tag.toLowerCase())
		}));
	});

	/**
	 * Filter function for ContentSearch component
	 * @param {{ titleLower: string, descriptionLower: string, tagsLower: string[] }} post
	 * @param {string} query
	 */
	function filterPost(post, query) {
		const q = query.toLowerCase();
		return (
			post.titleLower.includes(q) ||
			post.descriptionLower.includes(q) ||
			post.tagsLower.some((/** @type {string} */ tag) => tag.includes(q))
		);
	}

	// Track search results from ContentSearch
	/** @type {any[]} */
	let searchResults = $state([]);
	/**
	 * @param {string} _query
	 * @param {any[]} results
	 */
	function handleSearchChange(_query, results) {
		searchResults = results;
	}

	// Apply tag filtering reactively to prevent race conditions
	// This ensures filteredPosts updates whenever searchResults OR selectedTag changes
	let filteredPosts = $derived.by(() => {
		if (selectedTag) {
			return searchResults.filter(post => post.tags.includes(selectedTag));
		}
		return searchResults;
	});

	// Update URL when tag filter changes
	function updateUrl() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (selectedTag) params.set('tag', selectedTag);

		const newUrl = params.toString() ? `?${params.toString()}` : '/garden/search';
		goto(newUrl, { replaceState: true, keepFocus: true });
	}

	/** @param {string} tag */
	function selectTag(tag) {
		if (selectedTag === tag) {
			selectedTag = '';
		} else {
			selectedTag = tag;
		}
		updateUrl();
	}

	function clearFilters() {
		searchQuery = '';
		selectedTag = '';
		goto('/garden/search', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Search Garden{data.context?.type === 'tenant' ? ` - ${data.context.tenant.name}` : ''}</title>
	<meta name="description" content="Search the garden by keyword or filter by tags." />
</svelte:head>

<div class="search-header">
	<h1>Search <GroveSwap term="your-garden">Garden</GroveSwap></h1>
	<GroveIntro term="your-garden" />
	<p>Find <GroveSwap term="blooms">blooms</GroveSwap> by keyword or filter by tags.</p>
</div>

<div class="search-container">
	<ContentSearch
		items={postsWithLowercase}
		filterFn={filterPost}
		bind:searchQuery
		placeholder="Search posts..."
		syncWithUrl={true}
		queryParam="q"
		debounceDelay={250}
		onSearchChange={handleSearchChange}
		wrapperClass="search-wrapper-custom"
	>
		{#snippet children()}
			{#if data.allTags.length > 0}
				<div class="tags-filter">
					<span class="filter-label">Filter by tag:</span>
					<div class="tags" style:--accent-color={accentColor}>
						{#each data.allTags as tag (tag)}
							<Badge
								variant="tag"
								class="accent-tag {selectedTag === tag ? 'selected-tag' : ''} cursor-pointer select-none"
								onclick={() => selectTag(tag)}
								aria-label="{selectedTag === tag ? 'Remove' : 'Filter by'} tag: {tag}"
								aria-pressed={selectedTag === tag}
							>
								{tag}
							</Badge>
						{/each}
					</div>
				</div>
			{/if}
		{/snippet}
	</ContentSearch>
</div>

<div class="results-info">
	{#if selectedTag || searchQuery}
		<p>
			Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
			{#if selectedTag}
				tagged with <strong>"{selectedTag}"</strong>
			{/if}
			{#if searchQuery}
				{#if selectedTag}and{/if} matching <strong>"{searchQuery}"</strong>
			{/if}
		</p>
	{:else}
		<p>Showing all {data.posts.length} <GroveSwap term="blooms">blooms</GroveSwap></p>
	{/if}
</div>

{#if filteredPosts.length === 0}
	<div class="no-results">
		<p>No <GroveSwap term="blooms">blooms</GroveSwap> found matching your criteria.</p>
		<Button variant="default" onclick={clearFilters}>Clear filters</Button>
	</div>
{:else}
	<div class="posts-grid">
		{#each filteredPosts as post (post.slug)}
			<Card hoverable>
				<a href="/garden/{post.slug}" class="post-link">
					<h2 class="text-xl font-semibold mb-4 text-green-800 dark:text-green-500 transition-colors">{post.title}</h2>
					<div class="post-meta">
						<time datetime={post.date} class="text-sm text-foreground-subtle transition-colors">
							{new Date(post.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
						{#if post.tags.length > 0}
							<div class="tags" style:--accent-color={accentColor}>
								{#each post.tags as tag (tag)}
									<Badge
										variant="tag"
										class="accent-tag {selectedTag === tag ? 'selected-tag' : ''} cursor-pointer"
										onclick={(e) => { e.preventDefault(); e.stopPropagation(); selectTag(tag); }}
										aria-label="{selectedTag === tag ? 'Remove' : 'Filter by'} tag: {tag}"
										aria-pressed={selectedTag === tag}
									>
										{tag}
									</Badge>
								{/each}
							</div>
						{/if}
					</div>
					{#if post.description}
						<p class="description">{post.description}</p>
					{/if}
				</a>
			</Card>
		{/each}
	</div>
{/if}

<style>
	.search-header {
		text-align: center;
		margin-top: 1rem;
		margin-bottom: 2rem;
	}
	.search-header h1 {
		font-size: 2.5rem;
		color: #2c5f2d;
		margin-bottom: 0.75rem;
		letter-spacing: -0.02em;
		transition: color 0.3s ease;
	}
	:global(.dark) .search-header h1 {
		color: var(--accent-success);
	}
	.search-header p {
		color: #666;
		font-size: 1.1rem;
		transition: color 0.3s ease;
	}
	.search-container {
		max-width: 800px;
		margin: 0 auto 2rem;
	}
	.tags-filter {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.filter-label {
		font-size: 0.9rem;
		color: #666;
		font-weight: 500;
		transition: color 0.3s ease;
	}
	.tags-filter .tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.results-info {
		max-width: 800px;
		margin: 0 auto 1.5rem;
	}
	.results-info p {
		color: #666;
		font-size: 0.95rem;
		transition: color 0.3s ease;
	}
	.results-info strong {
		color: #2c5f2d;
	}
	:global(.dark) .results-info strong {
		color: var(--accent-success);
	}
	.no-results {
		text-align: center;
		padding: 3rem;
		color: #666;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.posts-grid {
		display: grid;
		gap: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}
	.post-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}
	.post-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}
	.description {
		color: #666;
		line-height: 1.6;
		margin: 0;
		transition: color 0.3s ease;
	}
	@media (max-width: 768px) {
		.search-header {
			margin-bottom: 1.5rem;
		}
		.search-header h1 {
			font-size: 2rem;
		}
	}

	/* Apply accent color to tags when set via CSS custom property */
	.tags[style*="--accent-color"] :global(.accent-tag) {
		background: var(--accent-color, var(--tag-bg));
		border-color: var(--accent-color, var(--tag-bg));
	}

	.tags[style*="--accent-color"] :global(.accent-tag:hover) {
		filter: brightness(1.1);
	}

	/* Selected tag styling - uses higher specificity to override accent color */
	.tags[style*="--accent-color"] :global(.accent-tag.selected-tag),
	.tags :global(.selected-tag) {
		background: #2c5f2d;
		border-color: #2c5f2d;
		color: white;
		filter: none;
	}

	:global(.dark) .tags[style*="--accent-color"] :global(.accent-tag.selected-tag),
	:global(.dark) .tags :global(.selected-tag) {
		background: #16a34a;
		border-color: #16a34a;
	}
</style>
