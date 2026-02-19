<script lang="ts">
  import { GlassCard, Button, Spinner } from "$lib/ui";
  import { KeyRound, Plus, Trash2, Fingerprint, AlertCircle } from "lucide-svelte";
  import type { Passkey } from "$lib/heartwood";

  interface Props {
    passkeys: Passkey[];
    passkeyError: boolean;
    supportsPasskeys: boolean;
    deletingId: string | null;
    onRegister: () => void;
    onDelete: (id: string) => void;
    loading?: boolean;
  }

  let {
    passkeys,
    passkeyError,
    supportsPasskeys,
    deletingId,
    onRegister,
    onDelete,
    loading = false,
  }: Props = $props();

  /**
   * Format a date string for display
   */
  function formatDate(dateString: string | null): string {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  /**
   * Format relative time for last used
   */
  function formatLastUsed(dateString: string | null): string {
    if (!dateString) return "Never used";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Used today";
    if (diffDays === 1) return "Used yesterday";
    if (diffDays < 7) return `Used ${diffDays} days ago`;
    if (diffDays < 30) return `Used ${Math.floor(diffDays / 7)} weeks ago`;
    return `Used ${formatDate(dateString)}`;
  }
</script>

<GlassCard variant="default" class="mb-6">
  <div class="card-header">
    <h2>
      <KeyRound class="header-icon" aria-hidden="true" />
      Passkeys
      {#if passkeys.length > 0}
        <span class="passkey-count">({passkeys.length})</span>
      {/if}
    </h2>
  </div>

  {#if loading}
    <!-- Loading State (deferred data streaming in) -->
    <div class="loading-state">
      <Spinner size="sm" />
      <p>Loading passkeys...</p>
    </div>
  {:else if passkeyError}
    <!-- Error State -->
    <div class="error-state" role="alert">
      <AlertCircle class="error-icon" aria-hidden="true" />
      <p>Could not load passkeys. Please try refreshing the page.</p>
    </div>
  {:else if passkeys.length === 0}
    <!-- Empty State -->
    <div class="empty-state">
      <div class="empty-icon-wrapper">
        <Fingerprint class="empty-icon" aria-hidden="true" />
      </div>
      <h3>No passkeys yet</h3>
      <p class="empty-description">
        Passkeys let you sign in securely using Face ID, Touch ID, or Windows Hello
        — no password needed.
      </p>

      {#if supportsPasskeys}
        <Button
          variant="primary"
          onclick={onRegister}
          aria-label="Add your first passkey"
        >
          <Plus class="btn-icon" aria-hidden="true" />
          Add Your First Passkey
        </Button>
      {:else}
        <p class="not-supported">
          Your device or browser doesn't support passkeys.
        </p>
      {/if}
    </div>
  {:else}
    <!-- Passkey List -->
    <ul class="passkey-list" aria-label="Your passkeys">
      {#each passkeys as passkey (passkey.id)}
        <li class="passkey-item">
          <div class="passkey-info">
            <Fingerprint class="passkey-icon" aria-hidden="true" />
            <div class="passkey-details">
              <span class="passkey-name">{passkey.name}</span>
              <span class="passkey-meta">
                Added: {formatDate(passkey.createdAt)} · {formatLastUsed(passkey.lastUsedAt)}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => onDelete(passkey.id)}
            disabled={deletingId === passkey.id}
            aria-busy={deletingId === passkey.id}
            aria-label={deletingId === passkey.id ? "Removing passkey..." : `Remove ${passkey.name}`}
            class="delete-btn"
          >
            {#if deletingId === passkey.id}
              <span aria-hidden="true"><Spinner size="sm" /></span>
            {:else}
              <Trash2 class="delete-icon" aria-hidden="true" />
            {/if}
            Remove
          </Button>
        </li>
      {/each}
    </ul>

    <!-- Add More Button -->
    {#if supportsPasskeys}
      <div class="add-more">
        <Button
          variant="secondary"
          onclick={onRegister}
          aria-label="Add another passkey"
        >
          <Plus class="btn-icon" aria-hidden="true" />
          Add Passkey
        </Button>
      </div>
    {/if}
  {/if}

  <p class="security-note">
    Passkeys are more secure than passwords and protect against phishing attacks.
    Each passkey is unique to this device.
  </p>
</GlassCard>

<style>
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .card-header h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  :global(.header-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-primary);
  }

  .passkey-count {
    font-size: 0.9rem;
    font-weight: normal;
    color: var(--color-text-muted);
  }

  /* Loading State */
  .loading-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.5rem;
    justify-content: center;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .loading-state p {
    margin: 0;
  }

  /* Error State */
  .error-state {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--border-radius-small);
    color: #dc2626;
    margin-bottom: 1rem;
  }

  :global(.dark) .error-state {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  :global(.error-icon) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  .error-state p {
    margin: 0;
    font-size: 0.9rem;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 2rem 1rem;
  }

  .empty-icon-wrapper {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 4rem;
    height: 4rem;
    background: var(--color-surface-subtle);
    border-radius: 50%;
    margin-bottom: 1rem;
  }

  :global(.empty-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-text-muted);
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
    color: var(--color-text);
  }

  .empty-description {
    margin: 0 0 1.5rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    max-width: 32ch;
    margin-left: auto;
    margin-right: auto;
  }

  .not-supported {
    margin: 0;
    padding: 0.75rem 1rem;
    background: var(--color-surface-subtle);
    border-radius: var(--border-radius-small);
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  /* Passkey List */
  .passkey-list {
    list-style: none;
    margin: 0 0 1rem 0;
    padding: 0;
  }

  .passkey-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .passkey-item:last-child {
    border-bottom: none;
  }

  .passkey-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.passkey-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .passkey-details {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .passkey-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .passkey-meta {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  :global(.delete-btn) {
    color: var(--color-text-muted);
  }

  :global(.delete-btn:hover) {
    color: #dc2626;
  }

  :global(.delete-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.25rem;
  }

  /* Add More */
  .add-more {
    margin-top: 1rem;
  }

  /* Security Note */
  .security-note {
    margin: 1rem 0 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    font-size: 0.8rem;
    color: var(--color-text-subtle);
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }

  /* Mobile Responsiveness */
  @media (max-width: 640px) {
    .passkey-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }

    .passkey-info {
      width: 100%;
    }

    :global(.delete-btn) {
      align-self: flex-end;
    }
  }
</style>
