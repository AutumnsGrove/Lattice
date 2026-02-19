<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, Badge, toast } from "$lib/ui/components/ui";
  import { Heart, Plus, Trash2, Eye, EyeOff } from "lucide-svelte";

  let { data, form } = $props();

  let showAddForm = $state(false);

  $effect(() => {
    if (form?.shrineAdded) {
      toast.success("Shrine created");
      showAddForm = false;
    } else if (form?.publishToggled) {
      toast.success("Shrine visibility updated");
    } else if (form?.shrineRemoved) {
      toast.success("Shrine removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Personal Shrines - Curios</title>
</svelte:head>

<div class="shrines-page">
  <header class="page-header">
    <div class="title-row">
      <Heart class="header-icon" />
      <h1>Personal Shrines</h1>
    </div>
    <p class="subtitle">
      Sacred spaces for things you love — never performative, always sincere.
      Dedicate them to memories, fandoms, or gratitude.
    </p>
  </header>

  <section class="add-section">
    {#if !showAddForm}
      <GlassButton variant="accent" onclick={() => (showAddForm = true)}>
        <Plus class="btn-icon" />
        Create a Shrine
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>New Shrine</h2>
        <form method="POST" action="?/add" use:enhance>
          <div class="form-grid">
            <div class="form-field full-width">
              <label for="title">Title</label>
              <input type="text" id="title" name="title" placeholder="A shrine for..." required maxlength="100" class="glass-input" />
            </div>

            <div class="form-field">
              <label for="shrineType">Type</label>
              <select id="shrineType" name="shrineType" class="glass-input" required>
                {#each data.shrineTypeOptions as option}
                  <option value={option.value}>{option.label} — {option.description}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="size">Size</label>
              <select id="size" name="size" class="glass-input" required>
                {#each data.sizeOptions as option}
                  <option value={option.value}>{option.label} ({option.dimensions})</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="frameStyle">Frame Style</label>
              <select id="frameStyle" name="frameStyle" class="glass-input" required>
                {#each data.frameStyleOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="description">Description <span class="optional">(optional)</span></label>
              <input type="text" id="description" name="description" placeholder="What this shrine means to you" maxlength="500" class="glass-input" />
            </div>
          </div>

          <div class="form-actions">
            <GlassButton type="submit" variant="accent">
              <Plus class="btn-icon" />
              Create Shrine
            </GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddForm = false)}>Cancel</GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <section class="shrines-section">
    {#if data.shrines.length === 0}
      <GlassCard class="empty-card">
        <Heart class="empty-icon" />
        <p>No shrines yet.</p>
        <p class="empty-hint">Create a shrine to dedicate space for something meaningful.</p>
      </GlassCard>
    {:else}
      <div class="shrine-list">
        {#each data.shrines as shrine}
          <GlassCard class="shrine-card">
            <div class="shrine-header">
              <div>
                <h3>{shrine.title}</h3>
                <div class="shrine-meta">
                  <Badge variant="secondary">{shrine.shrineType}</Badge>
                  <span class="meta-detail">{shrine.size} &middot; {shrine.frameStyle}</span>
                  {#if shrine.isPublished}
                    <Badge variant="default">Published</Badge>
                  {:else}
                    <Badge variant="secondary">Draft</Badge>
                  {/if}
                </div>
                {#if shrine.description}
                  <p class="shrine-description">{shrine.description}</p>
                {/if}
              </div>
              <div class="shrine-actions">
                <form method="POST" action="?/togglePublish" use:enhance>
                  <input type="hidden" name="shrineId" value={shrine.id} />
                  <input type="hidden" name="isPublished" value={String(shrine.isPublished)} />
                  <GlassButton type="submit" variant="ghost" title={shrine.isPublished ? "Unpublish" : "Publish"} aria-label={shrine.isPublished ? "Unpublish shrine" : "Publish shrine"}>
                    {#if shrine.isPublished}
                      <EyeOff class="btn-icon" />
                    {:else}
                      <Eye class="btn-icon" />
                    {/if}
                  </GlassButton>
                </form>
                <form method="POST" action="?/remove" use:enhance>
                  <input type="hidden" name="shrineId" value={shrine.id} />
                  <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove shrine" aria-label="Remove shrine">
                    <Trash2 class="btn-icon" />
                  </GlassButton>
                </form>
              </div>
            </div>
            <div class="shrine-contents-info">
              {shrine.contents.length} item{shrine.contents.length !== 1 ? "s" : ""} placed
            </div>
          </GlassCard>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .shrines-page { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; max-width: 600px; }
  .add-section { margin-bottom: 2rem; }
  :global(.add-form-card) { padding: 1.5rem; }
  :global(.empty-card) { padding: 3rem 1.5rem; text-align: center; }
  :global(.empty-icon) { width: 3rem; height: 3rem; color: var(--color-text-muted); opacity: 0.5; margin-bottom: 1rem; }
  .empty-hint { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; }
  h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem 0; color: var(--color-text); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .full-width { grid-column: 1 / -1; }
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); }
  .optional { font-weight: 400; opacity: 0.7; }
  .glass-input { padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); background: var(--grove-overlay-4); color: var(--color-text); font-size: 0.9rem; }
  .glass-input:focus { outline: none; border-color: var(--color-primary); }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  .shrine-list { display: flex; flex-direction: column; gap: 0.75rem; }
  :global(.shrine-card) { padding: 1.25rem; }
  .shrine-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .shrine-header h3 { font-size: 1.1rem; font-weight: 600; margin: 0; color: var(--color-text); }
  .shrine-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.375rem; }
  .meta-detail { font-size: 0.8rem; color: var(--color-text-muted); }
  .shrine-description { font-size: 0.85rem; color: var(--color-text-muted); margin: 0.375rem 0 0; }
  .shrine-actions { display: flex; gap: 0.25rem; }
  .shrine-contents-info { font-size: 0.8rem; color: var(--color-text-muted); margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--grove-overlay-8); }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .title-row { flex-wrap: wrap; }
    .shrine-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
    .shrine-actions { flex-wrap: wrap; }
  }
</style>
