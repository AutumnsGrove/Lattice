<script lang="ts">
  /**
   * ReedsComment — Single comment display
   *
   * Renders one comment with author info, timestamp, content,
   * and action buttons (reply, edit, delete).
   */

  import { Button } from "$lib/ui";

  interface Comment {
    id: string;
    author_name: string;
    author_id: string;
    content_html: string | null;
    content: string;
    status: string;
    is_public: number;
    created_at: string;
    edited_at: string | null;
    parent_id: string | null;
    replies: Comment[];
    depth: number;
  }

  interface Props {
    comment: Comment;
    currentUserId?: string;
    isOwner?: boolean;
    onreply?: (commentId: string) => void;
    onedit?: (commentId: string) => void;
    ondelete?: (commentId: string) => void;
  }

  let {
    comment,
    currentUserId,
    isOwner = false,
    onreply,
    onedit,
    ondelete,
  }: Props = $props();

  const EDIT_WINDOW_MS = 15 * 60 * 1000;

  let canEdit = $derived(
    comment.author_id === currentUserId &&
    new Date(comment.created_at).getTime() > Date.now() - EDIT_WINDOW_MS
  );

  let canDelete = $derived(
    comment.author_id === currentUserId || isOwner
  );

  let isDeleted = $derived(comment.content === "[deleted]");

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
      year: diffDays > 365 ? "numeric" : undefined,
    });
  }
</script>

<article
  class="reeds-comment"
  class:deleted={isDeleted}
  class:depth-0={comment.depth === 0}
  class:depth-1={comment.depth === 1}
  class:depth-2={comment.depth >= 2}
  id="comment-{comment.id}"
>
  <header class="comment-header">
    <span class="comment-author">
      {isDeleted ? "[deleted]" : comment.author_name}
    </span>
    <span class="comment-separator" aria-hidden="true"></span>
    <time
      class="comment-time"
      datetime={comment.created_at}
      title={new Date(comment.created_at).toLocaleString()}
    >
      {formatTimeAgo(comment.created_at)}
    </time>
    {#if comment.edited_at && !isDeleted}
      <span class="comment-edited" title="Edited {formatTimeAgo(comment.edited_at)}">
        (edited)
      </span>
    {/if}
  </header>

  <div class="comment-body">
    {#if isDeleted}
      <p class="deleted-text">[This comment has been removed]</p>
    {:else if comment.content_html}
      <!-- Safe: content_html is produced by renderMarkdown() → sanitizeMarkdown() (DOMPurify) -->
      {@html comment.content_html}
    {:else}
      <p>{comment.content}</p>
    {/if}
  </div>

  {#if !isDeleted}
    <footer class="comment-actions">
      {#if onreply}
        <button class="action-btn" onclick={() => onreply?.(comment.id)}>
          Reply
        </button>
      {/if}
      {#if canEdit && onedit}
        <button class="action-btn" onclick={() => onedit?.(comment.id)}>
          Edit
        </button>
      {/if}
      {#if canDelete && ondelete}
        <button class="action-btn action-btn-danger" onclick={() => ondelete?.(comment.id)}>
          Delete
        </button>
      {/if}
    </footer>
  {/if}

  <!-- Nested replies -->
  {#if comment.replies?.length > 0}
    <div class="comment-replies">
      {#each comment.replies as reply (reply.id)}
        <svelte:self
          comment={reply}
          {currentUserId}
          {isOwner}
          {onreply}
          {onedit}
          {ondelete}
        />
      {/each}
    </div>
  {/if}
</article>

<style>
  .reeds-comment {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
  }

  .reeds-comment:last-child {
    border-bottom: none;
  }

  .reeds-comment.deleted {
    opacity: 0.5;
  }

  /* Thread indentation */
  .comment-replies {
    margin-left: 1.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.08));
  }

  .depth-2 .comment-replies {
    margin-left: 0.75rem;
  }

  .comment-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
    font-size: 0.85rem;
  }

  .comment-author {
    font-weight: 600;
    color: var(--color-text, #1a1a1a);
  }

  :global(.dark) .comment-author {
    color: var(--grove-text-strong, #e5e5e5);
  }

  .comment-separator {
    width: 3px;
    height: 3px;
    background: var(--color-text-muted, #999);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .comment-time {
    color: var(--color-text-muted, #666);
    font-size: 0.8rem;
  }

  :global(.dark) .comment-time {
    color: var(--grove-text-muted, #999);
  }

  .comment-edited {
    color: var(--color-text-muted, #888);
    font-size: 0.75rem;
    font-style: italic;
  }

  .comment-body {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--color-text, #333);
  }

  :global(.dark) .comment-body {
    color: var(--grove-text-strong, #d4d4d4);
  }

  .comment-body :global(p) {
    margin: 0 0 0.5rem 0;
  }

  .comment-body :global(p:last-child) {
    margin-bottom: 0;
  }

  .deleted-text {
    color: var(--color-text-muted, #999);
    font-style: italic;
  }

  .comment-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.375rem;
  }

  .action-btn {
    background: none;
    border: none;
    color: var(--color-text-muted, #666);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    font-family: inherit;
    transition: color 0.15s ease;
    border-radius: 6px;
  }

  .action-btn:hover {
    color: var(--user-accent, var(--color-primary, #2c5f2d));
  }

  .action-btn:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
  }

  :global(.dark) .action-btn:focus-visible {
    outline-color: var(--grove-300, #86efac);
  }

  :global(.dark) .action-btn:hover {
    color: var(--grove-300, #86efac);
  }

  .action-btn-danger:hover {
    color: var(--color-destructive, #dc2626);
  }

  :global(.dark) .action-btn-danger:hover {
    color: #f87171;
  }

  @media (prefers-reduced-motion: reduce) {
    .action-btn {
      transition: none;
    }
  }
</style>
