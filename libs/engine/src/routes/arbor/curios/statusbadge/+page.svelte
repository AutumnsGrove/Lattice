<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Shield, ArrowLeft, Trash2, Plus } from "lucide-svelte";
  import {
    BADGE_DEFINITIONS,
    BADGE_POSITION_OPTIONS,
    formatBadgeDate,
    type StatusBadgeType,
    type BadgePosition,
    type StatusBadgeRecord,
  } from "$lib/curios/statusbadge";

  let { data, form } = $props();

  // Add badge form state
  let selectedBadgeType = $state<StatusBadgeType | "">("");
  let selectedPosition = $state<BadgePosition>("floating");
  let animated = $state(true);
  let customText = $state("");
  let showDate = $state(false);
  let isSubmitting = $state(false);
  let showAddForm = $state(false);

  // Show toast on form result
  $effect(() => {
    if (form?.success && form?.removed) {
      toast.success("Badge removed!");
    } else if (form?.success && form?.updated) {
      toast.success("Badge updated!");
    } else if (form?.success) {
      toast.success("Badge added!");
      showAddForm = false;
      selectedBadgeType = "";
      customText = "";
      showDate = false;
    } else if (form?.error) {
      toast.error("Failed", { description: form.error });
    }
  });

  // Track which badge types are already in use
  const usedBadgeTypes = $derived(
    new Set(data.badges?.map((b: StatusBadgeRecord) => b.badgeType) ?? []),
  );

  // Available badge types (not already in use)
  const availableBadgeTypes = $derived(
    BADGE_DEFINITIONS.filter((def) => !usedBadgeTypes.has(def.type)),
  );

  const selectedDefinition = $derived(
    BADGE_DEFINITIONS.find((d) => d.type === selectedBadgeType),
  );
</script>

<svelte:head>
  <title>Status Badges - Admin</title>
</svelte:head>

