<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Card, Badge, Button, Input } from '$lib/ui';

	let { data } = $props();

	// Get initial values from URL params
	const initialQuery = $page.url.searchParams.get('q') || '';
	const initialTag = $page.url.searchParams.get('tag') || '';

	let searchQuery = $state(initialQuery);
	let selectedTag = $state(initialTag);

	// Debounced search query for performance - initialized to same value as searchQuery
	let debouncedQuery = $state(initialQuery);
	/** @type {ReturnType<typeof setTimeout> | null} */
	let debounceTimer = $state(null);

	/** @param {Event} event */
	function debouncedSearchInput(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		searchQuery = target.value;

		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer for debounced update
		debounceTimer = setTimeout(() => {
			debouncedQuery = searchQuery;
			updateUrl();
		}, 250);
	}

	// Pre-compute lowercase searchable fields for performance
	let postsWithLowercase = $derived.by(() => {
		return data.posts.map(post => ({
			...post,
			titleLower: post.title.toLowerCase(),
			descriptionLower: post.description.toLowerCase(),
			tagsLower: post.tags.map(tag => tag.toLowerCase())
		}));
	});

	// Filter posts based on search query and selected tag
	let filteredPosts = $derived.by(() => {
		let results = postsWithLowercase;

		// Filter by tag if selected
		if (selectedTag) {
			results = results.filter(post => post.tags.includes(selectedTag));
		}

		// Filter by search query (using debounced query)
		if (debouncedQuery.trim()) {
			const query = debouncedQuery.toLowerCase().trim();
			results = results.filter(post =>
				post.titleLower.includes(query) ||
				post.descriptionLower.includes(query) ||
				post.tagsLower.some(tag => tag.includes(query))
			);
		}

		return results;
	});

	// Update URL when filters change
	function updateUrl() {
		const params = new URLSearchParams();
		if (searchQuery.trim()) params.set('q', searchQuery.trim());
		if (selectedTag) params.set('tag', selectedTag);

		const newUrl = params.toString() ? `?${params.toString()}` : '/blog/search';
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
		debouncedQuery = '';
		selectedTag = '';
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		goto('/blog/search', { replaceState: true });
	}
</script>

<svelte:head>
	<title>Search Blog - AutumnsGrove</title>
	<meta name="description" content="Search blog posts by keyword or filter by tags." />
</svelte:head>

<div class="search-header">
	<h1>Search Blog</h1>
	<p>Find posts by keyword or filter by tags.</p>
</div>

<div class="search-container">
	<div class="search-input-wrapper">
		<svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.3-4.3"></path>
		</svg>
		<input
			type="text"
			placeholder="Search posts..."
			value={searchQuery}
			oninput={debouncedSearchInput}
			class="search-input"
			required
		/>
		{#if searchQuery || selectedTag}
			<Button variant="ghost" size="icon" onclick={clearFilters} class="absolute right-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"></path>
					<path d="m6 6 12 12"></path>
				</svg>
			</Button>
		{/if}
	</div>

	{#if data.allTags.length > 0}
		<div class="tags-filter">
			<span class="filter-label">Filter by tag:</span>
			<div class="tags">
				{#each data.allTags as tag (tag)}
					<Badge
						variant="tag"
						class="{selectedTag === tag ? 'bg-green-800 dark:bg-green-600 text-white' : ''} cursor-pointer select-none"
						onclick={() => selectTag(tag)}
					>
						{tag}
					</Badge>
				{/each}
			</div>
		</div>
	{/if}
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
		<p>Showing all {data.posts.length} posts</p>
	{/if}
</div>

{#if filteredPosts.length === 0}
	<div class="no-results">
		<p>No posts found matching your criteria.</p>
		<Button variant="default" onclick={clearFilters}>Clear filters</Button>
	</div>
{:else}
	<div class="posts-grid">
		{#each filteredPosts as post (post.slug)}
			<Card hoverable>
				<a href="/blog/{post.slug}" class="post-link">
					<h2 class="text-xl font-semibold mb-4 text-green-800 dark:text-green-500 transition-colors">{post.title}</h2>
					<div class="post-meta">
						<time datetime={post.date} class="text-sm text-gray-600 dark:text-gray-400 transition-colors">
							{new Date(post.date).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</time>
						{#if post.tags.length > 0}
							<div class="tags">
								{#each post.tags as tag (tag)}
									<Badge
										variant="tag"
										class="{selectedTag === tag ? 'bg-green-800 dark:bg-green-600 text-white' : ''} cursor-pointer"
										onclick={(e) => { e.preventDefault(); e.stopPropagation(); selectTag(tag); }}
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
	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: 1.5rem;
	}
	.search-icon {
		position: absolute;
		left: 1rem;
		color: var(--light-text-light);
		pointer-events: none;
		transition: color 0.3s ease;
	}
	.search-input {
		width: 100%;
		padding: 1rem 3rem;
		font-size: 1rem;
		border: 2px solid var(--light-border-primary);
		border-radius: 12px;
		background: white;
		color: var(--light-border-secondary);
		transition: border-color 0.2s ease, background-color 0.3s ease, color 0.3s ease;
	}
	:global(.dark) .search-input {
		background: var(--light-bg-tertiary);
		border-color: var(--light-border-light);
		color: var(--color-text-dark);
	}
	.search-input:focus {
		outline: none;
		border-color: #2c5f2d;
	}
	:global(.dark) .search-input:focus {
		border-color: var(--accent-success);
	}
	.search-input::placeholder {
		color: var(--light-text-muted);
	}
	:global(.dark) .search-input::placeholder {
		color: #777;
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
</style>
