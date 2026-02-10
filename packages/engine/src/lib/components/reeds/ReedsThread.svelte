<script lang="ts">
  /**
   * ReedsThread — Full comment section for a blog post
   *
   * Loads comments, displays threaded conversation, and provides
   * the comment form. The main integration component for /garden/[slug].
   */

  import ReedsComment from "./ReedsComment.svelte";
  import ReedsCommentForm from "./ReedsCommentForm.svelte";
  import { GlassConfirmDialog, toast, GroveSwap } from "$lib/ui";

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

  interface CommentSettings {
    comments_enabled: number;
    public_comments_enabled: number;
    who_can_comment: string;
    show_comment_count: number;
  }

  interface Props {
    slug: string;
    initialComments?: Comment[];
    initialTotal?: number;
    settings?: CommentSettings;
    currentUserId?: string;
    isOwner?: boolean;
    isLoggedIn?: boolean;
  }

  let {
    slug,
    initialComments = [],
    initialTotal = 0,
    settings,
    currentUserId,
    isOwner = false,
    isLoggedIn = false,
  }: Props = $props();

  let comments = $state<Comment[]>(initialComments);
  let total = $state(initialTotal);
  let replyingTo = $state<string | null>(null);
  let loading = $state(false);

  // Delete confirmation
  let showDeleteDialog = $state(false);
  let deletingId = $state<string | null>(null);
  let deleting = $state(false);

  let commentsEnabled = $derived(settings?.comments_enabled !== 0);
  let publicEnabled = $derived(settings?.public_comments_enabled !== 0);

  async function refreshComments() {
    loading = true;
    try {
      const res = await fetch(`/api/reeds/${slug}`); // csrf-ok
      if (res.ok) {
        const data = (await res.json()) as { comments?: Comment[]; total?: number };
        comments = data.comments || [];
        total = data.total || 0;
      }
    } catch {
      // Silently fail — comments will stay as-is
    } finally {
      loading = false;
    }
  }

  function handleReply(commentId: string) {
    replyingTo = replyingTo === commentId ? null : commentId;
  }

  function handleEdit(commentId: string) {
    // For now, open a prompt — can be upgraded to inline editing later
    const comment = findComment(comments, commentId);
    if (!comment) return;

    const newContent = prompt("Edit your comment:", comment.content);
    if (newContent === null || newContent.trim() === comment.content) return;

    submitEdit(commentId, newContent.trim());
  }

  async function submitEdit(commentId: string, content: string) {
    try {
      const res = await fetch(`/api/reeds/${slug}/${commentId}`, { // csrf-ok: origin fallback, migrate to api.*()
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
        throw new Error(err?.error_description || "Failed to edit comment");
      }

      toast.success("Comment updated.");
      await refreshComments();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    }
  }

  function confirmDelete(commentId: string) {
    deletingId = commentId;
    showDeleteDialog = true;
  }

  async function handleDelete() {
    if (!deletingId) return;

    deleting = true;
    try {
      const res = await fetch(`/api/reeds/${slug}/${deletingId}`, { // csrf-ok: origin fallback, migrate to api.*()
        method: "DELETE",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
        throw new Error(err?.error_description || "Failed to delete comment");
      }

      toast.success("Comment removed.");
      showDeleteDialog = false;
      deletingId = null;
      await refreshComments();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      deleting = false;
    }
  }

  function findComment(list: Comment[], id: string): Comment | null {
    for (const c of list) {
      if (c.id === id) return c;
      if (c.replies?.length) {
        const found = findComment(c.replies, id);
        if (found) return found;
      }
    }
    return null;
  }
</script>

{#if commentsEnabled}
  <section class="reeds-section" id="reeds" aria-label="Comments">
    <div class="reeds-header">
      <h2 class="reeds-title">
        {#if total > 0}
          <GroveSwap term="reeds">Comments</GroveSwap> ({total})
        {:else}
          <GroveSwap term="reeds">Comments</GroveSwap>
        {/if}
      </h2>
    </div>

    <!-- Comment list -->
    {#if comments.length > 0}
      <div class="reeds-list">
        {#each comments as comment (comment.id)}
          <ReedsComment
            {comment}
            {currentUserId}
            {isOwner}
            onreply={isLoggedIn ? handleReply : undefined}
            onedit={handleEdit}
            ondelete={confirmDelete}
          />

          <!-- Inline reply form -->
          {#if replyingTo === comment.id}
            <div class="inline-reply">
              <ReedsCommentForm
                {slug}
                parentId={comment.id}
                allowPublic={publicEnabled}
                compact
                onsubmitted={() => {
                  replyingTo = null;
                  refreshComments();
                }}
                oncancel={() => (replyingTo = null)}
              />
            </div>
          {/if}
        {/each}
      </div>
    {:else}
      <p class="reeds-empty">
        No comments yet. Be the first to share your thoughts.
      </p>
    {/if}

    <!-- Main comment form -->
    {#if isLoggedIn}
      <div class="reeds-form-wrapper">
        <ReedsCommentForm
          {slug}
          allowPublic={publicEnabled}
          onsubmitted={refreshComments}
        />
      </div>
    {:else}
      <div class="reeds-sign-in">
        <p>
          <a href="/auth/login?redirect=/garden/{slug}">Sign in</a> to leave a thought.
        </p>
      </div>
    {/if}
  </section>

  <!-- Delete confirmation dialog -->
  <GlassConfirmDialog
    bind:open={showDeleteDialog}
    title="Delete Comment"
    message="Are you sure you want to remove this comment? This can't be undone."
    confirmLabel="Delete"
    cancelLabel="Cancel"
    variant="danger"
    loading={deleting}
    onconfirm={handleDelete}
    oncancel={() => {
      showDeleteDialog = false;
      deletingId = null;
    }}
  />
{/if}

<style>
  .reeds-section {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.08));
  }

  .reeds-header {
    margin-bottom: 1.25rem;
  }

  .reeds-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text, #1a1a1a);
  }

  :global(.dark) .reeds-title {
    color: var(--grove-text-strong, #e5e5e5);
  }

  .reeds-list {
    margin-bottom: 1.5rem;
  }

  .reeds-empty {
    color: var(--color-text-muted, #888);
    font-size: 0.9375rem;
    margin: 1rem 0 2rem 0;
    font-style: italic;
  }

  :global(.dark) .reeds-empty {
    color: var(--grove-text-muted, #999);
  }

  .inline-reply {
    margin-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .reeds-form-wrapper {
    margin-top: 1.5rem;
  }

  .reeds-sign-in {
    margin-top: 1.5rem;
    padding: 1rem;
    text-align: center;
    background: var(--grove-overlay-8, rgba(0, 0, 0, 0.03));
    border-radius: 8px;
  }

  .reeds-sign-in p {
    margin: 0;
    color: var(--color-text-muted, #666);
    font-size: 0.9375rem;
  }

  .reeds-sign-in a {
    color: var(--user-accent, var(--color-primary, #2c5f2d));
    font-weight: 600;
    text-decoration: none;
  }

  .reeds-sign-in a:hover {
    text-decoration: underline;
  }

  :global(.dark) .reeds-sign-in {
    background: rgba(255, 255, 255, 0.04);
  }

  :global(.dark) .reeds-sign-in p {
    color: var(--grove-text-muted, #999);
  }

  :global(.dark) .reeds-sign-in a {
    color: var(--grove-300, #86efac);
  }
</style>
