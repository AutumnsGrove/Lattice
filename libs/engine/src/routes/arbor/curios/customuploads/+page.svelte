<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Upload, Trash2, Image } from "lucide-svelte";

  let { data, form } = $props();

  $effect(() => {
    if (form?.uploadRemoved) {
      toast.success("Upload removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Custom Uploads - Curios</title>
</svelte:head>

<div class="uploads-page">
  <header class="page-header">
    <div class="title-row">
      <Upload class="header-icon" />
      <h1>Custom Uploads</h1>
    </div>
    <p class="subtitle">
      Manage your uploaded images — used by cursors, shrines, badges, and other curios.
    </p>
  </header>

  <GlassCard class="quota-card">
    <div class="quota-info">
      <span class="quota-label">Upload Quota</span>
      <span class="quota-value">{data.quota.used} / {data.quota.max}</span>
    </div>
    <div class="quota-bar">
      <div class="quota-fill" style="width: {(data.quota.used / data.quota.max) * 100}%"></div>
    </div>
    <p class="quota-hint">Max file size: {data.quota.maxFileSize}</p>
  </GlassCard>

  <section class="uploads-section">
    {#if data.uploads.length === 0}
      <GlassCard class="empty-card">
        <Image class="empty-icon" />
        <p>No uploads yet.</p>
        <p class="empty-hint">Upload images to use them across your curios. Supported: PNG, GIF, WebP, SVG.</p>
      </GlassCard>
    {:else}
      <div class="upload-list">
        {#each data.uploads as upload}
          <GlassCard class="upload-card">
            <div class="upload-header">
              <div class="upload-info">
                <span class="upload-filename">{upload.originalFilename}</span>
                <span class="upload-meta">
                  {upload.mimeType} &middot; {upload.fileSizeFormatted}
                  {#if upload.width && upload.height}
                    &middot; {upload.width}&times;{upload.height}
                  {/if}
                  {#if upload.usageCount > 0}
                    &middot; Used {upload.usageCount} time{upload.usageCount !== 1 ? "s" : ""}
                  {/if}
                </span>
              </div>
              <form method="POST" action="?/remove" use:enhance>
                <input type="hidden" name="uploadId" value={upload.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove upload" aria-label="Remove upload">
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
  .uploads-page { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; max-width: 600px; }
  :global(.quota-card) { padding: 1.25rem; margin-bottom: 2rem; }
  .quota-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
  .quota-label { font-size: 0.85rem; font-weight: 500; color: var(--color-text); }
  .quota-value { font-size: 0.85rem; font-weight: 600; color: var(--color-primary); }
  .quota-bar { width: 100%; height: 6px; background: var(--grove-overlay-8); border-radius: 3px; overflow: hidden; }
  .quota-fill { height: 100%; background: var(--color-primary); border-radius: 3px; transition: width 0.3s ease; }
  .quota-hint { font-size: 0.8rem; color: var(--color-text-muted); margin: 0.5rem 0 0; }
  :global(.empty-card) { padding: 3rem 1.5rem; text-align: center; }
  :global(.empty-icon) { width: 3rem; height: 3rem; color: var(--color-text-muted); opacity: 0.5; margin-bottom: 1rem; }
  .empty-hint { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; }
  .upload-list { display: flex; flex-direction: column; gap: 0.5rem; }
  :global(.upload-card) { padding: 0.75rem 1rem; }
  .upload-header { display: flex; justify-content: space-between; align-items: center; }
  .upload-filename { font-weight: 500; font-size: 0.9rem; color: var(--color-text); }
  .upload-meta { font-size: 0.8rem; color: var(--color-text-muted); display: block; margin-top: 0.125rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
</style>
