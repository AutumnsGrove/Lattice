<!--
	ContentSearch Component

	A reusable, accessible search component with debouncing, URL synchronization, and custom filtering.
	Part of the Grove UI design system - "a place to Be"

	@example Basic usage
	```svelte
	<ContentSearch
		items={posts}
		filterFn={(post, query) => post.title.toLowerCase().includes(query.toLowerCase())}
		bind:searchQuery
		placeholder="Search posts..."
	/>
	```

	@example With URL sync and custom filters
	```svelte
	<ContentSearch
		items={docs}
		filterFn={filterDoc}
		bind:searchQuery
		syncWithUrl={true}
		onSearchChange={(query, results) => filteredResults = results}
	>
		{#snippet children()}
			<div class="custom-filters">
				Add tag filters, date filters, etc. here
			</div>
		{/snippet}
	</ContentSearch>
	```

	@example With pre-computed lowercase fields (performance optimization)
	```svelte
	<script>
		// Pre-compute lowercase fields for better performance
		let postsWithLowercase = $derived.by(() => {
			return posts.map(post => ({
				...post,
				titleLower: post.title.toLowerCase(),
				tagsLower: post.tags.map(t => t.toLowerCase())
			}));
		});

		function filterPost(post, query) {
			const q = query.toLowerCase();
			return post.titleLower.includes(q) || post.tagsLower.some(tag => tag.includes(q));
		}
	</script>

	<ContentSearch items={postsWithLowercase} filterFn={filterPost} />
	```
