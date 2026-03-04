<script lang="ts">
	import { ArrowLeft, UserPlus } from "lucide-svelte";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { api } from "$lib/utils/api";
	import type { LanternFriend, LanternSearchResult } from "./types";

	let searchInput: HTMLInputElement | undefined = $state();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;
	let adding = $state<string | null>(null);

	$effect(() => {
		// Focus the search input when this view mounts
		requestAnimationFrame(() => {
			searchInput?.focus();
		});
	});

	function handleInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		lanternStore.setSearchQuery(value);

		clearTimeout(debounceTimer);
		if (value.trim().length < 2) {
			lanternStore.setSearchResults([]);
			return;
		}

		debounceTimer = setTimeout(() => {
			searchGroves(value.trim());
		}, 300);
	}

	async function searchGroves(query: string) {
		try {
			const result = await api.get<{ results: LanternSearchResult[] }>(
				`/api/lantern/search?q=${encodeURIComponent(query)}`,
			);
			lanternStore.setSearchResults(result?.results ?? []);
		} catch {
			// Silently fail — user can retry by typing more
		}
	}

	async function addFriend(subdomain: string) {
		if (adding) return;
		adding = subdomain;

		try {
			const result = await api.post<{ success: boolean; friend: LanternFriend }>(
				"/api/lantern/friends",
				{ friendSubdomain: subdomain },
			);
			if (result?.friend) {
				lanternStore.addFriend(result.friend);
			}
			lanternStore.setView("main");
		} catch {
			// Silently fail
		} finally {
			adding = null;
		}
	}

	function goBack() {
		lanternStore.setView("main");
	}
</script>

<div class="add-friends-view">
	<div class="add-friends-header">
		<button
			type="button"
			class="back-btn"
			onclick={goBack}
			aria-label="Back to main view"
		>
			<ArrowLeft size={18} />
		</button>
		<h3 class="add-friends-title">Add Friends</h3>
	</div>

	<div class="search-field">
		<input
			bind:this={searchInput}
			type="text"
			class="search-input"
			placeholder="Search groves..."
			value={lanternStore.searchQuery}
			oninput={handleInput}
			aria-label="Search for groves to add as friends"
		/>
	</div>

	<div class="search-results" role="list">
		{#each lanternStore.searchResults as result (result.tenantId)}
			<div class="search-result" role="listitem">
				<div class="result-info">
					<span class="result-name">{result.name}</span>
					<span class="result-subdomain">{result.subdomain}.grove.place</span>
				</div>
				<button
					type="button"
					class="add-btn"
					disabled={adding === result.subdomain}
					onclick={() => addFriend(result.subdomain)}
					aria-label="Add {result.name} as friend"
				>
					<UserPlus size={14} />
					<span>Add</span>
				</button>
			</div>
		{/each}

		{#if lanternStore.searchQuery.length >= 2 && lanternStore.searchResults.length === 0}
			<p class="no-results">No groves found</p>
		{/if}
	</div>

	<div class="browse-link">
		<a
			href="https://grove.place/forests"
			target="_blank"
			rel="noopener noreferrer"
		>
			Or browse Forests
		</a>
	</div>
</div>

<style>
	.add-friends-view {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		height: 100%;
	}

	.add-friends-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	.back-btn:hover {
		color: var(--color-text);
		background: rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .back-btn:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.add-friends-title {
		font-size: 0.9375rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.search-field {
		position: relative;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--color-border);
		background: var(--color-background, white);
		color: var(--color-text);
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s ease;
	}

	.search-input:focus {
		border-color: var(--color-primary, #2c5f2d);
	}

	:global(.dark) .search-input {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}

	:global(.dark) .search-input:focus {
		border-color: var(--accent-success);
	}

	.search-results {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.search-result {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 8px;
		transition: background-color 0.15s ease;
	}

	.search-result:hover {
		background: rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .search-result:hover {
		background: rgba(255, 255, 255, 0.06);
	}

	.result-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.result-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.result-subdomain {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border-radius: 6px;
		border: none;
		background: var(--color-primary, #2c5f2d);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			opacity 0.15s ease;
	}

	.add-btn:hover {
		background: var(--color-primary-hover, #245024);
	}

	:global(.dark) .add-btn {
		background: var(--accent-success, #22c55e);
		color: var(--bark-950, #0a1f0d);
	}

	:global(.dark) .add-btn:hover {
		background: var(--grove-400, #4ade80);
	}

	.add-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.no-results {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.875rem;
		padding: 1.5rem 0;
		margin: 0;
	}

	.browse-link {
		text-align: center;
		padding-top: 0.5rem;
		border-top: 1px solid var(--color-border);
	}

	.browse-link a {
		font-size: 0.8125rem;
		color: var(--color-primary, #2c5f2d);
		text-decoration: none;
	}

	.browse-link a:hover {
		text-decoration: underline;
	}

	:global(.dark) .browse-link a {
		color: var(--accent-success);
	}
</style>
