<script lang="ts">
  import type { PageData, ActionData } from "./$types";
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, Badge, Waystone, GroveSwap } from "$lib/ui/components/ui";
  import {
    Image,
    Settings2,
    Cloud,
    Layout,
    Palette,
    ChevronLeft,
    Save,
    AlertCircle,
    CheckCircle2,
    Tags,
    FolderOpen,
    RefreshCw,
  } from "lucide-svelte";

  const { data, form }: { data: PageData; form: ActionData } = $props();

  // Form state - initialized and synced with data via $effect
  let enabled = $state(false);
  let r2Bucket = $state("");
  let cdnBaseUrl = $state("");
  let galleryTitle = $state("");
  let galleryDescription = $state("");
  let itemsPerPage = $state(30);
  let sortOrder = $state("date-desc");
  let showDescriptions = $state(true);
  let showDates = $state(true);
  let showTags = $state(true);
  let enableLightbox = $state(true);
  let enableSearch = $state(true);
  let enableFilters = $state(true);
  let gridStyle = $state("masonry");
  let thumbnailSize = $state("medium");
  let customCss = $state("");

  // Sync form state when data changes (e.g., after form submission)
  $effect(() => {
    if (data.config) {
      enabled = data.config.enabled ?? false;
      r2Bucket = data.config.r2Bucket ?? "";
      cdnBaseUrl = data.config.cdnBaseUrl ?? "";
      galleryTitle = data.config.galleryTitle ?? "";
      galleryDescription = data.config.galleryDescription ?? "";
      itemsPerPage = data.config.itemsPerPage ?? 30;
      sortOrder = data.config.sortOrder ?? "date-desc";
      showDescriptions = data.config.showDescriptions ?? true;
      showDates = data.config.showDates ?? true;
      showTags = data.config.showTags ?? true;
      enableLightbox = data.config.enableLightbox ?? true;
      enableSearch = data.config.enableSearch ?? true;
      enableFilters = data.config.enableFilters ?? true;
      gridStyle = data.config.gridStyle ?? "masonry";
      thumbnailSize = data.config.thumbnailSize ?? "medium";
      customCss = data.config.customCss ?? "";
    }
  });

  // UI state
  let isSubmitting = $state(false);
</script>

<svelte:head>
  <title>Gallery Curio - Admin</title>
</svelte:head>

