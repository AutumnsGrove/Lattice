/**
 * Lantern store — ephemeral state for the cross-grove navigation panel.
 *
 * Follows the sidebar.svelte.ts pattern: module-level $state variables,
 * exported as a plain object with getters and methods.
 *
 * All state is ephemeral (no localStorage) — the panel starts closed.
 * Friends state has been moved to friendsStore (friends.svelte.ts).
 */

import type {
	LanternTab,
	LanternView,
	LanternSearchResult,
} from "$lib/ui/components/chrome/lantern/types";

let open = $state(false);
let activeTab = $state<LanternTab>("destinations");
let currentView = $state<LanternView>("main");
let searchQuery = $state("");
let searchResults = $state<LanternSearchResult[]>([]);

export const lanternStore = {
	get open() {
		return open;
	},

	get activeTab() {
		return activeTab;
	},

	get currentView() {
		return currentView;
	},

	get searchQuery() {
		return searchQuery;
	},

	get searchResults() {
		return searchResults;
	},

	toggle() {
		open = !open;
		if (!open) {
			currentView = "main";
			searchQuery = "";
			searchResults = [];
		}
	},

	close() {
		open = false;
		currentView = "main";
		searchQuery = "";
		searchResults = [];
	},

	setTab(tab: LanternTab) {
		activeTab = tab;
	},

	setView(view: LanternView) {
		currentView = view;
		if (view === "main") {
			searchQuery = "";
			searchResults = [];
		}
	},

	setSearchQuery(query: string) {
		searchQuery = query;
	},

	setSearchResults(results: LanternSearchResult[]) {
		searchResults = results;
	},

	clearSearch() {
		searchQuery = "";
		searchResults = [];
	},
};
