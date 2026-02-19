<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Activity, ArrowLeft, X } from "lucide-svelte";
  import {
    STATUS_PRESETS,
    isStatusExpired,
    formatStatusTime,
    type StatusPreset,
  } from "$lib/curios/activitystatus";

  let { data, form } = $props();

  // Custom status form state
  let customText = $state("");
  let customEmoji = $state("");
  let expiresInHours = $state<string>("");
  let isSubmitting = $state(false);
  let activeTab = $state<"presets" | "custom">("presets");

  // Show toast on form result
  $effect(() => {
    if (form?.success && form?.cleared) {
      toast.success("Status cleared!");
    } else if (form?.success) {
      toast.success("Status updated!");
      customText = "";
      customEmoji = "";
      expiresInHours = "";
    } else if (form?.error) {
      toast.error("Failed", { description: form.error });
    }
  });

  // Current status info
  const hasStatus = $derived(
    data.currentStatus?.statusText || data.currentStatus?.statusEmoji,
  );
  const isExpired = $derived(
    data.currentStatus?.expiresAt
      ? isStatusExpired(data.currentStatus.expiresAt)
      : false,
  );

  // Group presets by category
  const presetsByCategory = $derived(() => {
    const groups: Record<string, StatusPreset[]> = {
      activity: [],
      away: [],
      mood: [],
    };
    for (const preset of STATUS_PRESETS) {
      groups[preset.category].push(preset);
    }
    return groups;
  });

  const categoryLabels: Record<string, string> = {
    activity: "Doing",
    away: "Away",
    mood: "Vibes",
  };

  const expirationOptions = [
    { value: "", label: "Never" },
    { value: "1", label: "1 hour" },
    { value: "4", label: "4 hours" },
    { value: "8", label: "8 hours" },
    { value: "24", label: "1 day" },
    { value: "72", label: "3 days" },
    { value: "168", label: "1 week" },
  ];
</script>

<svelte:head>
  <title>Activity Status - Admin</title>
</svelte:head>

