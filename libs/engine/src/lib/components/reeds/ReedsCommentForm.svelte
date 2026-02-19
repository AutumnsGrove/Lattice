<script lang="ts">
  /**
   * ReedsCommentForm — Comment submission form
   *
   * Dual-mode: private reply (author-only) or public comment (author-moderated).
   * Includes the reply/comment toggle and submission feedback.
   */

  import { toast } from "$lib/ui";
  import { getCSRFToken } from "$lib/utils/api.js";

  interface Props {
    slug: string;
    parentId?: string;
    allowPublic?: boolean;
    onsubmitted?: () => void;
    oncancel?: () => void;
    compact?: boolean;
  }

  let {
    slug,
    parentId,
    allowPublic = true,
    onsubmitted,
    oncancel,
    compact = false,
  }: Props = $props();

  let content = $state("");
  let isPublic = $state(false);
  let submitting = $state(false);

  const MAX_LENGTH = 10_000;
  let charCount = $derived(content.length);
  let nearLimit = $derived(charCount > MAX_LENGTH * 0.9);

  async function handleSubmit(e: Event) {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Please write something before submitting.");
      return;
    }

    if (content.length > MAX_LENGTH) {
      toast.error("Comment is too long. Please shorten it.");
      return;
    }

    submitting = true;

    try {
      const csrfToken = getCSRFToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
        headers["csrf-token"] = csrfToken;
      }

      const response = await fetch(`/api/reeds/${slug}`, {
        // csrf-ok - CSRF token manually injected above
        method: "POST",
        headers,
        body: JSON.stringify({
          content: content.trim(),
          is_public: isPublic,
          parent_id: parentId || undefined,
        }),
      });

      if (!response.ok) {
        const err = (await response.json().catch(() => null)) as { error_description?: string; message?: string } | null;
        throw new Error(
          err?.error_description || err?.message || "Failed to submit comment",
        );
      }

      const result = (await response.json()) as { message?: string };

      // Clear form
      content = "";

      toast.success(result.message || "Submitted!");
      onsubmitted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      submitting = false;
    }
  }
</script>

<form
  class="reeds-form"
  class:compact
  onsubmit={handleSubmit}
>
  {#if !compact}
    <h3 class="form-heading">Leave a thought</h3>
  {/if}

  <div class="form-field">
    <textarea
      bind:value={content}
      placeholder={parentId ? "Write a reply..." : "Share your thoughts..."}
      rows={compact ? 2 : 4}
      class="form-textarea"
      maxlength={MAX_LENGTH}
      disabled={submitting}
      aria-label={parentId ? "Reply" : "Comment"}
    ></textarea>
    {#if nearLimit}
      <span class="char-count" class:over={charCount > MAX_LENGTH}>
        {charCount.toLocaleString()}/{MAX_LENGTH.toLocaleString()}
      </span>
    {/if}
  </div>

  <div class="form-controls">
    <div class="mode-toggle" role="radiogroup" aria-label="Comment visibility">
      <label class="mode-option">
        <input
          type="radio"
          name="comment-mode"
          value="reply"
          checked={!isPublic}
          onchange={() => (isPublic = false)}
          disabled={submitting}
        />
        <span class="mode-label">Reply <span class="mode-hint">(private)</span></span>
      </label>
      {#if allowPublic}
        <label class="mode-option">
          <input
            type="radio"
            name="comment-mode"
            value="comment"
            checked={isPublic}
            onchange={() => (isPublic = true)}
            disabled={submitting}
          />
          <span class="mode-label">Comment <span class="mode-hint">(public)</span></span>
        </label>
      {/if}
    </div>

    <div class="form-actions">
      {#if oncancel}
        <button
          type="button"
          class="btn-cancel"
          onclick={oncancel}
          disabled={submitting}
        >
          Cancel
        </button>
      {/if}
      <button
        type="submit"
        class="btn-submit"
        disabled={submitting || !content.trim()}
      >
        {submitting ? "Sending..." : "Submit"}
      </button>
    </div>
  </div>

  <p class="form-hint">
    {#if isPublic}
      Comments are public after the author approves them.
    {:else}
      Replies are private — only the author sees them.
    {/if}
  </p>
</form>

<style>
  .reeds-form {
    padding: 1.25rem;
    background: var(--glass-bg, rgba(255, 255, 255, 0.7));
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid var(--grove-border-subtle, rgba(255, 255, 255, 0.3));
    border-radius: 12px;
  }

  :global(.dark) .reeds-form {
    background: rgba(36, 36, 36, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }

  @media (prefers-reduced-motion: reduce) {
    .reeds-form {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      background: rgba(255, 255, 255, 0.95);
    }
    :global(.dark) .reeds-form {
      background: rgba(36, 36, 36, 0.95);
    }
  }

  .reeds-form.compact {
    padding: 0.75rem;
    border-radius: 8px;
  }

  .form-heading {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #1a1a1a);
  }

  :global(.dark) .form-heading {
    color: var(--grove-text-strong, #e5e5e5);
  }

  .form-field {
    position: relative;
    margin-bottom: 0.75rem;
  }

  .form-textarea {
    width: 100%;
    padding: 0.75rem;
    font-family: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;
    color: var(--color-text, #333);
    background: var(--input-bg, rgba(255, 255, 255, 0.8));
    border: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.12));
    border-radius: 8px;
    resize: vertical;
    min-height: 60px;
    transition: border-color 0.15s ease;
    box-sizing: border-box;
  }

  .form-textarea:focus {
    outline: none;
    border-color: var(--user-accent, var(--color-primary, #2c5f2d));
    box-shadow: 0 0 0 2px var(--user-accent-faint, rgba(44, 95, 45, 0.1));
  }

  :global(.dark) .form-textarea {
    color: var(--grove-text-strong, #d4d4d4);
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }

  :global(.dark) .form-textarea:focus {
    border-color: var(--grove-300, #86efac);
    box-shadow: 0 0 0 2px rgba(134, 239, 172, 0.15);
  }

  .form-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .char-count {
    position: absolute;
    bottom: 0.5rem;
    right: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, #999);
  }

  .char-count.over {
    color: var(--color-destructive, #dc2626);
    font-weight: 600;
  }

  .form-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .mode-toggle {
    display: flex;
    gap: 1rem;
  }

  .mode-option {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--color-text, #333);
  }

  :global(.dark) .mode-option {
    color: var(--grove-text-strong, #d4d4d4);
  }

  .mode-option input[type="radio"] {
    accent-color: var(--user-accent, var(--color-primary, #2c5f2d));
  }

  .mode-hint {
    color: var(--color-text-muted, #888);
    font-size: 0.8rem;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-submit {
    padding: 0.75rem 1.5rem;
    min-height: 44px;
    font-size: 0.875rem;
    font-weight: 600;
    font-family: inherit;
    color: white;
    background: var(--user-accent, var(--color-primary, #2c5f2d));
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .btn-submit:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-submit:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
  }

  .btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    padding: 0.75rem 1.25rem;
    min-height: 44px;
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--color-text-muted, #666);
    background: transparent;
    border: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.12));
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-cancel:hover {
    background: var(--grove-overlay-8, rgba(0, 0, 0, 0.04));
  }

  .btn-cancel:focus-visible {
    outline: 2px solid var(--user-accent, var(--color-primary, #2c5f2d));
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-submit,
    .btn-cancel {
      transition: none;
    }
  }

  .form-hint {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-muted, #888);
    line-height: 1.4;
  }

  :global(.dark) .form-hint {
    color: var(--grove-text-muted, #999);
  }
</style>
