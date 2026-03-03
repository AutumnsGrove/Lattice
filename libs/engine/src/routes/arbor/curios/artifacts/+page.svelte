<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Wand2, Plus, Trash2, Eye, Sparkles, Box } from "lucide-svelte";

  let { data, form } = $props();

  let showAddForm = $state(false);
  let selectedType = $state("");

  $effect(() => {
    if (form?.artifactAdded) {
      toast.success("Artifact added");
      showAddForm = false;
      selectedType = "";
    } else if (form?.artifactRemoved) {
      toast.success("Artifact removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });

  const typesByCategory = $derived(() => {
    const grouped: Record<string, typeof data.artifactTypes> = {};
    for (const t of data.artifactTypes) {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    }
    return grouped;
  });

  const categoryLabels: Record<string, string> = {
    mystical: "Mystical",
    interactive: "Interactive",
    classic: "Classic Web",
    nature: "Nature & Atmosphere",
    whimsical: "Personal & Whimsical",
  };

  function getTypeName(type: string): string {
    return data.artifactTypes.find((t) => t.value === type)?.label ?? type;
  }

  function getVisibilityLabel(v: string): string {
    return data.visibilityOptions?.find((o) => o.value === v)?.label ?? v;
  }
</script>

<svelte:head>
  <title>Artifacts - Curios</title>
</svelte:head>

<div class="artifacts-page">
  <header class="page-header">
    <div class="title-row">
      <Wand2 class="header-icon" />
      <h1>Artifacts</h1>
    </div>
    <p class="subtitle">
      A personal cabinet of curiosities. Magic 8-Balls, fortune cookies,
      mood candles, snow globes, and more — small, weird, wonderful things
      that bring your site to life.
    </p>
  </header>

  <section class="add-section">
    {#if !showAddForm}
      <GlassButton variant="accent" onclick={() => (showAddForm = true)}>
        <Plus class="btn-icon" />
        Add Artifact
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>Add an Artifact</h2>
        <form method="POST" action="?/add" use:enhance>
          <!-- Type picker grouped by category -->
          <div class="type-grid">
            {#each Object.entries(typesByCategory()) as [category, types]}
              <div class="category-group">
                <h3 class="category-label">{categoryLabels[category] ?? category}</h3>
                <div class="type-pills">
                  {#each types as type}
                    <label class="type-pill" class:selected={selectedType === type.value}>
                      <input
                        type="radio"
                        name="artifactType"
                        value={type.value}
                        bind:group={selectedType}
                        class="sr-only"
                      />
                      <span class="pill-label">{type.label}</span>
                      <span class="pill-desc">{type.description}</span>
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <!-- Settings row -->
          <div class="form-grid">
            <div class="form-field">
              <label for="placement">Zone</label>
              <select id="placement" name="placement" class="glass-input">
                {#each data.placementOptions as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="visibility">
                <Eye class="field-icon" />
                Visibility
              </label>
              <select id="visibility" name="visibility" class="glass-input">
                {#each data.visibilityOptions ?? [] as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="revealAnimation">
                <Sparkles class="field-icon" />
                Reveal
              </label>
              <select id="revealAnimation" name="revealAnimation" class="glass-input">
                {#each data.revealAnimationOptions ?? [] as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>

            <div class="form-field">
              <label for="container">
                <Box class="field-icon" />
                Container
              </label>
              <select id="container" name="container" class="glass-input">
                {#each data.containerOptions ?? [] as opt}
                  <option value={opt.value}>{opt.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <input type="hidden" name="config" value={"{}"} />

          <div class="form-actions">
            <GlassButton type="submit" variant="accent" disabled={!selectedType}>
              <Plus class="btn-icon" />
              Add
            </GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddForm = false)}>
              Cancel
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <section class="artifacts-list">
    {#if data.artifacts.length === 0}
      <GlassCard class="empty-card">
        <Wand2 class="empty-icon" />
        <p>No artifacts yet.</p>
        <p class="empty-hint">Add some interactive objects to bring your site to life.</p>
      </GlassCard>
    {:else}
      <div class="artifact-cards">
        {#each data.artifacts as artifact}
          <GlassCard class="artifact-card">
            <div class="artifact-header">
              <div class="artifact-info">
                <h3>{getTypeName(artifact.artifactType)}</h3>
                <div class="meta-tags">
                  <span class="meta-tag">{artifact.placement}</span>
                  {#if artifact.visibility !== 'always'}
                    <span class="meta-tag meta-tag--discovery">{getVisibilityLabel(artifact.visibility)}</span>
                  {/if}
                  {#if artifact.container === 'glass-card'}
                    <span class="meta-tag meta-tag--container">Glass card</span>
                  {/if}
                </div>
              </div>
              <form method="POST" action="?/remove" use:enhance>
                <input type="hidden" name="artifactId" value={artifact.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove artifact">
                  <Trash2 class="btn-icon" />
                </GlassButton>
              </form>
            </div>
          </GlassCard>
        {/each}
      </div>
    {/if}
  </section>
</div>

<style>
  .artifacts-page { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; max-width: 600px; }
  .add-section { margin-bottom: 2rem; }
  :global(.add-form-card) { padding: 1.5rem; }
  h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem 0; color: var(--color-text); }
  .category-group { margin-bottom: 1rem; }
  .category-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin: 0 0 0.5rem 0; font-weight: 600; }
  .type-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .type-pill { display: flex; flex-direction: column; padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); cursor: pointer; transition: all 0.2s; background: var(--grove-overlay-4); }
  .type-pill:hover { border-color: var(--color-primary); }
  .type-pill.selected { border-color: var(--color-primary); background: var(--grove-overlay-8); }
  .pill-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text); }
  .pill-desc { font-size: 0.75rem; color: var(--color-text-muted); }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
  .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.75rem; margin-top: 1rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); display: flex; align-items: center; gap: 0.25rem; }
  :global(.field-icon) { width: 0.85rem; height: 0.85rem; opacity: 0.6; }
  .glass-input { padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); background: var(--grove-overlay-4); color: var(--color-text); font-size: 0.9rem; }
  .glass-input:focus { outline: none; border-color: var(--color-primary); }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  :global(.empty-card) { padding: 3rem 1.5rem; text-align: center; }
  :global(.empty-icon) { width: 3rem; height: 3rem; color: var(--color-text-muted); opacity: 0.5; margin-bottom: 1rem; }
  .empty-hint { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; }
  .artifact-cards { display: flex; flex-direction: column; gap: 0.75rem; }
  :global(.artifact-card) { padding: 1rem 1.25rem; }
  .artifact-header { display: flex; justify-content: space-between; align-items: center; }
  .artifact-info { display: flex; flex-direction: column; gap: 0.35rem; }
  .artifact-info h3 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--color-text); }
  .meta-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .meta-tag { font-size: 0.7rem; padding: 0.125rem 0.5rem; background: var(--grove-overlay-8); border-radius: 999px; color: var(--color-text-muted); }
  .meta-tag--discovery { background: rgba(147, 51, 234, 0.12); color: rgb(147, 51, 234); }
  .meta-tag--container { background: rgba(59, 130, 246, 0.12); color: rgb(59, 130, 246); }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
  @media (max-width: 640px) {
    .title-row { flex-wrap: wrap; }
    .form-actions { flex-wrap: wrap; }
    .artifact-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
    .form-grid { grid-template-columns: 1fr; }
  }
</style>
