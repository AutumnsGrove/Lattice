/**
 * Lantern store — ephemeral state for the cross-grove navigation panel.
 *
 * Follows the sidebar.svelte.ts pattern: module-level $state variables,
 * exported as a plain object with getters and methods.
 *
 * All state is ephemeral (no localStorage) — the panel starts closed
 * and friends are fetched fresh on each page load.
 */

import type {
	LanternFriend,
	LanternTab,
	LanternView,
	LanternSearchResult,
} from "$lib/ui/components/chrome/lantern/types";

let open = $state(false);
let activeTab = $state<LanternTab>("destinations");
let currentView = $state<LanternView>("main");
let friends = $state<LanternFriend[]>([]);
let friendsLoaded = $state(false);
let friendsLoading = $state(false);
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

	get friends() {
		return friends;
	},

	get friendsLoaded() {
		return friendsLoaded;
	},

	get friendsLoading() {
		return friendsLoading;
	},

	get searchQuery() {
		return searchQuery;
	},

	get searchResults() {
		return searchResults;
	},

	get hasFriends() {
		return friends.length > 0;
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

	setFriends(newFriends: LanternFriend[]) {
		friends = newFriends;
		friendsLoaded = true;
		friendsLoading = false;
	},

	setFriendsLoading(loading: boolean) {
		friendsLoading = loading;
	},

	addFriend(friend: LanternFriend) {
		friends = [...friends, friend];
	},

	removeFriend(tenantId: string) {
		friends = friends.filter((f) => f.tenantId !== tenantId);
	},

	setSearchQuery(query: string) {
		searchQuery = query;
	},

	setSearchResults(results: LanternSearchResult[]) {
		searchResults = results;
	},

	isFriend(tenantId: string): boolean {
		return friends.some((f) => f.tenantId === tenantId);
	},

	clearSearch() {
		searchQuery = "";
		searchResults = [];
	},
};
