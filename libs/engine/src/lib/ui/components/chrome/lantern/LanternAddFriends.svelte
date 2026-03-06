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

		// Clean up debounce timer on unmount
		return () => {
			clearTimeout(debounceTimer);
		};
	});

	function handleInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		lanternStore.setSearchQuery(value);

		clearTimeout(debounceTimer);
		if (value.trim().length < 1) {
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

<div class="flex flex-col gap-3 p-4 h-full">
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="flex items-center justify-center min-w-[44px] min-h-[44px] -m-1.5 rounded-md border-none bg-transparent text-foreground-muted cursor-pointer transition-colors hover:text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
			onclick={goBack}
			aria-label="Back to main view"
		>
			<ArrowLeft size={18} />
		</button>
		<h3 class="text-[0.9375rem] font-semibold text-foreground m-0">Add Friends</h3>
	</div>

	<div class="relative">
		<input
			bind:this={searchInput}
			type="text"
			class="w-full py-2 px-3 rounded-lg border border-default bg-surface text-foreground text-sm outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/50"
			placeholder="Search groves..."
			value={lanternStore.searchQuery}
			oninput={handleInput}
			aria-label="Search for groves to add as friends"
		/>
	</div>

	<div class="flex-1 overflow-y-auto flex flex-col gap-1" role="list" aria-live="polite">
		{#each lanternStore.searchResults as result (result.tenantId)}
			<div
				class="flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors hover:bg-surface-hover"
				role="listitem"
			>
				<div class="flex-1 min-w-0 flex flex-col gap-0.5">
					<span class="text-sm font-medium text-foreground truncate">{result.name}</span>
					<span class="text-xs text-foreground-muted">{result.subdomain}.grove.place</span>
				</div>
				<button
					type="button"
					class="flex items-center gap-1 py-1.5 px-2.5 rounded-md border-none bg-accent text-accent-foreground text-xs font-medium cursor-pointer transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={adding === result.subdomain}
					onclick={() => addFriend(result.subdomain)}
					aria-label="Add {result.name} as friend"
				>
					<UserPlus size={14} />
					<span>Add</span>
				</button>
			</div>
		{/each}

		{#if lanternStore.searchQuery.length >= 1 && lanternStore.searchResults.length === 0}
			<p class="text-center text-foreground-muted text-sm py-6 m-0">No groves found</p>
		{/if}
	</div>

	<div class="flex items-center justify-center gap-2 pt-2 border-t border-default">
		<a
			href="https://grove.place/canopy"
			class="text-[0.8125rem] text-accent-muted no-underline hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
			target="_blank"
			rel="noopener noreferrer"
		>
			Canopy
		</a>
		<span class="text-foreground-muted text-[0.75rem]" aria-hidden="true">&middot;</span>
		<a
			href="https://meadow.grove.place"
			class="text-[0.8125rem] text-accent-muted no-underline hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
			target="_blank"
			rel="noopener noreferrer"
		>
			Meadow
		</a>
		<span class="text-foreground-muted text-[0.75rem]" aria-hidden="true">&middot;</span>
		<a
			href="https://grove.place/forest"
			class="text-[0.8125rem] text-accent-muted no-underline hover:underline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
			target="_blank"
			rel="noopener noreferrer"
		>
			Forests
		</a>
	</div>
</div>
