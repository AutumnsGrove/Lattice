<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Link, ArrowLeft, Plus, Trash2, ExternalLink } from "lucide-svelte";
  import { GARDEN_STYLE_OPTIONS, type LinkGardenStyle } from "$lib/curios/linkgarden";

  let { data, form } = $props();

  // Form state
  let showCreateGarden = $state(false);
  let newGardenTitle = $state("");
  let newGardenStyle = $state<LinkGardenStyle>("list");
  let newGardenDesc = $state("");
  let isSubmitting = $state(false);

  // Add link form state
  let addingLinkToGarden = $state<string | null>(null);
  let newLinkUrl = $state("");
  let newLinkTitle = $state("");
  let newLinkDesc = $state("");
  let newLinkCategory = $state("");

  // Show toast on form result
  $effect(() => {
    if (form?.success && form?.gardenCreated) {
      toast.success("Garden created!");
      showCreateGarden = false;
      newGardenTitle = "";
      newGardenDesc = "";
    } else if (form?.success && form?.gardenDeleted) {
      toast.success("Garden deleted.");
    } else if (form?.success && form?.gardenUpdated) {
      toast.success("Garden updated!");
    } else if (form?.success && form?.linkAdded) {
      toast.success("Link added!");
      addingLinkToGarden = null;
      newLinkUrl = "";
      newLinkTitle = "";
      newLinkDesc = "";
      newLinkCategory = "";
    } else if (form?.success && form?.linkRemoved) {
      toast.success("Link removed.");
    } else if (form?.error) {
      toast.error("Failed", { description: form.error });
    }
  });
</script>

<svelte:head>
  <title>Link Gardens - Admin</title>
</svelte:head>