-->
<script lang="ts" generics="T extends Record<string, unknown>">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Array of items to search through */
		items: T[];
		/** Filter function that determines if an item matches the search query */
		filterFn: (item: T, query: string) => boolean;
		/** Current search query (bindable) */
		searchQuery?: string;
		/** Placeholder text for search input */
		placeholder?: string;
		/**
		 * Type of results for screen reader announcements (singular form)
		 * @example "post" → "Found 1 post" / "Found 5 posts"
		 * @example "document" → "Found 1 document" / "Found 5 documents"
		 * @example "match" → Use with resultsTypePlural for "Found 1 match" / "Found 5 matches"
		 */
		resultsType?: string;
		/**
		 * Plural form of resultsType (defaults to resultsType + 's')
		 *
		 * **Use this for irregular plurals:**
		 * @example resultsType="match" resultsTypePlural="matches"
		 * @example resultsType="person" resultsTypePlural="people"
		 * @example resultsType="child" resultsTypePlural="children"
		 * @example resultsType="datum" resultsTypePlural="data"
		 *
		 * Screen reader will announce: "Found 1 match" / "Found 5 matches"
		 */
		resultsTypePlural?: string;
		/** Whether to sync search query with URL params */
		syncWithUrl?: boolean;
		/** URL parameter name for search query */
		queryParam?: string;
		/** Debounce delay in milliseconds */
		debounceDelay?: number;
		/** Whether to show search icon */
		showIcon?: boolean;
		/** Whether to show clear button when there's a query */
		showClearButton?: boolean;
		/** CSS class for the search input wrapper */
		wrapperClass?: string;
		/** CSS class for the search input */
		inputClass?: string;
		/** Callback when search query changes */
		onSearchChange?: (query: string, results: T[]) => void;
		/** Optional snippet for filters */
		children?: Snippet;
	}

	let {
		items = [],
		filterFn,
		searchQuery = $bindable(''),
		placeholder = 'Search...',
		resultsType = 'result',
		resultsTypePlural,
		syncWithUrl = false,
		queryParam = 'q',
		debounceDelay = 250,
		showIcon = true,
		showClearButton = true,
		wrapperClass = '',
		inputClass = '',
		onSearchChange,
		children
	}: Props = $props();

	// Generate unique ID for accessibility
	const searchId = `content-search-${Math.random().toString(36).substring(2, 9)}`;
	const clearButtonId = `${searchId}-clear`;
	const resultsId = `${searchId}-results`;

	// Initialize from URL if syncing
	$effect(() => {
		if (syncWithUrl && typeof window !== 'undefined') {
			const urlQuery = page.url.searchParams.get(queryParam);
			if (urlQuery && urlQuery !== searchQuery) {
				searchQuery = urlQuery;
				debouncedQuery = urlQuery;
			}
		}
	});

	// Debounced search query for performance
	let debouncedQuery = $state(searchQuery);
	let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);

	// Cleanup timer on component destruction to prevent memory leaks
	// This is separate from the handleInput cleanup because:
	// - handleInput clears the timer when user types (normal debounce behavior)
	// - This cleanup runs when component is destroyed (prevents timer firing after unmount)
	$effect(() => {
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		searchQuery = target.value;

		// Clear existing timer to restart debounce window
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		// Set new timer for debounced update
		debounceTimer = setTimeout(() => {
			debouncedQuery = searchQuery;
			if (syncWithUrl) {
				updateUrl();
			}
		}, debounceDelay);
	}

	// Filter items based on debounced search query
	let filteredItems = $derived.by(() => {
		if (!debouncedQuery.trim()) {
			return items;
		}
		return items.filter(item => filterFn(item, debouncedQuery.trim()));
	});

	// Call onSearchChange when results change
	$effect(() => {
		if (onSearchChange) {
			onSearchChange(debouncedQuery, filteredItems);
		}
	});

	// Update URL when search query changes (optimized to avoid unnecessary navigation)
	function updateUrl() {
		if (!syncWithUrl) return;

		const currentQuery = page.url.searchParams.get(queryParam) || '';
		const newQuery = searchQuery.trim();

		// Skip navigation if query hasn't actually changed
		if (currentQuery === newQuery) return;

		const params = new URLSearchParams(page.url.searchParams);
		if (newQuery) {
			params.set(queryParam, newQuery);
		} else {
			params.delete(queryParam);
		}

		const newUrl = params.toString() ? `?${params.toString()}` : page.url.pathname;
		goto(newUrl, { replaceState: true, keepFocus: true });
	}

	function clearSearch() {
		searchQuery = '';
		debouncedQuery = '';
		if (debounceTimer) {
			clearTimeout(debounceTimer);
			debounceTimer = null;
		}
		if (syncWithUrl) {
			updateUrl();
		}
	}
</script>

<div class="content-search-wrapper {wrapperClass}" role="search">
	<div class="content-search-input-container">
		{#if showIcon}
			<svg
				class="content-search-icon"
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.3-4.3"></path>
			</svg>
		{/if}
		<input
			type="search"
			id={searchId}
			aria-label={placeholder}
			aria-describedby={showClearButton && searchQuery ? clearButtonId : undefined}
			{placeholder}
			value={searchQuery}
			oninput={handleInput}
			class="content-search-input {inputClass}"
		/>
		{#if showClearButton && searchQuery}
			<button
				type="button"
				id={clearButtonId}
				onclick={clearSearch}
				class="content-search-clear"
				aria-label="Clear search query"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M18 6 6 18"></path>
					<path d="m6 6 12 12"></path>
				</svg>
			</button>
		{/if}
	</div>

	{#if children}
		<div class="content-search-filters">
			{@render children()}
		</div>
	{/if}

	<!-- Screen reader announcement for search results -->
	<div id={resultsId} role="status" aria-live="polite" aria-atomic="true" aria-label="Search results" class="sr-only">
		{#if debouncedQuery}
			Found {filteredItems.length} {filteredItems.length === 1 ? resultsType : (resultsTypePlural || resultsType + 's')} matching "{debouncedQuery}"
		{/if}
	</div>
</div>

<style>
	.content-search-wrapper {
		width: 100%;
	}

	.content-search-input-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.content-search-icon {
		position: absolute;
		left: 1rem;
		color: var(--light-text-light, #999);
		pointer-events: none;
		transition: color 0.3s ease;
	}

	.content-search-input {
		width: 100%;
		padding: 0.75rem 1rem;
		padding-left: 3rem;
		font-size: 1rem;
		border: 2px solid var(--light-border-primary, #e5e7eb);
		border-radius: 0.75rem;
		background: white;
		color: var(--light-text-primary, #1f2937);
		transition: border-color 0.2s ease, background-color 0.3s ease, color 0.3s ease;
	}

	.content-search-input:focus {
		outline: none;
		border-color: var(--accent, #2c5f2d);
	}

	.content-search-input::placeholder {
		color: var(--light-text-muted, #9ca3af);
	}

	.content-search-clear {
		position: absolute;
		right: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		color: var(--light-text-light, #999);
		transition: color 0.2s ease;
		border-radius: 0.375rem;
	}

	.content-search-clear:hover {
		color: var(--light-text-primary, #1f2937);
		background-color: var(--light-bg-secondary, #f3f4f6);
	}

	.content-search-clear:focus {
		outline: 2px solid var(--accent, #2c5f2d);
		outline-offset: 2px;
	}

	.content-search-filters {
		margin-top: 1rem;
	}

	/* Visually hidden but accessible to screen readers */
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

	/* Dark mode support */
	:global(.dark) .content-search-icon {
		color: var(--dark-text-light, #6b7280);
	}

	:global(.dark) .content-search-input {
		background: var(--dark-bg-secondary, #1f2937);
		border-color: var(--dark-border-primary, #374151);
		color: var(--dark-text-primary, #f9fafb);
	}

	:global(.dark) .content-search-input:focus {
		border-color: var(--accent, #4ade80);
	}

	:global(.dark) .content-search-input::placeholder {
		color: var(--dark-text-muted, #6b7280);
	}

	:global(.dark) .content-search-clear {
		color: var(--dark-text-light, #6b7280);
	}

	:global(.dark) .content-search-clear:hover {
		color: var(--dark-text-primary, #f9fafb);
		background-color: var(--dark-bg-tertiary, #111827);
	}

	:global(.dark) .content-search-clear:focus {
		outline-color: var(--accent, #4ade80);
	}
</style>