<div class="activitystatus-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <Activity class="header-icon" />
      <h1>Activity Status</h1>
    </div>
    <p class="subtitle">
      A whisper from the other side of the screen: you're here.
    </p>
  </header>

  <!-- Current Status -->
  <GlassCard class="current-card">
    <h3>Current Status</h3>
    {#if hasStatus && !isExpired}
      <div class="current-status">
        <div class="status-display">
          {#if data.currentStatus?.statusEmoji}
            <span class="status-emoji" aria-hidden="true">
              {data.currentStatus.statusEmoji}
            </span>
          {/if}
          <span class="status-text">
            {data.currentStatus?.statusText ?? ""}
          </span>
        </div>
        <div class="status-meta">
          <span class="status-time">
            Updated {formatStatusTime(data.currentStatus?.updatedAt ?? "")}
          </span>
          {#if data.currentStatus?.expiresAt}
            <span class="status-expires">
              Expires {formatStatusTime(data.currentStatus.expiresAt)}
            </span>
          {/if}
        </div>
        <form
          method="POST"
          action="?/clear"
          use:enhance={() => {
            return async ({ update }) => {
              await update();
            };
          }}
        >
          <GlassButton type="submit" variant="ghost" class="clear-btn">
            <X class="w-4 h-4" />
            Clear Status
          </GlassButton>
        </form>
      </div>
    {:else}
      <p class="empty-state">
        No status set. Pick a preset or write your own.
      </p>
    {/if}
  </GlassCard>

  <!-- Set Status -->
  <GlassCard class="set-card">
    <div class="tab-row">
      <button
        class="tab-btn"
        class:active={activeTab === "presets"}
        onclick={() => (activeTab = "presets")}
      >
        Presets
      </button>
      <button
        class="tab-btn"
        class:active={activeTab === "custom"}
        onclick={() => (activeTab = "custom")}
      >
        Custom
      </button>
    </div>

    {#if activeTab === "presets"}
      <!-- Preset Grid -->
      <div class="preset-sections">
        {#each Object.entries(presetsByCategory()) as [category, presets]}
          <div class="preset-section">
            <h4>{categoryLabels[category] ?? category}</h4>
            <div class="preset-grid">
              {#each presets as preset}
                <form
                  method="POST"
                  action="?/set"
                  use:enhance={() => {
                    isSubmitting = true;
                    return async ({ update }) => {
                      isSubmitting = false;
                      await update();
                    };
                  }}
                >
                  <input type="hidden" name="preset" value={preset.id} />
                  {#if expiresInHours}
                    <input
                      type="hidden"
                      name="expiresInHours"
                      value={expiresInHours}
                    />
                  {/if}
                  <button
                    type="submit"
                    class="preset-btn"
                    disabled={isSubmitting}
                  >
                    <span class="preset-emoji" aria-hidden="true">
                      {preset.emoji}
                    </span>
                    <span class="preset-text">{preset.text}</span>
                  </button>
                </form>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Custom Status Form -->
      <form
        method="POST"
        action="?/set"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            await update();
          };
        }}
      >
        <div class="custom-form">
          <div class="custom-row">
            <div class="emoji-input-group">
              <label class="input-label" for="statusEmoji">Emoji</label>
              <input
                id="statusEmoji"
                type="text"
                name="statusEmoji"
                bind:value={customEmoji}
                placeholder="🌱"
                maxlength="10"
                class="emoji-input"
              />
            </div>
            <div class="text-input-group">
              <label class="input-label" for="statusText">Status</label>
              <input
                id="statusText"
                type="text"
                name="statusText"
                bind:value={customText}
                placeholder="Currently: doing something cool..."
                maxlength="100"
                class="text-input"
              />
            </div>
          </div>

          <div class="form-actions">
            <GlassButton
              type="submit"
              variant="accent"
              disabled={isSubmitting || (!customText && !customEmoji)}
            >
              {isSubmitting ? "Setting..." : "Set Status"}
            </GlassButton>
          </div>
        </div>
      </form>
    {/if}

    <!-- Expiration (shared across both tabs) -->
    <div class="expiration-section">
      <label class="input-label" for="expiration">Auto-clear after</label>
      <select
        id="expiration"
        bind:value={expiresInHours}
        class="select-input"
      >
        {#each expirationOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </GlassCard>
</div>

<style>
  .activitystatus-admin {
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
    font-style: italic;
  }

  /* ─── Current Status ─── */
  :global(.current-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  :global(.current-card) h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .current-status {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .status-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
    border: 1px solid var(--color-border, #e5e7eb);
  }

  .status-emoji {
    font-size: 1.5rem;
    line-height: 1;
  }

  .status-text {
    font-size: 1.05rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .status-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .status-expires {
    font-style: italic;
  }

  :global(.clear-btn) {
    color: hsl(var(--destructive)) !important;
    align-self: flex-start;
  }

  .empty-state {
    text-align: center;
    padding: 1.5rem;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  /* ─── Set Status Card ─── */
  :global(.set-card) {
    padding: 1.5rem !important;
  }

  .tab-row {
    display: flex;
    gap: 0;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .tab-btn {
    padding: 0.75rem 1.25rem;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    color: var(--color-text);
  }

  .tab-btn.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  /* ─── Presets ─── */
  .preset-sections {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .preset-section h4 {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem;
  }

  .preset-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .preset-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    min-height: 2.75rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 999px;
    background: hsl(var(--background));
    color: var(--color-text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .preset-btn:hover {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }

  .preset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .preset-emoji {
    font-size: 1.1rem;
    line-height: 1;
  }

  .preset-text {
    font-weight: 500;
  }

  /* ─── Custom Form ─── */
  .custom-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .custom-row {
    display: flex;
    gap: 0.75rem;
  }

  .emoji-input-group {
    flex: 0 0 5rem;
  }

  .text-input-group {
    flex: 1;
  }

  .input-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .emoji-input {
    width: 100%;
    padding: 0.625rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 1.25rem;
    text-align: center;
    color: var(--color-text);
    background: hsl(var(--background));
  }

  .emoji-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .text-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* ─── Expiration ─── */
  .expiration-section {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .select-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
    cursor: pointer;
  }

  .select-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  @media (max-width: 640px) {
    .custom-row {
      flex-direction: column;
    }

    .emoji-input-group {
      flex: none;
    }

    .tab-row {
      flex-wrap: wrap;
      gap: 0;
    }

    .tab-btn {
      padding: 0.625rem 1rem;
      font-size: 0.9rem;
    }

    .status-meta {
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }
</style>
