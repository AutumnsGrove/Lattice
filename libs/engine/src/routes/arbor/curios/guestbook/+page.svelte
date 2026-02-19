<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import {
    GlassCard,
    GlassButton,
    Badge,
    toast,
  } from "$lib/ui/components/ui";
  import {
    BookOpen,
    Check,
    X,
    Trash2,
    Clock,
    MessageSquare,
    Shield,
    ArrowLeft,
  } from "lucide-svelte";
  import { formatRelativeTime, type GuestbookStyle } from "$lib/curios/guestbook";

  let { data, form } = $props();

  // Config form state
  let enabled = $state(false);
  let style = $state<GuestbookStyle>("cozy");
  let entriesPerPage = $state(20);
  let requireApproval = $state(true);
  let allowEmoji = $state(true);
  let maxMessageLength = $state(500);
  let customPrompt = $state("");
  let isSubmitting = $state(false);

  // Moderation state
  let pendingEntries = $state<
    {
      id: string;
      name: string;
      message: string;
      emoji: string | null;
      createdAt: string;
    }[]
  >([]);
  let loadingPending = $state(false);
  let activeTab = $state<"settings" | "moderation">("settings");

  // Sync form state with loaded data
  $effect(() => {
    if (data.config) {
      enabled = data.config.enabled ?? false;
      style = (data.config.style as GuestbookStyle) ?? "cozy";
      entriesPerPage = data.config.entriesPerPage ?? 20;
      requireApproval = data.config.requireApproval ?? true;
      allowEmoji = data.config.allowEmoji ?? true;
      maxMessageLength = data.config.maxMessageLength ?? 500;
      customPrompt = data.config.customPrompt ?? "";
    }
  });

  // Show toast on form result
  $effect(() => {
    if (form?.success) {
      toast.success("Guestbook settings saved!");
    } else if (form?.error) {
      toast.error("Failed to save", { description: form.error });
    }
  });

  async function loadPendingEntries() {
    loadingPending = true;
    try {
      const res = await fetch("/api/curios/guestbook/pending"); // csrf-ok
      if (res.ok) {
        const data = (await res.json()) as { entries: typeof pendingEntries };
        pendingEntries = data.entries;
      }
    } catch {
      toast.error("Failed to load pending entries");
    } finally {
      loadingPending = false;
    }
  }

  async function approveEntry(id: string) {
    try {
      const res = await fetch(`/api/curios/guestbook/${id}`, { // csrf-ok
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (res.ok) {
        pendingEntries = pendingEntries.filter((e) => e.id !== id);
        toast.success("Entry approved!");
        invalidateAll();
      }
    } catch {
      toast.error("Failed to approve entry");
    }
  }

  async function deleteEntry(id: string) {
    try {
      const res = await fetch(`/api/curios/guestbook/${id}`, { // csrf-ok
        method: "DELETE",
      });
      if (res.ok) {
        pendingEntries = pendingEntries.filter((e) => e.id !== id);
        toast.success("Entry deleted");
        invalidateAll();
      }
    } catch {
      toast.error("Failed to delete entry");
    }
  }

  function switchTab(tab: "settings" | "moderation") {
    activeTab = tab;
    if (tab === "moderation" && pendingEntries.length === 0) {
      loadPendingEntries();
    }
  }
</script>

<svelte:head>
  <title>Guestbook - Admin</title>
</svelte:head>

<div class="guestbook-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <BookOpen class="header-icon" />
      <h1>Guestbook</h1>
    </div>
    <p class="subtitle">
      Let visitors sign your guestbook. The classic personal web element.
    </p>
  </header>

  <!-- Stats -->
  <div class="stats-row">
    <GlassCard class="stat-card">
      <div class="stat-value">{data.stats.approvedEntries}</div>
      <div class="stat-label">Approved</div>
    </GlassCard>
    <GlassCard class="stat-card">
      <div class="stat-value pending-value">{data.stats.pendingEntries}</div>
      <div class="stat-label">Pending</div>
    </GlassCard>
    <GlassCard class="stat-card">
      <div class="stat-value">{data.stats.totalEntries}</div>
      <div class="stat-label">Total</div>
    </GlassCard>
  </div>

  <!-- Tabs -->
  <div class="tab-bar">
    <button
      class="tab"
      class:active={activeTab === "settings"}
      onclick={() => switchTab("settings")}
    >
      Settings
    </button>
    <button
      class="tab"
      class:active={activeTab === "moderation"}
      onclick={() => switchTab("moderation")}
    >
      Moderation
      {#if data.stats.pendingEntries > 0}
        <Badge variant="destructive" class="pending-badge"
          >{data.stats.pendingEntries}</Badge
        >
      {/if}
    </button>
  </div>

  <!-- Settings Tab -->
  {#if activeTab === "settings"}
    <GlassCard class="settings-card">
      <form
        method="POST"
        action="?/save"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            await update();
          };
        }}
      >
        <!-- Enable Toggle -->
        <div class="form-section">
          <h3>General</h3>
          <label class="toggle-row">
            <span class="toggle-label">
              <strong>Enable Guestbook</strong>
              <span class="toggle-hint"
                >Make the guestbook visible on your site</span
              >
            </span>
            <input
              type="checkbox"
              name="enabled"
              value="true"
              bind:checked={enabled}
              class="toggle-input"
            />
          </label>
        </div>

        <!-- Display Style -->
        <div class="form-section">
          <h3>Display Style</h3>
          <div class="style-grid">
            {#each data.styleOptions as option}
              <label
                class="style-option"
                class:selected={style === option.value}
              >
                <input
                  type="radio"
                  name="style"
                  value={option.value}
                  bind:group={style}
                />
                <span class="style-name">{option.label}</span>
                <span class="style-desc">{option.description}</span>
              </label>
            {/each}
          </div>
        </div>

        <!-- Moderation -->
        <div class="form-section">
          <h3>Moderation</h3>
          <label class="toggle-row">
            <span class="toggle-label">
              <strong>Require Approval</strong>
              <span class="toggle-hint"
                >Review entries before they appear publicly</span
              >
            </span>
            <input
              type="checkbox"
              name="requireApproval"
              value="true"
              bind:checked={requireApproval}
              class="toggle-input"
            />
          </label>
        </div>

        <!-- Features -->
        <div class="form-section">
          <h3>Features</h3>
          <label class="toggle-row">
            <span class="toggle-label">
              <strong>Allow Emoji</strong>
              <span class="toggle-hint"
                >Let visitors pick an emoji for their entry</span
              >
            </span>
            <input
              type="checkbox"
              name="allowEmoji"
              value="true"
              bind:checked={allowEmoji}
              class="toggle-input"
            />
          </label>
        </div>

        <!-- Limits -->
        <div class="form-section">
          <h3>Limits</h3>
          <div class="input-group">
            <label class="input-label" for="entriesPerPage">
              Entries per page
            </label>
            <input
              id="entriesPerPage"
              type="number"
              name="entriesPerPage"
              bind:value={entriesPerPage}
              min="10"
              max="100"
              class="number-input"
            />
          </div>
          <div class="input-group">
            <label class="input-label" for="maxMessageLength">
              Max message length
            </label>
            <input
              id="maxMessageLength"
              type="number"
              name="maxMessageLength"
              bind:value={maxMessageLength}
              min="50"
              max="2000"
              class="number-input"
            />
          </div>
        </div>

        <!-- Custom Prompt -->
        <div class="form-section">
          <h3>Custom Prompt</h3>
          <div class="input-group">
            <label class="input-label" for="customPrompt">
              Prompt text shown above the form
            </label>
            <input
              id="customPrompt"
              type="text"
              name="customPrompt"
              bind:value={customPrompt}
              placeholder="Leave a message!"
              class="text-input"
            />
          </div>
        </div>

        <div class="form-actions">
          <GlassButton type="submit" variant="accent" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Configuration"}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  {/if}

  <!-- Moderation Tab -->
  {#if activeTab === "moderation"}
    <GlassCard class="moderation-card">
      {#if loadingPending}
        <div class="loading-state">
          <Clock class="w-5 h-5 spin" />
          <span>Loading pending entries...</span>
        </div>
      {:else if pendingEntries.length === 0}
        <div class="empty-state">
          <Shield class="w-8 h-8" />
          <p>No entries awaiting approval</p>
          <span class="empty-hint">New entries will appear here when visitors sign your guestbook</span>
        </div>
      {:else}
        <div class="pending-list">
          {#each pendingEntries as entry}
            <div class="pending-entry">
              <div class="entry-header">
                <span class="entry-name">
                  {#if entry.emoji}<span class="entry-emoji">{entry.emoji}</span
                    >{/if}
                  {entry.name}
                </span>
                <span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
              </div>
              <p class="entry-message">{entry.message}</p>
              <div class="entry-actions">
                <button
                  class="action-btn approve"
                  onclick={() => approveEntry(entry.id)}
                  aria-label="Approve entry from {entry.name}"
                >
                  <Check class="w-4 h-4" />
                  Approve
                </button>
                <button
                  class="action-btn delete"
                  onclick={() => deleteEntry(entry.id)}
                  aria-label="Delete entry from {entry.name}"
                >
                  <Trash2 class="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </GlassCard>
  {/if}
</div>

<style>
  .guestbook-admin {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .header-top {
    margin-bottom: 1rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  :global(.header-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
  }

  /* Stats */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  :global(.stat-card) {
    text-align: center;
    padding: 1.25rem !important;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-value.pending-value {
    color: var(--color-primary);
  }

  .stat-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  /* Tabs */
  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
    margin-bottom: 1.5rem;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
  }

  .tab:hover {
    color: var(--color-text);
  }

  .tab.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    font-weight: 500;
  }

  :global(.pending-badge) {
    font-size: 0.7rem !important;
    padding: 0.1rem 0.4rem !important;
    min-width: 1.25rem;
    text-align: center;
  }

  /* Settings Card */
  :global(.settings-card) {
    padding: 1.5rem !important;
  }

  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .form-section:last-of-type {
    border-bottom: none;
    margin-bottom: 1rem;
  }

  .form-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  /* Toggle rows */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
  }

  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .toggle-hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .toggle-input {
    width: 2.5rem;
    height: 1.25rem;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  /* Style grid */
  .style-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .style-option:hover {
    border-color: var(--color-primary);
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
  }

  .style-option.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .style-option input[type="radio"] {
    display: none;
  }

  .style-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text);
  }

  .style-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* Input groups */
  .input-group {
    margin-bottom: 1rem;
  }

  .input-group:last-child {
    margin-bottom: 0;
  }

  .input-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .number-input,
  .text-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
    transition: border-color 0.2s ease;
  }

  .number-input:focus,
  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .number-input {
    max-width: 150px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
  }

  /* Moderation Card */
  :global(.moderation-card) {
    padding: 1.5rem !important;
  }

  .loading-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--color-text-muted);
  }

  .empty-hint {
    font-size: 0.85rem;
    opacity: 0.7;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.spin) {
      animation: none;
    }
  }

  /* Pending entries */
  .pending-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .pending-entry {
    padding: 1rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .entry-name {
    font-weight: 600;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .entry-emoji {
    font-size: 1.1em;
  }

  .entry-date {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .entry-message {
    font-size: 0.9rem;
    color: var(--color-text);
    line-height: 1.5;
    margin: 0 0 0.75rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .entry-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    background: transparent;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.2s ease;
  }

  .action-btn.approve {
    color: hsl(var(--grove-600, 142 76% 36%));
  }

  .action-btn.approve:hover {
    background: hsl(var(--grove-600, 142 76% 36%) / 0.1);
    border-color: hsl(var(--grove-600, 142 76% 36%));
  }

  .action-btn.delete {
    color: hsl(var(--destructive));
  }

  .action-btn.delete:hover {
    background: hsl(var(--destructive) / 0.1);
    border-color: hsl(var(--destructive));
  }

  :global(.dark) .action-btn.approve:hover {
    background: rgb(6 78 59 / 0.3);
  }

  :global(.dark) .action-btn.delete:hover {
    background: rgb(127 29 29 / 0.3);
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .style-grid {
      grid-template-columns: 1fr;
    }

    .title-row {
      flex-wrap: wrap;
    }

    .toggle-row {
      flex-wrap: wrap;
    }

    .tab {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }

    .entry-header {
      flex-wrap: wrap;
    }

    .entry-actions {
      flex-wrap: wrap;
    }
  }
</style>
