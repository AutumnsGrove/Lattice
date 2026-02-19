<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Globe, ArrowLeft, ArrowRight, Home, Plus, Trash2, ExternalLink } from "lucide-svelte";

  let { data, form } = $props();

  let showAddForm = $state(false);

  // Handle form results
  $effect(() => {
    if (form?.ringAdded) {
      toast.success("Webring added");
      showAddForm = false;
    } else if (form?.ringUpdated) {
      toast.success("Webring updated");
    } else if (form?.ringRemoved) {
      toast.success("Webring removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Webring Hub - Curios</title>
</svelte:head>

<div class="webring-page">
  <header class="page-header">
    <div class="title-row">
      <Globe class="header-icon" />
      <h1>Webring Hub</h1>
    </div>
    <p class="subtitle">
      Join webrings and connect your site to the wider indie web.
      Add your ring memberships and choose how they appear.
    </p>
  </header>

  <!-- Add Ring Form -->
  <section class="add-section">
    {#if !showAddForm}
      <GlassButton variant="accent" onclick={() => (showAddForm = true)}>
        <Plus class="btn-icon" />
        Join a Webring
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>Join a Webring</h2>
        <form method="POST" action="?/add" use:enhance>
          <div class="form-grid">
            <div class="form-field">
              <label for="ringName">Ring Name</label>
              <input
                type="text"
                id="ringName"
                name="ringName"
                placeholder="IndieWeb Ring"
                required
                maxlength="100"
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="ringUrl">Ring Homepage <span class="optional">(optional)</span></label>
              <input
                type="url"
                id="ringUrl"
                name="ringUrl"
                placeholder="https://webring.example.com"
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="prevUrl">Previous Site URL</label>
              <input
                type="url"
                id="prevUrl"
                name="prevUrl"
                placeholder="https://prev-site.example.com"
                required
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="nextUrl">Next Site URL</label>
              <input
                type="url"
                id="nextUrl"
                name="nextUrl"
                placeholder="https://next-site.example.com"
                required
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="homeUrl">Ring Hub URL <span class="optional">(optional)</span></label>
              <input
                type="url"
                id="homeUrl"
                name="homeUrl"
                placeholder="https://webring.example.com/list"
                class="glass-input"
              />
            </div>

            <div class="form-field">
              <label for="badgeStyle">Display Style</label>
              <select id="badgeStyle" name="badgeStyle" class="glass-input">
                {#each data.badgeStyleOptions as option}
                  <option value={option.value}>{option.label} — {option.description}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="position">Position</label>
              <select id="position" name="position" class="glass-input">
                {#each data.positionOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="form-actions">
            <GlassButton type="submit" variant="accent">
              <Plus class="btn-icon" />
              Add Ring
            </GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddForm = false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <!-- Ring List -->
  <section class="rings-section">
    {#if data.webrings.length === 0}
      <GlassCard class="empty-card">
        <Globe class="empty-icon" />
        <p>No webring memberships yet.</p>
        <p class="empty-hint">Join a webring to connect your site to the indie web.</p>
      </GlassCard>
    {:else}
      <div class="rings-list">
        {#each data.webrings as ring}
          <GlassCard class="ring-card">
            <div class="ring-header">
              <div class="ring-info">
                <h3>{ring.ringName}</h3>
                {#if ring.ringUrl}
                  <a href={ring.ringUrl} target="_blank" rel="noopener noreferrer" class="ring-link">
                    <ExternalLink class="link-icon" />
                    Ring Homepage
                  </a>
                {/if}
              </div>
              <form method="POST" action="?/remove" use:enhance>
                <input type="hidden" name="ringId" value={ring.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove ring" aria-label="Remove ring">
                  <Trash2 class="btn-icon" />
                </GlassButton>
              </form>
            </div>

            <!-- Navigation Preview -->
            <div class="ring-nav-preview" class:badge-style={ring.badgeStyle === "badge"} class:compact-style={ring.badgeStyle === "compact"}>
              <a href={ring.prevUrl} target="_blank" rel="noopener noreferrer" class="nav-link prev" title="Previous site">
                <ArrowLeft class="nav-icon" />
                Prev
              </a>
              {#if ring.homeUrl}
                <a href={ring.homeUrl} target="_blank" rel="noopener noreferrer" class="nav-link home" title="Ring hub">
                  <Home class="nav-icon" />
                </a>
              {/if}
              <span class="ring-label">{ring.ringName}</span>
              <a href={ring.nextUrl} target="_blank" rel="noopener noreferrer" class="nav-link next" title="Next site">
                Next
                <ArrowRight class="nav-icon" />
              </a>
            </div>

            <div class="ring-meta">
              <span class="meta-tag">{ring.badgeStyle}</span>
              <span class="meta-tag">{ring.position}</span>
            </div>
          </GlassCard>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .webring-page {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
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
    font-size: 0.95rem;
    line-height: 1.6;
    max-width: 600px;
  }

  .add-section {
    margin-bottom: 2rem;
  }

  :global(.add-form-card) {
    padding: 1.5rem;
  }

  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 1.25rem 0;
    color: var(--color-text);
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .form-field label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-muted);
  }

  .optional {
    font-weight: 400;
    opacity: 0.7;
  }

  .glass-input {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--grove-overlay-12);
    border-radius: var(--border-radius-standard);
    background: var(--grove-overlay-4);
    color: var(--color-text);
    font-size: 0.9rem;
    transition: border-color 0.2s;
  }

  .glass-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }

  .rings-section {
    margin-bottom: 2rem;
  }

  :global(.empty-card) {
    padding: 3rem 1.5rem;
    text-align: center;
  }

  :global(.empty-icon) {
    width: 3rem;
    height: 3rem;
    color: var(--color-text-muted);
    opacity: 0.5;
    margin-bottom: 1rem;
  }

  .empty-hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  .rings-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  :global(.ring-card) {
    padding: 1.25rem;
  }

  .ring-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }

  .ring-info h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.25rem 0;
    color: var(--color-text);
  }

  .ring-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--color-primary);
    text-decoration: none;
  }

  .ring-link:hover {
    text-decoration: underline;
  }

  :global(.link-icon) {
    width: 0.75rem;
    height: 0.75rem;
  }

  :global(.remove-btn) {
    min-width: 2.75rem;
    min-height: 2.75rem;
  }

  .ring-nav-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--grove-overlay-4);
    border: 1px solid var(--grove-overlay-8);
    border-radius: var(--border-radius-standard);
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
  }

  .nav-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius-standard);
    transition: background 0.2s;
  }

  .nav-link:hover {
    background: var(--grove-overlay-8);
  }

  :global(.nav-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .ring-label {
    color: var(--color-text);
    font-weight: 500;
  }

  .ring-meta {
    display: flex;
    gap: 0.5rem;
  }

  .meta-tag {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    background: var(--grove-overlay-8);
    border-radius: 999px;
    color: var(--color-text-muted);
  }

  @media (max-width: 640px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
