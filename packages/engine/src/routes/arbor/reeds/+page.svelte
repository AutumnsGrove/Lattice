<script lang="ts">
  import { GlassCard, Badge, toast, GroveSwap } from "$lib/ui";
  import { MessageSquare, Mail, Check, X, Ban } from "lucide-svelte";

  let { data } = $props();

  let activeTab = $state<"pending" | "replies">("pending");
  let moderating = $state<string | null>(null);

  let pendingCount = $derived(data.pending?.length ?? 0);
  let replyCount = $derived(data.replies?.length ?? 0);

  function getPostInfo(postId: string) {
    return data.postMap?.[postId] || { slug: "unknown", title: "Unknown Post" };
  }

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  async function moderate(
    commentId: string,
    postSlug: string,
    action: string,
  ) {
    moderating = commentId;

    try {
      const res = await fetch(
        `/api/reeds/${postSlug}/${commentId}/moderate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error_description || "Moderation failed");
      }

      const result = await res.json();
      toast.success(result.message || "Done!");

      // Remove from pending list
      if (data.pending) {
        data.pending = data.pending.filter(
          (c: { id: string }) => c.id !== commentId,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      moderating = null;
    }
  }
</script>

<div class="reeds-admin">
  <header class="page-header">
    <h1 class="page-title">
      <MessageSquare class="title-icon" />
      <GroveSwap term="reeds">Comments</GroveSwap>
    </h1>
    <p class="page-subtitle">
      <GroveSwap term="reeds" standard="Comments and replies on your posts">Reeds and replies on your blooms</GroveSwap>
    </p>
  </header>

  <!-- Tab navigation -->
  <div class="tab-bar" role="tablist">
    <button
      role="tab"
      id="tab-pending"
      aria-selected={activeTab === "pending"}
      aria-controls="panel-pending"
      class="tab"
      class:active={activeTab === "pending"}
      onclick={() => (activeTab = "pending")}
    >
      Pending Review
      {#if pendingCount > 0}
        <Badge variant="destructive">{pendingCount}</Badge>
      {/if}
    </button>
    <button
      role="tab"
      id="tab-replies"
      aria-selected={activeTab === "replies"}
      aria-controls="panel-replies"
      class="tab"
      class:active={activeTab === "replies"}
      onclick={() => (activeTab = "replies")}
    >
      Private Replies
      {#if replyCount > 0}
        <Badge variant="secondary">{replyCount}</Badge>
      {/if}
    </button>
  </div>

  <!-- Pending comments -->
  {#if activeTab === "pending"}
    <div id="panel-pending" role="tabpanel" aria-labelledby="tab-pending">
    <GlassCard variant="default" class="overflow-hidden">
      {#if data.pending && data.pending.length > 0}
        <div class="comment-list">
          {#each data.pending as comment (comment.id)}
            {@const post = getPostInfo(comment.post_id)}
            <div class="comment-card" class:moderating={moderating === comment.id}>
              <div class="comment-meta">
                <span class="comment-author">{comment.author_name}</span>
                <span class="meta-sep" aria-hidden="true"></span>
                <time class="comment-time">{formatTimeAgo(comment.created_at)}</time>
                <span class="meta-sep" aria-hidden="true"></span>
                <a href="/garden/{post.slug}" class="comment-post" target="_blank">
                  {post.title}
                </a>
              </div>

              <div class="comment-content">
                {#if comment.content_html}
                  {@html comment.content_html}
                {:else}
                  <p>{comment.content}</p>
                {/if}
              </div>

              <div class="comment-actions">
                <button
                  class="mod-btn mod-approve"
                  onclick={() => moderate(comment.id, post.slug, "approve")}
                  disabled={moderating === comment.id}
                  title="Approve"
                >
                  <Check class="mod-icon" />
                  Approve
                </button>
                <button
                  class="mod-btn mod-reject"
                  onclick={() => moderate(comment.id, post.slug, "reject")}
                  disabled={moderating === comment.id}
                  title="Reject"
                >
                  <X class="mod-icon" />
                  Reject
                </button>
                <button
                  class="mod-btn mod-block"
                  onclick={() => moderate(comment.id, post.slug, "block_user")}
                  disabled={moderating === comment.id}
                  title="Block this user"
                >
                  <Ban class="mod-icon" />
                  Block
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <MessageSquare class="empty-icon" />
          <p>No comments waiting for review.</p>
        </div>
      {/if}
    </GlassCard>
    </div>
  {/if}

  <!-- Private replies -->
  {#if activeTab === "replies"}
    <div id="panel-replies" role="tabpanel" aria-labelledby="tab-replies">
    <GlassCard variant="default" class="overflow-hidden">
      {#if data.replies && data.replies.length > 0}
        <div class="comment-list">
          {#each data.replies as reply (reply.id)}
            {@const post = getPostInfo(reply.post_id)}
            <div class="comment-card">
              <div class="comment-meta">
                <Mail class="reply-icon" />
                <span class="comment-author">{reply.author_name}</span>
                <span class="meta-sep" aria-hidden="true"></span>
                <time class="comment-time">{formatTimeAgo(reply.created_at)}</time>
                <span class="meta-sep" aria-hidden="true"></span>
                <a href="/garden/{post.slug}" class="comment-post" target="_blank">
                  {post.title}
                </a>
              </div>

              <div class="comment-content">
                {#if reply.content_html}
                  {@html reply.content_html}
                {:else}
                  <p>{reply.content}</p>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <Mail class="empty-icon" />
          <p>No private replies yet.</p>
        </div>
      {/if}
    </GlassCard>
    </div>
  {/if}
</div>

<style>
  .reeds-admin {
    max-width: 800px;
  }

  .page-header {
    margin-bottom: 1.5rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.25rem 0;
    color: var(--color-text, #1a1a1a);
  }

  :global(.dark) .page-title {
    color: var(--grove-text-strong, #e5e5e5);
  }

  :global(.title-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--user-accent, var(--color-primary, #2c5f2d));
  }

  .page-subtitle {
    margin: 0;
    color: var(--color-text-muted, #666);
    font-size: 0.9375rem;
  }

  .tab-bar {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.08));
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    min-height: 44px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted, #666);
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab:hover {
    color: var(--color-text, #333);
  }

  .tab:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: -2px;
  }

  :global(.dark) .tab:focus-visible {
    outline-color: var(--grove-300, #86efac);
  }

  .tab.active {
    color: var(--user-accent, var(--color-primary, #2c5f2d));
    border-bottom-color: var(--user-accent, var(--color-primary, #2c5f2d));
  }

  :global(.dark) .tab.active {
    color: var(--grove-300, #86efac);
    border-bottom-color: var(--grove-300, #86efac);
  }

  .comment-list {
    display: flex;
    flex-direction: column;
  }

  .comment-card {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
    transition: opacity 0.2s;
  }

  .comment-card:last-child {
    border-bottom: none;
  }

  .comment-card.moderating {
    opacity: 0.5;
    pointer-events: none;
  }

  .comment-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    flex-wrap: wrap;
  }

  .comment-author {
    font-weight: 600;
    color: var(--color-text, #333);
  }

  :global(.dark) .comment-author {
    color: var(--grove-text-strong, #d4d4d4);
  }

  .meta-sep {
    width: 3px;
    height: 3px;
    background: var(--color-text-muted, #999);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .comment-time {
    color: var(--color-text-muted, #888);
  }

  .comment-post {
    color: var(--user-accent, var(--color-primary, #2c5f2d));
    text-decoration: none;
    font-weight: 500;
  }

  .comment-post:hover {
    text-decoration: underline;
  }

  :global(.dark) .comment-post {
    color: var(--grove-300, #86efac);
  }

  :global(.reply-icon) {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--color-text-muted, #888);
  }

  .comment-content {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--color-text, #333);
    margin-bottom: 0.75rem;
  }

  :global(.dark) .comment-content {
    color: var(--grove-text-strong, #d4d4d4);
  }

  .comment-content :global(p) {
    margin: 0 0 0.5rem 0;
  }

  .comment-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .comment-actions {
    display: flex;
    gap: 0.5rem;
  }

  .mod-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.625rem 1.125rem;
    min-height: 44px;
    font-size: 0.8rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .mod-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .mod-btn:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  :global(.mod-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .mod-approve {
    color: #15803d;
    background: rgba(21, 128, 61, 0.08);
    border-color: rgba(21, 128, 61, 0.2);
  }

  .mod-approve:hover:not(:disabled) {
    background: rgba(21, 128, 61, 0.15);
  }

  .mod-reject {
    color: #b91c1c;
    background: rgba(185, 28, 28, 0.08);
    border-color: rgba(185, 28, 28, 0.2);
  }

  .mod-reject:hover:not(:disabled) {
    background: rgba(185, 28, 28, 0.15);
  }

  .mod-block {
    color: #92400e;
    background: rgba(146, 64, 14, 0.08);
    border-color: rgba(146, 64, 14, 0.2);
  }

  .mod-block:hover:not(:disabled) {
    background: rgba(146, 64, 14, 0.15);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    color: var(--color-text-muted, #888);
  }

  :global(.empty-icon) {
    width: 2rem;
    height: 2rem;
    opacity: 0.4;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.9375rem;
    font-style: italic;
  }

  @media (prefers-reduced-motion: reduce) {
    .tab,
    .comment-card,
    .mod-btn {
      transition: none;
    }
  }
</style>