<div class="gallery-config">
  <header class="page-header">
    <a href="/arbor/curios" class="back-link">
      <ChevronLeft class="back-icon" />
      <span>Back to Curios</span>
    </a>

    <div class="header-content">
      <div class="title-row">
        <Image class="header-icon" />
        <h1>Gallery</h1>
        <Waystone slug="what-is-gallery" label="Learn about Gallery" />
        <Badge variant={enabled ? "default" : "secondary"}>
          {enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>
      <p class="subtitle">
        A beautiful image gallery powered by Amber storage.
        Display your photos with filtering, tags, and lightbox viewing.
      </p>
    </div>
  </header>

  <!-- Stats -->
  <div class="stats-row">
    <GlassCard class="stat-card">
      <Image class="stat-icon" />
      <div class="stat-content">
        <span class="stat-value">{data.stats.imageCount}</span>
        <span class="stat-label">Images</span>
      </div>
    </GlassCard>

    <GlassCard class="stat-card">
      <Tags class="stat-icon" />
      <div class="stat-content">
        <span class="stat-value">{data.stats.tagCount}</span>
        <span class="stat-label">Tags</span>
      </div>
    </GlassCard>

    <GlassCard class="stat-card">
      <FolderOpen class="stat-icon" />
      <div class="stat-content">
        <span class="stat-value">{data.stats.collectionCount}</span>
        <span class="stat-label">Collections</span>
      </div>
    </GlassCard>
  </div>

  {#if form?.error}
    <div class="alert alert-error">
      <AlertCircle class="alert-icon" />
      <span>{form.error}</span>
    </div>
  {/if}

  {#if form?.success}
    <div class="alert alert-success">
      <CheckCircle2 class="alert-icon" />
      <span>Configuration saved successfully!</span>
    </div>
  {/if}

  <form
    method="POST"
    action="?/save"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ update }) => {
        await update();
        isSubmitting = false;
      };
    }}
  >
    <!-- Enable/Disable Toggle -->
    <GlassCard class="config-section">
      <div class="section-header">
        <Settings2 class="section-icon" />
        <h2>General</h2>
      </div>

      <div class="toggle-row">
        <label class="toggle-label">
          <input
            type="checkbox"
            name="enabled"
            value="true"
            bind:checked={enabled}
            class="toggle-input"
          />
          <span class="toggle-switch"></span>
          <span class="toggle-text">Enable Gallery</span>
        </label>
        <p class="field-help">
          When enabled, the gallery page will be publicly accessible.
        </p>
      </div>

      <div class="field-group">
        <label for="galleryTitle" class="field-label">Gallery Title</label>
        <input
          type="text"
          id="galleryTitle"
          name="galleryTitle"
          bind:value={galleryTitle}
          placeholder="Gallery"
          class="field-input"
        />
        <p class="field-help">
          The title displayed at the top of your gallery page.
        </p>
      </div>

      <div class="field-group">
        <label for="galleryDescription" class="field-label">Description</label>
        <textarea
          id="galleryDescription"
          name="galleryDescription"
          bind:value={galleryDescription}
          placeholder="A collection of photos and memories..."
          class="field-textarea"
          rows="2"
        ></textarea>
        <p class="field-help">
          Optional subtitle shown below the gallery title.
        </p>
      </div>
    </GlassCard>

    <!-- Storage Configuration -->
    <GlassCard class="config-section">
      <div class="section-header">
        <Cloud class="section-icon" />
        <h2>Storage</h2>
      </div>

      <div class="sync-section-top">
        <a href="/arbor/curios/gallery/sync" class="sync-link">
          <RefreshCw class="sync-icon" />
          <span>Sync images from Amber</span>
        </a>
        <p class="field-help">
          Import new images you've uploaded to your Amber storage into the gallery.
          This scans for new files and adds them to your gallery database.
        </p>
      </div>

      <!-- Advanced Storage Settings -->
      <details class="advanced-section">
        <summary class="advanced-toggle">
          <AlertCircle class="warning-icon-small" />
          <span>Advanced Storage Settings</span>
        </summary>

        <div class="advanced-warning">
          <AlertCircle class="warning-icon" />
          <div>
            <strong>For power users only</strong>
            <p>
              These settings are pre-configured for most <GroveSwap term="wanderer" standard="visitors">Wanderers</GroveSwap>. Changing them
              incorrectly can break your gallery or cause images not to load.
              Only modify if you have your own CDN or storage setup.
            </p>
          </div>
        </div>

        <div class="field-group">
          <label for="cdnBaseUrl" class="field-label">
            CDN Base URL
          </label>
          <input
            type="text"
            id="cdnBaseUrl"
            name="cdnBaseUrl"
            bind:value={cdnBaseUrl}
            placeholder="https://cdn.grove.place"
            class="field-input"
          />
          <p class="field-help">
            Where your images are served from. The default (<code>cdn.grove.place</code>)
            works for all <GroveSwap term="wanderer" standard="visitors">Wanderers</GroveSwap>. Only change this if you have your own CDN
            that you control and can upload to.
          </p>
          <p class="field-help field-warning">
            ⚠️ Using a CDN you don't control will break your images. We can't
            back up images stored elsewhere, so you're responsible for that storage.
          </p>
        </div>

        <div class="field-group">
          <label for="r2Bucket" class="field-label">Storage Bucket</label>
          <input
            type="text"
            id="r2Bucket"
            name="r2Bucket"
            bind:value={r2Bucket}
            placeholder="grove-media"
            class="field-input"
          />
          <p class="field-help">
            The Amber storage bucket for your images. Leave this alone unless
            you have a specific reason to change it.
          </p>
        </div>
      </details>
    </GlassCard>

    <!-- Display Settings -->
    <GlassCard class="config-section">
      <div class="section-header">
        <Layout class="section-icon" />
        <h2>Display</h2>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="gridStyle" class="field-label">Grid Style</label>
          <select
            id="gridStyle"
            name="gridStyle"
            bind:value={gridStyle}
            class="field-select"
          >
            {#each data.gridStyles as style}
              <option value={style.value}>{style.label}</option>
            {/each}
          </select>
        </div>

        <div class="field-group">
          <label for="sortOrder" class="field-label">Sort Order</label>
          <select
            id="sortOrder"
            name="sortOrder"
            bind:value={sortOrder}
            class="field-select"
          >
            {#each data.sortOrders as order}
              <option value={order.value}>{order.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="thumbnailSize" class="field-label">Thumbnail Size</label>
          <select
            id="thumbnailSize"
            name="thumbnailSize"
            bind:value={thumbnailSize}
            class="field-select"
          >
            {#each data.thumbnailSizes as size}
              <option value={size.value}>{size.label}</option>
            {/each}
          </select>
        </div>

        <div class="field-group">
          <label for="itemsPerPage" class="field-label">Items per Page</label>
          <input
            type="number"
            id="itemsPerPage"
            name="itemsPerPage"
            bind:value={itemsPerPage}
            min="10"
            max="100"
            class="field-input"
          />
        </div>
      </div>
    </GlassCard>

    <!-- Features -->
    <GlassCard class="config-section">
      <div class="section-header">
        <Palette class="section-icon" />
        <h2>Features</h2>
      </div>

      <div class="checkbox-grid">
        <label class="checkbox-option">
          <input
            type="checkbox"
            name="showDescriptions"
            value="true"
            bind:checked={showDescriptions}
          />
          <span class="checkbox-label">Show descriptions</span>
        </label>

        <label class="checkbox-option">
          <input
            type="checkbox"
            name="showDates"
            value="true"
            bind:checked={showDates}
          />
          <span class="checkbox-label">Show dates</span>
        </label>

        <label class="checkbox-option">
          <input
            type="checkbox"
            name="showTags"
            value="true"
            bind:checked={showTags}
          />
          <span class="checkbox-label">Show tags</span>
        </label>

        <label class="checkbox-option">
          <input
            type="checkbox"
            name="enableLightbox"
            value="true"
            bind:checked={enableLightbox}
          />
          <span class="checkbox-label">Enable lightbox</span>
        </label>

        <label class="checkbox-option">
          <input
            type="checkbox"
            name="enableSearch"
            value="true"
            bind:checked={enableSearch}
          />
          <span class="checkbox-label">Enable search</span>
        </label>

        <label class="checkbox-option">
          <input
            type="checkbox"
            name="enableFilters"
            value="true"
            bind:checked={enableFilters}
          />
          <span class="checkbox-label">Enable filters</span>
        </label>
      </div>
    </GlassCard>

    <!-- Custom CSS -->
    <GlassCard class="config-section">
      <div class="section-header">
        <Palette class="section-icon" />
        <h2>Custom Styles</h2>
      </div>

      <div class="field-group">
        <label for="customCss" class="field-label">Custom CSS (optional)</label>
        <textarea
          id="customCss"
          name="customCss"
          bind:value={customCss}
          placeholder={".gallery-page { }"}
          class="field-textarea code"
          rows="6"
        ></textarea>
        <p class="field-help">
          Add custom CSS to style your gallery. Use with caution.
        </p>
      </div>
    </GlassCard>

    <!-- Actions -->
    <div class="form-actions">
      <GlassButton type="submit" variant="accent" disabled={isSubmitting}>
        <Save class="button-icon" />
        {isSubmitting ? "Saving..." : "Save Configuration"}
      </GlassButton>
    </div>
  </form>
</div>

<style>
  .gallery-config {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--color-muted-foreground);
    font-size: 0.875rem;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--color-foreground);
  }

  :global(.back-icon) {
    width: 1rem;
    height: 1rem;
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
    color: var(--color-accent);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-foreground);
    margin: 0;
  }

  .subtitle {
    color: var(--color-muted-foreground);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 600px;
  }

  /* Stats */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  :global(.stat-card) {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem !important;
  }

  :global(.stat-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-accent);
    opacity: 0.8;
  }

  .stat-content {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-foreground);
    line-height: 1;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--color-muted-foreground);
    margin-top: 0.25rem;
  }

  /* Alerts */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;
  }

  .alert-success {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }

  :global(.alert-icon) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  /* Sections */
  :global(.config-section) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  :global(.section-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: var(--color-accent);
  }

  .section-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-foreground);
  }

  /* Form Fields */
  .field-group {
    margin-bottom: 1.25rem;
  }

  .field-group:last-child {
    margin-bottom: 0;
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .field-row .field-group {
    margin-bottom: 0;
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-foreground);
    margin-bottom: 0.5rem;
  }

  .field-input,
  .field-select,
  .field-textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--color-muted);
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    color: var(--color-foreground);
    font-size: 0.9rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .field-input:focus,
  .field-select:focus,
  .field-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(var(--color-accent-rgb, 22, 163, 74), 0.15);
  }

  .field-input::placeholder,
  .field-textarea::placeholder {
    color: var(--color-muted-foreground);
    opacity: 0.6;
  }

  .field-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .field-textarea.code {
    font-family: monospace;
    font-size: 0.85rem;
  }

  .field-help {
    font-size: 0.8rem;
    color: var(--color-muted-foreground);
    margin-top: 0.5rem;
    line-height: 1.5;
  }

  /* Toggle Switch */
  .toggle-row {
    margin-bottom: 1.5rem;
  }

  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .toggle-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-switch {
    position: relative;
    width: 3rem;
    height: 1.5rem;
    background: var(--color-border);
    border-radius: 1rem;
    transition: background 0.2s;
  }

  .toggle-switch::after {
    content: "";
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-input:checked + .toggle-switch {
    background: var(--color-accent);
  }

  .toggle-input:checked + .toggle-switch::after {
    transform: translateX(1.5rem);
  }

  .toggle-text {
    font-weight: 500;
    color: var(--color-foreground);
  }

  /* Checkbox Grid */
  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .checkbox-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .checkbox-option input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--color-accent);
  }

  .checkbox-label {
    font-size: 0.9rem;
    color: var(--color-foreground);
  }

  /* Sync Section */
  .sync-section-top {
    margin-bottom: 1.5rem;
  }

  .sync-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-accent);
    font-weight: 500;
    text-decoration: none;
    transition: opacity 0.15s;
  }

  .sync-link:hover {
    opacity: 0.8;
  }

  :global(.sync-icon) {
    width: 1rem;
    height: 1rem;
  }

  /* Advanced Section */
  .advanced-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
  }

  .advanced-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-muted-foreground);
    padding: 0.5rem 0;
    list-style: none;
  }

  .advanced-toggle::-webkit-details-marker {
    display: none;
  }

  .advanced-toggle::after {
    content: "▸";
    margin-left: auto;
    transition: transform 0.2s;
  }

  .advanced-section[open] .advanced-toggle::after {
    transform: rotate(90deg);
  }

  :global(.warning-icon-small) {
    width: 1rem;
    height: 1rem;
    color: #f59e0b;
  }

  .advanced-warning {
    display: flex;
    gap: 0.75rem;
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 0.75rem;
    padding: 1rem;
    margin: 1rem 0 1.5rem 0;
  }

  :global(.warning-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: #f59e0b;
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .advanced-warning strong {
    display: block;
    color: #f59e0b;
    font-size: 0.9rem;
    margin-bottom: 0.25rem;
  }

  .advanced-warning p {
    font-size: 0.85rem;
    color: var(--color-muted-foreground);
    margin: 0;
    line-height: 1.5;
  }

  .field-help code {
    background: var(--color-muted);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.8rem;
  }

  .field-warning {
    color: #f59e0b;
  }

  /* Form Actions */
  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
  }

  :global(.button-icon) {
    width: 1.125rem;
    height: 1.125rem;
    margin-right: 0.5rem;
  }

  @media (max-width: 640px) {
    .stats-row {
      grid-template-columns: 1fr;
    }

    .field-row {
      grid-template-columns: 1fr;
    }

    .checkbox-grid {
      grid-template-columns: 1fr;
    }

    .title-row {
      flex-wrap: wrap;
    }
  }
</style>