<div class="statusbadge-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <Shield class="header-icon" />
      <h1>Status Badges</h1>
    </div>
    <p class="subtitle">
      Small, expressive badges that signal the state of your site.
      A hand-written sign on the shop door.
    </p>
  </header>

  <!-- Active Badges -->
  <GlassCard class="badges-card">
    <div class="section-header">
      <h3>Active Badges</h3>
      {#if availableBadgeTypes.length > 0}
        <GlassButton
          variant="accent"
          onclick={() => (showAddForm = !showAddForm)}
        >
          <Plus class="w-4 h-4" />
          Add Badge
        </GlassButton>
      {/if}
    </div>

    {#if data.badges && data.badges.length > 0}
      <div class="badge-list">
        {#each data.badges as badge (badge.id)}
          {@const def = BADGE_DEFINITIONS.find((d) => d.type === badge.badgeType)}
          <div class="badge-item">
            <div class="badge-info">
              <span class="badge-emoji" aria-hidden="true">
                {def?.emoji ?? "🏷️"}
              </span>
              <div class="badge-details">
                <span class="badge-name">{def?.name ?? badge.badgeType}</span>
                <span class="badge-meta">
                  {BADGE_POSITION_OPTIONS.find((p) => p.value === badge.position)?.label ?? badge.position}
                  {#if badge.animated}
                    &middot; Animated
                  {/if}
                  {#if badge.customText}
                    &middot; "{badge.customText}"
                  {/if}
                </span>
                {#if badge.showDate}
                  <span class="badge-date">Added {formatBadgeDate(badge.createdAt)}</span>
                {/if}
              </div>
            </div>
            <form
              method="POST"
              action="?/remove"
              use:enhance={() => {
                return async ({ update }) => {
                  await update();
                };
              }}
            >
              <input type="hidden" name="id" value={badge.id} />
              <button
                type="submit"
                class="remove-btn"
                aria-label="Remove {def?.name ?? badge.badgeType} badge"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </form>
          </div>
        {/each}
      </div>
    {:else}
      <p class="empty-state">
        No badges yet. Add one to let visitors know what's happening with your site.
      </p>
    {/if}
  </GlassCard>

  <!-- Add Badge Form -->
  {#if showAddForm}
    <GlassCard class="add-card">
      <h3>Add a Badge</h3>

      <form
        method="POST"
        action="?/add"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            await update();
          };
        }}
      >
        <!-- Badge Type Picker -->
        <div class="form-section">
          <h4>Choose a Badge</h4>
          <div class="badge-type-grid">
            {#each availableBadgeTypes as def}
              <label
                class="badge-type-option"
                class:selected={selectedBadgeType === def.type}
              >
                <input
                  type="radio"
                  name="badgeType"
                  value={def.type}
                  bind:group={selectedBadgeType}
                />
                <span class="badge-type-emoji" aria-hidden="true">{def.emoji}</span>
                <span class="badge-type-name">{def.name}</span>
                <span class="badge-type-desc">{def.description}</span>
                {#if def.trigger === "auto"}
                  <span class="badge-type-auto">Auto</span>
                {/if}
              </label>
            {/each}
          </div>
        </div>

        {#if selectedBadgeType}
          <!-- Position -->
          <div class="form-section">
            <h4>Position</h4>
            <div class="position-grid">
              {#each BADGE_POSITION_OPTIONS as option}
                <label
                  class="position-option"
                  class:selected={selectedPosition === option.value}
                >
                  <input
                    type="radio"
                    name="position"
                    value={option.value}
                    bind:group={selectedPosition}
                  />
                  <span class="position-name">{option.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- Options -->
          <div class="form-section">
            <h4>Options</h4>

            <label class="toggle-row">
              <span class="toggle-label">
                <strong>Animate badge</strong>
                <span class="toggle-hint">CSS animation (respects reduced motion)</span>
              </span>
              <input
                type="checkbox"
                name="animated"
                value="true"
                bind:checked={animated}
                class="toggle-input"
              />
            </label>

            <label class="toggle-row">
              <span class="toggle-label">
                <strong>Show date</strong>
                <span class="toggle-hint">Display when the badge was added</span>
              </span>
              <input
                type="checkbox"
                name="showDate"
                value="true"
                bind:checked={showDate}
                class="toggle-input"
              />
            </label>
          </div>

          <!-- Custom Text -->
          <div class="form-section">
            <h4>Custom Text <span class="optional">(optional)</span></h4>
            <div class="input-group">
              <label class="input-label" for="customText">
                Override the default badge label
              </label>
              <input
                id="customText"
                type="text"
                name="customText"
                bind:value={customText}
                placeholder={selectedDefinition?.name ?? ""}
                maxlength="80"
                class="text-input"
              />
              <span class="char-count">{customText.length}/80</span>
            </div>
          </div>

          <!-- Hidden fields for checkbox state -->
          {#if !animated}
            <input type="hidden" name="animated" value="false" />
          {/if}

          <!-- Preview -->
          <div class="preview-section">
            <h4>Preview</h4>
            <div class="badge-preview" class:animated>
              <span class="preview-emoji" aria-hidden="true">
                {selectedDefinition?.emoji ?? "🏷️"}
              </span>
              <span class="preview-label">
                {customText || (selectedDefinition?.name ?? "Badge")}
              </span>
            </div>
          </div>

          <div class="form-actions">
            <GlassButton
              variant="ghost"
              onclick={() => {
                showAddForm = false;
                selectedBadgeType = "";
              }}
            >
              Cancel
            </GlassButton>
            <GlassButton type="submit" variant="accent" disabled={isSubmitting || !selectedBadgeType}>
              {isSubmitting ? "Adding..." : "Add Badge"}
            </GlassButton>
          </div>
        {/if}
      </form>
    </GlassCard>
  {/if}
</div>

<style>
  .statusbadge-admin {
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

  /* ─── Active Badges ─── */
  :global(.badges-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .section-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  .badge-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .badge-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .badge-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .badge-emoji {
    font-size: 1.75rem;
    line-height: 1;
  }

  .badge-details {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .badge-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text);
  }

  .badge-meta {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .badge-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    background: none;
    border: 1px solid transparent;
    border-radius: 0.5rem;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .remove-btn:hover {
    color: hsl(var(--destructive));
    background: hsl(var(--destructive) / 0.1);
    border-color: hsl(var(--destructive) / 0.2);
  }

  :global(.dark) .remove-btn:hover {
    background: rgb(127 29 29 / 0.3);
    border-color: rgb(127 29 29 / 0.4);
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  /* ─── Add Badge Form ─── */
  :global(.add-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  :global(.add-card) h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1.25rem;
  }

  .form-section {
    margin-bottom: 1.75rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .form-section:last-of-type {
    border-bottom: none;
  }

  .form-section h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  .optional {
    font-weight: 400;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  /* Badge Type Grid */
  .badge-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .badge-type-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
    padding: 1rem 0.75rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .badge-type-option:hover {
    border-color: var(--color-primary);
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
  }

  .badge-type-option.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .badge-type-option input[type="radio"] {
    display: none;
  }

  .badge-type-emoji {
    font-size: 1.75rem;
    line-height: 1;
  }

  .badge-type-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  .badge-type-desc {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    line-height: 1.3;
  }

  .badge-type-auto {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }

  /* Position Grid */
  .position-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .position-option {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .position-option:hover {
    border-color: var(--color-primary);
  }

  .position-option.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .position-option input[type="radio"] {
    display: none;
  }

  .position-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
  }

  /* Toggle Rows */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
    padding: 0.5rem 0;
  }

  .toggle-row + .toggle-row {
    border-top: 1px solid var(--color-border, #e5e7eb);
    padding-top: 0.75rem;
    margin-top: 0.25rem;
  }

  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .toggle-hint {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .toggle-input {
    width: 2.5rem;
    height: 1.25rem;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  /* Input */
  .input-group {
    position: relative;
  }

  .input-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }

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

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .char-count {
    display: block;
    text-align: right;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 0.25rem;
  }

  /* Preview */
  .preview-section {
    margin-bottom: 1.5rem;
  }

  .preview-section h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  .badge-preview {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 999px;
    background: var(--grove-overlay-8, rgba(0, 0, 0, 0.06));
    border: 1px solid var(--color-border, #e5e7eb);
  }

  .badge-preview.animated {
    animation: badge-pulse 2s ease-in-out infinite;
  }

  @keyframes badge-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.03); }
  }

  @media (prefers-reduced-motion: reduce) {
    .badge-preview.animated {
      animation: none;
    }
  }

  .preview-emoji {
    font-size: 1.25rem;
    line-height: 1;
  }

  .preview-label {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  @media (max-width: 640px) {
    .section-header {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .badge-item {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .badge-info {
      width: 100%;
      justify-content: space-between;
    }

    .remove-btn {
      align-self: flex-end;
    }

    .badge-type-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .position-grid {
      grid-template-columns: 1fr;
    }

    .toggle-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .toggle-input {
      width: 2rem;
      height: 1rem;
    }
  }

  @media (max-width: 400px) {
    .badge-type-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
