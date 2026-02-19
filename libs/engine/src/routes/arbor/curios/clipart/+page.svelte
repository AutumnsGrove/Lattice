<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Sticker, Plus, Trash2 } from "lucide-svelte";

  let { data, form } = $props();

  let showAddForm = $state(false);

  $effect(() => {
    if (form?.placementAdded) {
      toast.success("Clip art placed");
      showAddForm = false;
    } else if (form?.placementRemoved) {
      toast.success("Clip art removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });

  // Group placements by page
  let placementsByPage = $derived(() => {
    const groups = new Map<string, typeof data.placements>();
    for (const p of data.placements) {
      const list = groups.get(p.pagePath) || [];
      list.push(p);
      groups.set(p.pagePath, list);
    }
    return groups;
  });
</script>

<svelte:head>
  <title>Clip Art Library - Curios</title>
</svelte:head>

<div class="clipart-page">
  <header class="page-header">
    <div class="title-row">
      <Sticker class="header-icon" />
      <h1>Clip Art Library</h1>
    </div>
    <p class="subtitle">
      Decorative overlays you can place on any page —
      borders, critters, sparkles, and more.
    </p>
  </header>

  <section class="add-section">
    {#if !showAddForm}
      <GlassButton variant="accent" onclick={() => (showAddForm = true)}>
        <Plus class="btn-icon" />
        Place Clip Art
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>Place Clip Art</h2>
        <form method="POST" action="?/add" use:enhance>
          <div class="form-grid">
            <div class="form-field">
              <label for="assetId">Asset ID</label>
              <input type="text" id="assetId" name="assetId" placeholder="foliage-vine-01" required class="glass-input" />
            </div>
            <div class="form-field">
              <label for="pagePath">Page Path</label>
              <input type="text" id="pagePath" name="pagePath" value="/" placeholder="/" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="xPosition">X Position (%)</label>
              <input type="number" id="xPosition" name="xPosition" value="50" min="0" max="100" step="1" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="yPosition">Y Position (%)</label>
              <input type="number" id="yPosition" name="yPosition" value="50" min="0" max="100" step="1" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="scale">Scale</label>
              <input type="number" id="scale" name="scale" value="1.0" min="0.25" max="3.0" step="0.25" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="rotation">Rotation (degrees)</label>
              <input type="number" id="rotation" name="rotation" value="0" min="0" max="360" step="1" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="zIndex">Z-Index</label>
              <input type="number" id="zIndex" name="zIndex" value="10" min="1" max="100" class="glass-input" />
            </div>
          </div>
          <div class="form-actions">
            <GlassButton type="submit" variant="accent">
              <Plus class="btn-icon" />
              Place
            </GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddForm = false)}>Cancel</GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <section class="placements-section">
    {#if data.placements.length === 0}
      <GlassCard class="empty-card">
        <Sticker class="empty-icon" />
        <p>No clip art placed yet.</p>
        <p class="empty-hint">Add decorative elements to make your pages come alive.</p>
      </GlassCard>
    {:else}
      <div class="placement-list">
        {#each data.placements as placement}
          <GlassCard class="placement-card">
            <div class="placement-header">
              <div class="placement-info">
                <span class="placement-asset">{placement.assetId}</span>
                <span class="placement-meta">
                  {placement.pagePath} &middot;
                  ({placement.xPosition}%, {placement.yPosition}%) &middot;
                  {placement.scale}x &middot; {placement.rotation}&deg; &middot;
                  z{placement.zIndex}
                </span>
              </div>
              <form method="POST" action="?/remove" use:enhance>
                <input type="hidden" name="placementId" value={placement.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove" aria-label="Remove clip art">
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
  .clipart-page { max-width: 800px; margin: 0 auto; }
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
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); }
  .glass-input { padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); background: var(--grove-overlay-4); color: var(--color-text); font-size: 0.9rem; }
  .glass-input:focus { outline: none; border-color: var(--color-primary); }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  .placement-list { display: flex; flex-direction: column; gap: 0.5rem; }
  :global(.placement-card) { padding: 0.75rem 1rem; }
  .placement-header { display: flex; justify-content: space-between; align-items: center; }
  .placement-asset { font-weight: 600; font-size: 0.9rem; color: var(--color-text); }
  .placement-meta { font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-top: 0.125rem; }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
  @media (max-width: 640px) { .form-grid { grid-template-columns: 1fr; } }
</style>