<div class="linkgarden-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <Link class="header-icon" />
      <h1>Link Gardens</h1>
    </div>
    <p class="subtitle">
      Curated link collections — your blogroll, friends list, cool sites.
    </p>
  </header>

  <!-- Gardens List -->
  <div class="gardens-section">
    <div class="section-header">
      <h3>Your Gardens</h3>
      <GlassButton
        variant="accent"
        onclick={() => (showCreateGarden = !showCreateGarden)}
      >
        <Plus class="w-4 h-4" />
        New Garden
      </GlassButton>
    </div>

    {#if showCreateGarden}
      <GlassCard class="create-card">
        <h4>Create a Garden</h4>
        <form
          method="POST"
          action="?/createGarden"
          use:enhance={() => {
            isSubmitting = true;
            return async ({ update }) => {
              isSubmitting = false;
              await update();
            };
          }}
        >
          <div class="form-grid">
            <div class="input-group">
              <label class="input-label" for="gardenTitle">Title</label>
              <input
                id="gardenTitle"
                type="text"
                name="title"
                bind:value={newGardenTitle}
                placeholder="My Links"
                maxlength="100"
                class="text-input"
                required
              />
            </div>

            <div class="input-group">
              <label class="input-label" for="gardenStyle">Style</label>
              <select
                id="gardenStyle"
                name="style"
                bind:value={newGardenStyle}
                class="select-input"
              >
                {#each GARDEN_STYLE_OPTIONS as option}
                  <option value={option.value}>
                    {option.label} — {option.description}
                  </option>
                {/each}
              </select>
            </div>

            <div class="input-group full-width">
              <label class="input-label" for="gardenDesc">Description <span class="optional">(optional)</span></label>
              <input
                id="gardenDesc"
                type="text"
                name="description"
                bind:value={newGardenDesc}
                placeholder="A collection of sites I love"
                maxlength="300"
                class="text-input"
              />
            </div>
          </div>

          <div class="form-actions">
            <GlassButton
              variant="ghost"
              onclick={() => (showCreateGarden = false)}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="submit"
              variant="accent"
              disabled={isSubmitting || !newGardenTitle.trim()}
            >
              {isSubmitting ? "Creating..." : "Create Garden"}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}

    {#if data.gardens && data.gardens.length > 0}
      {#each data.gardens as garden (garden.id)}
        <GlassCard class="garden-card">
          <div class="garden-header">
            <div class="garden-info">
              <h4>{garden.title}</h4>
              {#if garden.description}
                <p class="garden-desc">{garden.description}</p>
              {/if}
              <span class="garden-meta">
                {GARDEN_STYLE_OPTIONS.find((s) => s.value === garden.style)?.label ?? garden.style}
                &middot;
                {garden.links.length} link{garden.links.length !== 1 ? "s" : ""}
              </span>
            </div>
            <form
              method="POST"
              action="?/deleteGarden"
              use:enhance={({ cancel }) => {
                if (!confirm(`Delete "${garden.title}" and all its links?`)) {
                  cancel();
                  return;
                }
                return async ({ update }) => {
                  await update();
                };
              }}
            >
              <input type="hidden" name="gardenId" value={garden.id} />
              <button
                type="submit"
                class="remove-btn"
                aria-label="Delete garden {garden.title}"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </form>
          </div>

          <!-- Links in this garden -->
          {#if garden.links.length > 0}
            <div class="link-list">
              {#each garden.links as link (link.id)}
                <div class="link-item">
                  <div class="link-info">
                    {#if link.faviconUrl}
                      <img
                        src={link.faviconUrl}
                        alt=""
                        class="link-favicon"
                        width="16"
                        height="16"
                      />
                    {:else}
                      <ExternalLink class="link-favicon-placeholder" />
                    {/if}
                    <div class="link-details">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" class="link-title">
                        {link.title}
                      </a>
                      {#if link.description}
                        <span class="link-desc">{link.description}</span>
                      {/if}
                      {#if link.category}
                        <span class="link-category">{link.category}</span>
                      {/if}
                    </div>
                  </div>
                  <form
                    method="POST"
                    action="?/removeLink"
                    use:enhance={() => {
                      return async ({ update }) => {
                        await update();
                      };
                    }}
                  >
                    <input type="hidden" name="linkId" value={link.id} />
                    <button
                      type="submit"
                      class="remove-btn small"
                      aria-label="Remove {link.title}"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </form>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Add Link -->
          {#if addingLinkToGarden === garden.id}
            <div class="add-link-form">
              <form
                method="POST"
                action="?/addLink"
                use:enhance={() => {
                  isSubmitting = true;
                  return async ({ update }) => {
                    isSubmitting = false;
                    await update();
                  };
                }}
              >
                <input type="hidden" name="gardenId" value={garden.id} />
                <div class="link-form-grid">
                  <div class="input-group">
                    <label class="input-label" for="linkUrl-{garden.id}">URL</label>
                    <input
                      id="linkUrl-{garden.id}"
                      type="url"
                      name="url"
                      bind:value={newLinkUrl}
                      placeholder="https://example.com"
                      class="text-input"
                      required
                    />
                  </div>
                  <div class="input-group">
                    <label class="input-label" for="linkTitle-{garden.id}">Title</label>
                    <input
                      id="linkTitle-{garden.id}"
                      type="text"
                      name="title"
                      bind:value={newLinkTitle}
                      placeholder="Cool Website"
                      maxlength="150"
                      class="text-input"
                    />
                  </div>
                  <div class="input-group">
                    <label class="input-label" for="linkDesc-{garden.id}">Description <span class="optional">(optional)</span></label>
                    <input
                      id="linkDesc-{garden.id}"
                      type="text"
                      name="description"
                      bind:value={newLinkDesc}
                      placeholder="A wonderful corner of the web"
                      maxlength="300"
                      class="text-input"
                    />
                  </div>
                  <div class="input-group">
                    <label class="input-label" for="linkCat-{garden.id}">Category <span class="optional">(optional)</span></label>
                    <input
                      id="linkCat-{garden.id}"
                      type="text"
                      name="category"
                      bind:value={newLinkCategory}
                      placeholder="Friends"
                      maxlength="50"
                      class="text-input"
                    />
                  </div>
                </div>
                <div class="form-actions">
                  <GlassButton
                    variant="ghost"
                    onclick={() => (addingLinkToGarden = null)}
                  >
                    Cancel
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="accent"
                    disabled={isSubmitting || !newLinkUrl.trim()}
                  >
                    {isSubmitting ? "Adding..." : "Add Link"}
                  </GlassButton>
                </div>
              </form>
            </div>
          {:else}
            <button
              class="add-link-btn"
              onclick={() => (addingLinkToGarden = garden.id)}
            >
              <Plus class="w-4 h-4" />
              Add Link
            </button>
          {/if}
        </GlassCard>
      {/each}
    {:else if !showCreateGarden}
      <GlassCard class="empty-card">
        <p class="empty-state">
          No gardens yet. Create one to start curating your links.
        </p>
      </GlassCard>
    {/if}
  </div>
</div>

<style>
  .linkgarden-admin {
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

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.25rem;
  }

  .section-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  /* ─── Create Garden ─── */
  :global(.create-card) {
    padding: 1.5rem !important;
    margin-bottom: 1rem;
  }

  :global(.create-card) h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .full-width {
    grid-column: 1 / -1;
  }

  .input-group {
    display: flex;
    flex-direction: column;
  }

  .input-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.375rem;
  }

  .optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .text-input {
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

  .select-input {
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
    cursor: pointer;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  /* ─── Garden Cards ─── */
  :global(.garden-card) {
    padding: 1.5rem !important;
    margin-bottom: 1rem;
  }

  .garden-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .garden-info h4 {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.25rem;
  }

  .garden-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0 0 0.25rem;
  }

  .garden-meta {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* ─── Link List ─── */
  .link-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .link-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .link-info {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    flex: 1;
  }

  .link-favicon {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  :global(.link-favicon-placeholder) {
    width: 16px;
    height: 16px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .link-details {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .link-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-primary);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-title:hover {
    text-decoration: underline;
  }

  .link-desc {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link-category {
    font-size: 0.7rem;
    color: var(--color-primary);
    font-weight: 500;
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

  .remove-btn.small {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }

  /* ─── Add Link ─── */
  .add-link-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    background: none;
    border: 1px dashed var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    color: var(--color-text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    width: 100%;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .add-link-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }

  .add-link-form {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
  }

  .link-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  /* ─── Empty State ─── */
  :global(.empty-card) {
    padding: 1.5rem !important;
  }

  .empty-state {
    text-align: center;
    padding: 1.5rem;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  @media (max-width: 640px) {
    .form-grid,
    .link-form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
