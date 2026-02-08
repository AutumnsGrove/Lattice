<script lang="ts">
  import {
    GlassCard, Badge, toast, GroveSwap,
    MessageSquare, Mail, Check, X, Ban, Settings, ShieldAlert, UserX,
  } from "$lib/ui";

  let { data } = $props();

  type TabId = "pending" | "replies" | "moderated" | "blocked" | "settings";
  let activeTab = $state<TabId>("pending");
  let moderating = $state<string | null>(null);
  let unblocking = $state<string | null>(null);
  let savingSettings = $state(false);

  let pendingCount = $derived(data.pending?.length ?? 0);
  let replyCount = $derived(data.replies?.length ?? 0);
  let moderatedCount = $derived(data.moderated?.length ?? 0);
  let blockedCount = $derived(data.blocked?.length ?? 0);

  // Local settings state (editable copy)
  let commentsEnabled = $state(data.settings?.comments_enabled ?? 1);
  let publicEnabled = $state(data.settings?.public_comments_enabled ?? 1);
  let whoCanComment = $state(data.settings?.who_can_comment ?? "anyone");
  let showCount = $state(data.settings?.show_comment_count ?? 1);

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
        const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
        throw new Error(err?.error_description || "Moderation failed");
      }

      const result = (await res.json()) as { message?: string };
      toast.success(result.message || "Done!");

      // Remove from the appropriate list
      if (data.pending) {
        data.pending = data.pending.filter(
          (c: { id: string }) => c.id !== commentId,
        );
      }
      if (data.moderated) {
        data.moderated = data.moderated.filter(
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

  async function unblock(userId: string) {
    unblocking = userId;

    try {
      const res = await fetch(`/api/reeds/blocked/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
        throw new Error(err?.error_description || "Unblock failed");
      }

      toast.success("User unblocked.");

      if (data.blocked) {
        data.blocked = data.blocked.filter(
          (b: { blocked_user_id: string }) => b.blocked_user_id !== userId,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      unblocking = null;
    }
  }

  async function saveSettings() {
    savingSettings = true;

    try {
      const res = await fetch("/api/reeds/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comments_enabled: commentsEnabled,
          public_comments_enabled: publicEnabled,
          who_can_comment: whoCanComment,
          show_comment_count: showCount,
        }),
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error_description?: string } | null;
        throw new Error(err?.error_description || "Failed to save settings");
      }

      toast.success("Settings saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      savingSettings = false;
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
      Pending
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
      Replies
      {#if replyCount > 0}
        <Badge variant="secondary">{replyCount}</Badge>
      {/if}
    </button>
    <button
      role="tab"
      id="tab-moderated"
      aria-selected={activeTab === "moderated"}
      aria-controls="panel-moderated"
      class="tab"
      class:active={activeTab === "moderated"}
      onclick={() => (activeTab = "moderated")}
    >
      Moderated
      {#if moderatedCount > 0}
        <Badge variant="secondary">{moderatedCount}</Badge>
      {/if}
    </button>
    <button
      role="tab"
      id="tab-blocked"
      aria-selected={activeTab === "blocked"}
      aria-controls="panel-blocked"
      class="tab"
      class:active={activeTab === "blocked"}
      onclick={() => (activeTab = "blocked")}
    >
      Blocked
      {#if blockedCount > 0}
        <Badge variant="secondary">{blockedCount}</Badge>
      {/if}
    </button>
    <button
      role="tab"
      id="tab-settings"
      aria-selected={activeTab === "settings"}
      aria-controls="panel-settings"
      class="tab"
      class:active={activeTab === "settings"}
      onclick={() => (activeTab = "settings")}
    >
      Settings
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

  <!-- Moderated (rejected/spam) -->
  {#if activeTab === "moderated"}
    <div id="panel-moderated" role="tabpanel" aria-labelledby="tab-moderated">
    <GlassCard variant="default" class="overflow-hidden">
      {#if data.moderated && data.moderated.length > 0}
        <div class="comment-list">
          {#each data.moderated as comment (comment.id)}
            {@const post = getPostInfo(comment.post_id)}
            <div class="comment-card" class:moderating={moderating === comment.id}>
              <div class="comment-meta">
                <span class="status-label status-{comment.status}">{comment.status}</span>
                <span class="comment-author">{comment.author_name}</span>
                <span class="meta-sep" aria-hidden="true"></span>
                <time class="comment-time">{formatTimeAgo(comment.moderated_at || comment.created_at)}</time>
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
                  title="Re-approve this comment"
                >
                  <Check class="mod-icon" />
                  Approve
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <ShieldAlert class="empty-icon" />
          <p>No rejected or spam-flagged comments.</p>
        </div>
      {/if}
    </GlassCard>
    </div>
  {/if}

  <!-- Blocked users -->
  {#if activeTab === "blocked"}
    <div id="panel-blocked" role="tabpanel" aria-labelledby="tab-blocked">
    <GlassCard variant="default" class="overflow-hidden">
      {#if data.blocked && data.blocked.length > 0}
        <div class="comment-list">
          {#each data.blocked as blocked (blocked.blocked_user_id)}
            <div class="comment-card" class:moderating={unblocking === blocked.blocked_user_id}>
              <div class="comment-meta">
                <UserX class="reply-icon" />
                <span class="comment-author">{blocked.blocked_user_id}</span>
                <span class="meta-sep" aria-hidden="true"></span>
                <time class="comment-time">{formatTimeAgo(blocked.created_at)}</time>
                {#if blocked.reason}
                  <span class="meta-sep" aria-hidden="true"></span>
                  <span class="block-reason">{blocked.reason}</span>
                {/if}
              </div>

              <div class="comment-actions">
                <button
                  class="mod-btn mod-approve"
                  onclick={() => unblock(blocked.blocked_user_id)}
                  disabled={unblocking === blocked.blocked_user_id}
                  title="Unblock this user"
                >
                  <Check class="mod-icon" />
                  Unblock
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <Ban class="empty-icon" />
          <p>No blocked users.</p>
        </div>
      {/if}
    </GlassCard>
    </div>
  {/if}

  <!-- Settings -->
  {#if activeTab === "settings"}
    <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
    <GlassCard variant="default">
      <div class="settings-form">
        <div class="setting-group">
          <span class="setting-label" id="label-comments-enabled">
            <span class="setting-name">Comments enabled</span>
            <span class="setting-desc">Allow visitors to leave comments on your posts</span>
          </span>
          <button
            class="toggle-btn"
            class:on={commentsEnabled}
            onclick={() => (commentsEnabled = commentsEnabled ? 0 : 1)}
            role="switch"
            aria-checked={!!commentsEnabled}
            aria-labelledby="label-comments-enabled"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
        </div>

        <div class="setting-group">
          <span class="setting-label" id="label-public-comments">
            <span class="setting-name">Public comments</span>
            <span class="setting-desc">Allow public comments visible to all readers (otherwise, only private replies to you)</span>
          </span>
          <button
            class="toggle-btn"
            class:on={publicEnabled}
            onclick={() => (publicEnabled = publicEnabled ? 0 : 1)}
            role="switch"
            aria-checked={!!publicEnabled}
            aria-labelledby="label-public-comments"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
        </div>

        <div class="setting-group">
          <label class="setting-label" for="who-can-comment">
            <span class="setting-name">Who can comment</span>
            <span class="setting-desc">Restrict who is allowed to leave comments</span>
          </label>
          <select
            id="who-can-comment"
            class="setting-select"
            bind:value={whoCanComment}
          >
            <option value="anyone">Anyone (signed in)</option>
            <option value="grove_members">Grove members only</option>
            <option value="paid_only">Paid subscribers only</option>
            <option value="nobody">Nobody (disabled)</option>
          </select>
        </div>

        <div class="setting-group">
          <span class="setting-label" id="label-show-count">
            <span class="setting-name">Show comment count</span>
            <span class="setting-desc">Display comment count badge on blog posts</span>
          </span>
          <button
            class="toggle-btn"
            class:on={showCount}
            onclick={() => (showCount = showCount ? 0 : 1)}
            role="switch"
            aria-checked={!!showCount}
            aria-labelledby="label-show-count"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
          </button>
        </div>

        <div class="setting-actions">
          <button
            class="save-btn"
            onclick={saveSettings}
            disabled={savingSettings}
          >
            {savingSettings ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
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

  /* Tab bar */
  .tab-bar {
    display: flex;
    gap: 0.125rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.08));
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .tab-bar::-webkit-scrollbar {
    display: none;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.75rem 1rem;
    min-height: 44px;
    white-space: nowrap;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-muted, #666);
    font-size: 0.8125rem;
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

  /* Comment cards */
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

  /* Status labels for moderated tab */
  .status-label {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .status-rejected {
    background: rgba(185, 28, 28, 0.1);
    color: #b91c1c;
  }

  .status-spam {
    background: rgba(146, 64, 14, 0.1);
    color: #92400e;
  }

  :global(.dark) .status-rejected {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
  }

  :global(.dark) .status-spam {
    background: rgba(251, 191, 36, 0.15);
    color: #fcd34d;
  }

  .block-reason {
    color: var(--color-text-muted, #888);
    font-style: italic;
  }

  /* Action buttons */
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

  /* Settings form */
  .settings-form {
    padding: 0.5rem 0;
  }

  .setting-group {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
  }

  .setting-group:last-of-type {
    border-bottom: none;
  }

  .setting-label {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    flex: 1;
    min-width: 0;
  }

  .setting-name {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-text, #333);
  }

  :global(.dark) .setting-name {
    color: var(--grove-text-strong, #d4d4d4);
  }

  .setting-desc {
    font-size: 0.8125rem;
    color: var(--color-text-muted, #888);
    line-height: 1.4;
  }

  /* Toggle switch */
  .toggle-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toggle-btn:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
    border-radius: 14px;
  }

  .toggle-track {
    position: relative;
    width: 40px;
    height: 22px;
    border-radius: 11px;
    background: var(--grove-overlay-20, rgba(0, 0, 0, 0.12));
    transition: background 0.2s;
  }

  .toggle-btn.on .toggle-track {
    background: var(--user-accent, var(--color-primary, #2c5f2d));
  }

  :global(.dark) .toggle-btn.on .toggle-track {
    background: var(--grove-400, #4ade80);
  }

  .toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .toggle-btn.on .toggle-thumb {
    transform: translateX(18px);
  }

  /* Select dropdown */
  .setting-select {
    padding: 0.5rem 0.75rem;
    min-height: 44px;
    border: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.12));
    border-radius: 6px;
    background: var(--grove-overlay-4, rgba(255, 255, 255, 0.7));
    color: var(--color-text, #333);
    font-family: inherit;
    font-size: 0.875rem;
    cursor: pointer;
    flex-shrink: 0;
  }

  .setting-select:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
  }

  :global(.dark) .setting-select {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--grove-text-strong, #d4d4d4);
  }

  .setting-actions {
    padding: 1.25rem;
    display: flex;
    justify-content: flex-end;
  }

  .save-btn {
    padding: 0.625rem 1.5rem;
    min-height: 44px;
    background: var(--user-accent, var(--color-primary, #2c5f2d));
    color: white;
    border: none;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .save-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-btn:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
  }

  :global(.dark) .save-btn {
    background: var(--grove-400, #4ade80);
    color: #1a1a1a;
  }

  @media (prefers-reduced-motion: reduce) {
    .tab,
    .comment-card,
    .mod-btn,
    .toggle-track,
    .toggle-thumb,
    .save-btn {
      transition: none;
    }
  }

  @media (max-width: 540px) {
    .setting-group {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
  }
</style>
