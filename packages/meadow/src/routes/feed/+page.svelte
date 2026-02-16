<!--
  Meadow Feed — Where the forest opens up.

  Renders the community feed with filter tabs, PostCards, and load-more pagination.
  Anonymous users can browse; interactions prompt login.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
  import PostCard from '$lib/components/PostCard.svelte';
  import ComposeBox from '$lib/components/ComposeBox.svelte';
  import FeedFilters from '$lib/components/FeedFilters.svelte';
  import ReactionPicker from '$lib/components/ReactionPicker.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import type { MeadowPost } from '$lib/types/post';
  import type { FeedFilter } from '$lib/server/types';

  let { data } = $props();

  const user = $derived(data.user);
  const loggedIn = $derived(!!user);

  // Feed state — use $derived for initial sync, $state for mutations
  let posts = $state<MeadowPost[]>([]);
  let pagination = $state(data.feed.pagination);
  let currentFilter = $state<FeedFilter>(data.filter);
  let loading = $state(false);
  let loadingMore = $state(false);

  // Reaction picker state
  let activeReactionPostId = $state<string | null>(null);

  // Sync when server data changes (e.g. navigating back with new filter)
  $effect(() => {
    posts = data.feed.posts;
    pagination = data.feed.pagination;
    currentFilter = data.filter;
  });

  // ── Filter change ──────────────────────────────────────────────────────
  function handleFilterChange(filter: FeedFilter) {
    currentFilter = filter;
    const url = new URL(page.url);
    url.searchParams.set('filter', filter);
    url.searchParams.delete('offset');
    goto(url.toString(), { replaceState: true, invalidateAll: true });
  }

  // ── Load more ──────────────────────────────────────────────────────────
  async function loadMore() {
    if (loadingMore || !pagination.hasMore) return;
    loadingMore = true;

    try {
      const nextOffset = pagination.offset + pagination.limit;
      const params = new URLSearchParams({
        filter: currentFilter,
        limit: String(pagination.limit),
        offset: String(nextOffset),
      });

      const res = await fetch(`/api/feed?${params}`, { credentials: 'include' }); // csrf-ok
      if (res.ok) {
        const result = (await res.json()) as { posts: MeadowPost[]; pagination: typeof pagination };
        posts = [...posts, ...result.posts];
        pagination = result.pagination;
      }
    } finally {
      loadingMore = false;
    }
  }

  // ── Interactions (require auth) ────────────────────────────────────────
  function requireAuth(): boolean {
    if (loggedIn) return true;
    window.location.href = buildLoginUrl(`${page.url.origin}/feed`);
    return false;
  }

  async function handleVote(postId: string) {
    if (!requireAuth()) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    // Optimistic update
    const wasVoted = post.userVoted;
    post.userVoted = !wasVoted;
    post.score += wasVoted ? -1 : 1;
    posts = posts; // trigger reactivity

    try {
      const method = wasVoted ? 'DELETE' : 'POST';
      const res = await fetch(`/api/feed/${postId}/vote`, { method, credentials: 'include' }); // csrf-ok
      if (!res.ok) {
        // Revert on failure
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
    if (!requireAuth()) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const wasBookmarked = post.userBookmarked;
    post.userBookmarked = !wasBookmarked;
    posts = posts;

    try {
      const res = await fetch(`/api/feed/${postId}/bookmark`, { method: 'POST', credentials: 'include' }); // csrf-ok
      if (!res.ok) {
        post.userBookmarked = wasBookmarked;
        posts = posts;
      }
    } catch {
      post.userBookmarked = wasBookmarked;
      posts = posts;
    }
  }

  function handleNoteCreated(newPost: MeadowPost) {
    posts = [newPost, ...posts];
    pagination = { ...pagination, total: pagination.total + 1 };
  }

  async function handleReact(postId: string, emoji: string) {
    if (!requireAuth()) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const hadReaction = post.userReactions.includes(emoji);

    // Optimistic update
    if (hadReaction) {
      post.userReactions = post.userReactions.filter((e) => e !== emoji);
    } else {
      post.userReactions = [...post.userReactions, emoji];
    }
    posts = posts;
    activeReactionPostId = null;

    try {
      const method = hadReaction ? 'DELETE' : 'POST';
      const res = await fetch(`/api/feed/${postId}/reaction`, { // csrf-ok
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        // Revert
        if (hadReaction) {
          post.userReactions = [...post.userReactions, emoji];
        } else {
          post.userReactions = post.userReactions.filter((e) => e !== emoji);
        }
        posts = posts;
      }
    } catch {
      if (hadReaction) {
        post.userReactions = [...post.userReactions, emoji];
      } else {
        post.userReactions = post.userReactions.filter((e) => e !== emoji);
      }
      posts = posts;
    }
  }
</script>

<SEO
  title="Feed — Meadow"
  description="A chronological feed connecting Grove blogs. No algorithms, no public metrics. Just people, sharing."
  url="/feed"
/>

<main class="mx-auto max-w-2xl px-4 py-8">
  <!-- Compose box (authenticated users only) -->
  {#if loggedIn}
    <div class="mb-6">
      <ComposeBox
        userName={user?.name ?? null}
        oncreated={handleNoteCreated}
      />
    </div>
  {/if}

  <!-- Filter tabs -->
  <div class="mb-6">
    <FeedFilters
      current={currentFilter}
      {loggedIn}
      onchange={handleFilterChange}
    />
  </div>

  <!-- Feed posts -->
  {#if posts.length === 0 && !loading}
    <div class="py-16 text-center">
      <p class="text-lg font-serif text-foreground-muted">
        {#if currentFilter === 'following'}
          You're not following any blogs yet.
        {:else if currentFilter === 'bookmarks'}
          No saved posts yet.
        {:else if currentFilter === 'notes'}
          No notes yet.
        {:else if currentFilter === 'blooms'}
          No blog posts yet.
        {:else}
          The meadow is quiet for now.
        {/if}
      </p>
      <p class="mt-2 text-sm text-foreground-subtle">
        {#if currentFilter === 'following'}
          Follow some blogs from their pages to see their posts here.
        {:else if currentFilter === 'notes'}
          Leave a note above to be the first.
        {:else}
          Posts from Grove blogs will appear here once they opt in.
        {/if}
      </p>
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      {#each posts as post (post.id)}
        <div class="relative">
          <PostCard
            {post}
            onvote={handleVote}
            onbookmark={handleBookmark}
            onreact={(id) => {
              activeReactionPostId = activeReactionPostId === id ? null : id;
            }}
          />
          {#if activeReactionPostId === post.id}
            <ReactionPicker
              postId={post.id}
              userReactions={post.userReactions}
              onreact={handleReact}
              onclose={() => (activeReactionPostId = null)}
            />
          {/if}
        </div>
      {/each}
    </div>

    <!-- Load more -->
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
