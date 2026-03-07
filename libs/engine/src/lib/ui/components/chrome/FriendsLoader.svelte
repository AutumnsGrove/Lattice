<!--
	FriendsLoader — headless component that eagerly fetches friends for logged-in users.

	Mounts in +layout.svelte for ALL logged-in users, regardless of Lantern enabled state.
	This ensures FollowButton and any future social features can check follow state.

	Renders nothing — purely a data-loading side effect.
-->
<script lang="ts">
	import { friendsStore } from "$lib/ui/stores/friends.svelte";
	import { api } from "$lib/utils/api";
	import type { Friend } from "$lib/server/services/friends";

	$effect(() => {
		if (friendsStore.loaded || friendsStore.loading) return;

		friendsStore.setLoading(true);

		api
			.get<{ friends: Friend[] }>("/api/friends")
			.then((result) => {
				friendsStore.setFriends(result?.friends ?? []);
			})
			.catch(() => {
				friendsStore.setFriends([]);
			});
	});
</script>
