<!--
  Bookmarks — Saved posts page.

  Uses the same PostCard list pattern as the feed.
-->
<script lang="ts">
  import PostCard from '$lib/components/PostCard.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import type { MeadowPost } from '$lib/types/post';

  let { data } = $props();

  const user = $derived(data.user);
  let posts = $state<MeadowPost[]>([]);
  let pagination = $state(data.feed.pagination);
  let loadingMore = $state(false);

  $effect(() => {
    posts = data.feed.posts;
    pagination = data.feed.pagination;
  });

  async function loadMore() {
    if (loadingMore || !pagination.hasMore) return;
    loadingMore = true;

    try {
      const nextOffset = pagination.offset + pagination.limit;
      const res = await fetch(`/api/bookmarks?limit=${pagination.limit}&offset=${nextOffset}`, { // csrf-ok
        credentials: 'include',
      });
      if (res.ok) {
        const result = (await res.json()) as { posts: MeadowPost[]; pagination: typeof pagination };
        posts = [...posts, ...result.posts];
        pagination = result.pagination;
      }
    } finally {
      loadingMore = false;
    }
  }

  async function handleVote(postId: string) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const wasVoted = post.userVoted;
    post.userVoted = !wasVoted;
    post.score += wasVoted ? -1 : 1;
    posts = posts;

    try {
      const res = await fetch(`/api/feed/${postId}/vote`, { // csrf-ok
        method: wasVoted ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        post.userVoted = wasVoted;
        post.score += wasVoted ? 1 : -1;
        posts = posts;
      }
    } catch {
      post.userVoted = wasVoted;
      post.score += wasVoted ? 1 : -1;
      posts = posts;
    }
  }

  async function handleBookmark(postId: string) {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    post.userBookmarked = !post.userBookmarked;
    posts = posts;

    try {
      const res = await fetch(`/api/feed/${postId}/bookmark`, { // csrf-ok
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        post.userBookmarked = !post.userBookmarked;
        posts = posts;
      }
    } catch {
      post.userBookmarked = !post.userBookmarked;
      posts = posts;
    }
  }
</script>

<SEO
  title="Bookmarks — Meadow"
  description="Your saved posts from the Meadow community feed."
  url="/bookmarks"
/>

<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="mb-6 text-2xl font-serif text-foreground">Saved posts</h1>

  {#if posts.length === 0}
    <div class="py-16 text-center">
      <p class="text-lg font-serif text-foreground-muted">No saved posts yet.</p>
      <p class="mt-2 text-sm text-foreground-subtle">
        Bookmark posts from the feed to save them here.
      </p>
      <a
        href="/feed"
        class="mt-4 inline-block rounded-lg bg-grove-600 px-4 py-2 text-sm font-medium text-white hover:bg-grove-700 dark:bg-grove-500 dark:hover:bg-grove-600"
      >
        Browse the feed
      </a>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each posts as post (post.id)}
        <PostCard
          {post}
          onvote={handleVote}
          onbookmark={handleBookmark}
        />
      {/each}
    </div>

    {#if pagination.hasMore}
      <div class="mt-8 flex justify-center">
        <button
          type="button"
          class="rounded-lg bg-white/60 px-6 py-2.5 text-sm font-medium text-foreground-muted shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80 hover:text-foreground dark:bg-cream-100/30 dark:hover:bg-cream-100/45"
          disabled={loadingMore}
          onclick={loadMore}
        >
          {#if loadingMore}
            Loading...
          {:else}
            Load more
          {/if}
        </button>
      </div>
    {/if}
  {/if}
</main>
