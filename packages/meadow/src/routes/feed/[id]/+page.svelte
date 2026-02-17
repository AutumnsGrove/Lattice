<!--
  Post Detail — Full post view with rendered HTML content.

  Shows the full content:encoded from the RSS feed, all reactions,
  author info, and action buttons.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { buildLoginUrl } from '@autumnsgrove/groveengine/grafts/login';
  import { formatRelativeTime } from '$lib/utils/time';
  import ReactionPicker from '$lib/components/ReactionPicker.svelte';
  import SEO from '$lib/components/SEO.svelte';

  let { data } = $props();

  const post = $derived(data.post);
  const user = $derived(data.user);
  const loggedIn = $derived(!!user);
  const relativeTime = $derived(formatRelativeTime(post.publishedAt));
  const authorUrl = $derived(post.authorSubdomain ? `https://${post.authorSubdomain}.grove.place` : null);

  const isNote = $derived(post.postType === 'note');
  const isOwnNote = $derived(isNote && !!user && post.userId === user.id);

  let showReactionPicker = $state(false);
  let deleting = $state(false);

  async function handleDelete() {
    if (!isOwnNote || deleting) return;
    deleting = true;
    try {
      const res = await fetch(`/api/notes/${post.id}`, { method: 'DELETE', credentials: 'include' }); // csrf-ok
      if (res.ok) {
        goto('/feed');
        return;
      }
    } catch {
      // silently fail
    }
    deleting = false;
  }

  function requireAuth(): boolean {
    if (loggedIn) return true;
    const callbackUrl = `${page.url.origin}/auth/callback?returnTo=${encodeURIComponent(`/feed/${post.id}`)}`;
    window.location.href = buildLoginUrl(callbackUrl);
    return false;
  }

  async function handleVote() {
    if (!requireAuth()) return;
    const method = post.userVoted ? 'DELETE' : 'POST';
    post.userVoted = !post.userVoted;
    post.score += post.userVoted ? 1 : -1;

    try {
      const res = await fetch(`/api/feed/${post.id}/vote`, { method, credentials: 'include' }); // csrf-ok
      if (!res.ok) {
        post.userVoted = !post.userVoted;
        post.score += post.userVoted ? 1 : -1;
      }
    } catch {
      post.userVoted = !post.userVoted;
      post.score += post.userVoted ? 1 : -1;
    }
  }

  async function handleBookmark() {
    if (!requireAuth()) return;
    post.userBookmarked = !post.userBookmarked;

    try {
      const res = await fetch(`/api/feed/${post.id}/bookmark`, { method: 'POST', credentials: 'include' }); // csrf-ok
      if (!res.ok) post.userBookmarked = !post.userBookmarked;
    } catch {
      post.userBookmarked = !post.userBookmarked;
    }
  }

  async function handleReact(postId: string, emoji: string) {
    if (!requireAuth()) return;
    const had = post.userReactions.includes(emoji);

    if (had) {
      post.userReactions = post.userReactions.filter((e: string) => e !== emoji);
    } else {
      post.userReactions = [...post.userReactions, emoji];
    }
    showReactionPicker = false;

    try {
      const method = had ? 'DELETE' : 'POST';
      const res = await fetch(`/api/feed/${postId}/reaction`, { // csrf-ok
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        if (had) post.userReactions = [...post.userReactions, emoji];
        else post.userReactions = post.userReactions.filter((e: string) => e !== emoji);
      }
    } catch {
      if (had) post.userReactions = [...post.userReactions, emoji];
      else post.userReactions = post.userReactions.filter((e: string) => e !== emoji);
    }
  }
</script>

<SEO
  title="{isNote ? 'Note' : post.title} — Meadow"
  description={isNote ? (post.body?.slice(0, 160) ?? '') : post.description}
  url="/feed/{post.id}"
/>

<main class="mx-auto max-w-2xl px-4 py-8">
  <!-- Back link -->
  <div class="mb-6">
    <a
      href="/feed"
      class="text-sm text-foreground-muted hover:text-foreground transition-colors"
    >
      &larr; Back to feed
    </a>
  </div>

  <!-- Article -->
  <article class="glass-grove rounded-xl border border-divider overflow-hidden">
    <!-- Author header -->
    <div class="flex items-center gap-3 px-6 pt-5 pb-3">
      {#if authorUrl}
        <a
          href={authorUrl}
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
          aria-label="Visit {post.authorName || post.authorSubdomain}'s site"
        >
          {(post.authorName || post.authorSubdomain || '?').charAt(0).toUpperCase()}
        </a>
      {:else}
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
        >
          {(post.authorName || '?').charAt(0).toUpperCase()}
        </div>
      {/if}
      <div>
        {#if authorUrl}
          <a href={authorUrl} class="text-sm font-medium text-foreground hover:underline">
            {post.authorName || post.authorSubdomain}
          </a>
        {:else}
          <span class="text-sm font-medium text-foreground">
            {post.authorName || 'A wanderer'}
          </span>
        {/if}
        <div class="flex items-center gap-1.5 text-xs text-foreground-muted">
          {#if post.authorSubdomain}
            <span>{post.authorSubdomain}.grove.place</span>
            <span aria-hidden="true">&middot;</span>
          {/if}
          <time datetime={new Date(post.publishedAt * 1000).toISOString()}>
            {relativeTime}
          </time>
        </div>
      </div>
    </div>

    {#if isNote}
      <!-- Note content: rich HTML or plain text -->
      <div class="px-6 pb-6">
        {#if post.contentHtml}
          <div class="prose prose-grove dark:prose-invert max-w-none">
            {@html post.contentHtml}
          </div>
        {:else}
          <p class="text-lg leading-relaxed text-foreground whitespace-pre-wrap">{post.body}</p>
        {/if}
      </div>
    {:else}
      <!-- Bloom: Title + Content HTML -->
      <div class="px-6 pb-3">
        <h1 class="text-2xl font-serif font-semibold text-foreground leading-snug">
          {post.title}
        </h1>
      </div>

      {#if post.contentHtml}
        <div class="px-6 pb-6 prose prose-grove dark:prose-invert max-w-none">
          {@html post.contentHtml}
        </div>
      {:else if post.description}
        <div class="px-6 pb-6">
          <p class="text-foreground-muted leading-relaxed">{post.description}</p>
        </div>
      {/if}
    {/if}

    <!-- Tags -->
    {#if post.tags.length > 0}
      <div class="flex flex-wrap gap-1.5 px-6 pb-4">
        {#each post.tags as tag}
          <span class="inline-block rounded-full bg-grove-50 px-2.5 py-0.5 text-xs font-medium text-grove-700 dark:bg-cream-100/30 dark:text-cream-800">
            {tag}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Reaction display -->
    {#if Object.keys(post.reactionCounts).length > 0}
      <div class="flex flex-wrap gap-2 px-6 pb-4">
        {#each Object.entries(post.reactionCounts) as [emoji, count]}
          <span class="inline-flex items-center gap-1 rounded-full bg-grove-50/60 px-2 py-0.5 text-sm dark:bg-cream-100/20">
            <span>{emoji}</span>
            <span class="text-xs text-foreground-muted">{count}</span>
          </span>
        {/each}
      </div>
    {/if}

    <!-- Action bar -->
    <div class="flex items-center gap-2 border-t border-black/5 px-4 py-2 dark:border-white/5">
      <button
        type="button"
        class="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors {post.userVoted
          ? 'text-grove-600 dark:text-grove-400 font-medium'
          : 'text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400'}"
        aria-label="{post.userVoted ? 'Remove upvote' : 'Upvote'}"
        aria-pressed={post.userVoted}
        onclick={handleVote}
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill={post.userVoted ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M10 3l-7 8h4v6h6v-6h4l-7-8z" />
        </svg>
        {#if post.score > 0}
          <span>{post.score}</span>
        {/if}
      </button>

      <!-- React button -->
      <div class="relative">
        <button
          type="button"
          class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm text-foreground-muted transition-colors hover:text-grove-600 dark:hover:text-grove-400"
          aria-label="React to this post"
          onclick={() => (showReactionPicker = !showReactionPicker)}
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <circle cx="10" cy="10" r="8" />
            <circle cx="7.5" cy="8.5" r="1" fill="currentColor" />
            <circle cx="12.5" cy="8.5" r="1" fill="currentColor" />
            <path d="M7 12.5c.8 1.2 2 1.5 3 1.5s2.2-.3 3-1.5" />
          </svg>
        </button>
        {#if showReactionPicker}
          <ReactionPicker
            postId={post.id}
            userReactions={post.userReactions}
            onreact={handleReact}
            onclose={() => (showReactionPicker = false)}
          />
        {/if}
      </div>

      <div class="flex-1"></div>

      <button
        type="button"
        class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm transition-colors {post.userBookmarked
          ? 'text-grove-600 dark:text-grove-400'
          : 'text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400'}"
        aria-label="{post.userBookmarked ? 'Remove bookmark' : 'Bookmark'}"
        aria-pressed={post.userBookmarked}
        onclick={handleBookmark}
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill={post.userBookmarked ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M5 3h10a1 1 0 011 1v13.5l-5.5-3.5L5 17.5V4a1 1 0 011-1z" />
        </svg>
      </button>
    </div>
  </article>

  {#if isNote}
    <!-- Delete own note -->
    {#if isOwnNote}
      <div class="mt-6 text-center">
        <button
          type="button"
          class="text-sm text-red-500/70 transition-colors hover:text-red-600 disabled:opacity-50"
          disabled={deleting}
          onclick={handleDelete}
        >
          {deleting ? 'Deleting...' : 'Delete this note'}
        </button>
      </div>
    {/if}
  {:else}
    <!-- Original post link -->
    <div class="mt-6 text-center">
      <a
        href={post.link}
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm text-grove-600 hover:underline dark:text-grove-400"
      >
        Read on {post.authorSubdomain}.grove.place &rarr;
      </a>
    </div>
  {/if}
</main>
