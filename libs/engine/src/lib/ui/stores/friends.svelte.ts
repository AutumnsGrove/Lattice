/**
 * Friends store — client-side state for tenant-to-tenant follow relationships.
 *
 * Independent of Lantern — friends load eagerly for all logged-in users,
 * so FollowButton and any future social features can check follow state
 * without requiring Lantern to be enabled or opened.
 *
 * Follows the sidebar.svelte.ts pattern: module-level $state variables,
 * exported as a plain object with getters and methods.
 */

import type { Friend } from "$lib/server/services/friends";

let friends = $state<Friend[]>([]);
let loaded = $state(false);
let loading = $state(false);

export const friendsStore = {
	get friends() {
		return friends;
	},

	get loaded() {
		return loaded;
	},

	get loading() {
		return loading;
	},

	get hasFriends() {
		return friends.length > 0;
	},

	setFriends(newFriends: Friend[]) {
		friends = newFriends;
		loaded = true;
		loading = false;
	},

	setLoading(isLoading: boolean) {
		loading = isLoading;
	},

	addFriend(friend: Friend) {
		friends = [...friends, friend];
	},

	removeFriend(tenantId: string) {
		friends = friends.filter((f) => f.tenantId !== tenantId);
	},

	isFriend(tenantId: string): boolean {
		return friends.some((f) => f.tenantId === tenantId);
	},
};
