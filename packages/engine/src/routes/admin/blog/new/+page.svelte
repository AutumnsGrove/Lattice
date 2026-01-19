<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import GutterManager from "$lib/components/admin/GutterManager.svelte";
  import { GlassCard, Glass } from '$lib/ui';
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils";

  // Form state
  let title = $state("");
  let slug = $state("");
  let date = $state(new Date().toISOString().split("T")[0]);
  let description = $state("");
  let tagsInput = $state("");
  let font = $state("default");
  let content = $state("");
  /** @type {any[]} */
  let gutterItems = $state([]);
  let firesideAssisted = $state(false);

  // Editor reference for anchor insertion
  /** @type {any} */
  let editorRef = $state(null);

  // UI state
  let saving = $state(false);
  /** @type {string | null} */
  let error = $state(null);
  let slugManuallyEdited = $state(false);
  let showGutter = $state(false);
  let detailsCollapsed = $state(false);

  // Load collapsed state from localStorage
  onMount(() => {
    if (browser) {
      const savedDetails = localStorage.getItem("editor-details-collapsed");
      if (savedDetails !== null) {
        detailsCollapsed = savedDetails === "true";
      }
      const savedGutter = localStorage.getItem("editor-gutter-visible");
      if (savedGutter !== null) {
        showGutter = savedGutter === "true";
      }
    }
  });

  function toggleDetailsCollapsed() {
    detailsCollapsed = !detailsCollapsed;
    if (browser) {
      localStorage.setItem("editor-details-collapsed", String(detailsCollapsed));
    }
  }

  function toggleGutter() {
    showGutter = !showGutter;
    if (browser) {
      localStorage.setItem("editor-gutter-visible", String(showGutter));
    }
  }

  // Auto-generate slug from title
  $effect(() => {
    if (!slugManuallyEdited && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
  });

  function handleSlugInput() {
    slugManuallyEdited = true;
  }

  /**
   * Parse tags from comma-separated input
   * @param {string} input
   */
  function parseTags(input) {
    return input
      .split(",")
      .map((/** @type {string} */ tag) => tag.trim())
      .filter((/** @type {string} */ tag) => tag.length > 0);
  }

  async function handleSave() {
    // Validation
    if (!title.trim()) {
      error = "Title is required";
      return;
    }
    if (!slug.trim()) {
      error = "Slug is required";
      return;
    }
    if (!content.trim()) {
      error = "Content is required";
      return;
    }

    error = null;
    saving = true;

    try {
      const result = await api.post("/api/posts", {
        title: title.trim(),
        slug: slug.trim(),
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        fireside_assisted: firesideAssisted ? 1 : 0,
      });

      // Clear draft on successful save
      editorRef?.clearDraft();

      // Show success toast
      toast.success("Post created!", {
        description: `"${result.title}" has been saved.`,
      });

      // Redirect to the edit page
      goto(`/admin/blog/edit/${result.slug}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = errorMessage;
      toast.error("Failed to create post", { description: errorMessage });
    } finally {
      saving = false;
    }
  }
</script>

<div class="new-post-page">
  <header class="page-header">
    <div class="header-content">
      <a href="/admin/blog" class="back-link">&larr; Back to Posts</a>
      <h1>New Post</h1>
    </div>
    <button
      class="save-btn"
      onclick={handleSave}
      disabled={saving}
    >
      {saving ? "Saving..." : "Save Post"}
    </button>
  </header>

  {#if error}
    <Glass variant="accent" class="bg-red-500/10 border-red-500/30 p-4 rounded-lg mb-4 flex items-center gap-3">
      <span class="flex items-center justify-center w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold">!</span>
      <span class="flex-1 text-red-600 dark:text-red-400">{error}</span>
      <button class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xl leading-none" onclick={() => (error = null)}>&times;</button>
    </Glass>
  {/if}

  <div class="editor-layout">
    <!-- Metadata Panel -->
    <GlassCard variant="frosted" class="metadata-panel {detailsCollapsed ? 'collapsed' : ''}">
      <div class="panel-header">
        <h2 class="panel-title">{#if detailsCollapsed}Details{:else}Post Details{/if}</h2>
        <button
          class="collapse-details-btn"
          onclick={toggleDetailsCollapsed}
          title={detailsCollapsed ? "Expand details" : "Collapse details"}
          aria-expanded={!detailsCollapsed}
        >
          {#if detailsCollapsed}»{:else}«{/if}
        </button>
      </div>

      {#if !detailsCollapsed}
        <div class="panel-content">
          <div class="form-group">
            <label for="title">Title</label>
            <input
              type="text"
              id="title"
              bind:value={title}
              placeholder="Your Post Title"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="slug">Slug</label>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">/blog/</span>
              <input
                type="text"
                id="slug"
                bind:value={slug}
                oninput={handleSlugInput}
                placeholder="your-post-slug"
                class="form-input slug-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="date">Date</label>
            <input
              type="date"
              id="date"
              bind:value={date}
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="description">
              Description
              <span class="char-count" class:warning={description.length > 160} class:good={description.length >= 120 && description.length <= 160}>
                {description.length}/160
              </span>
            </label>
            <textarea
              id="description"
              bind:value={description}
              placeholder="A brief summary of your post (120-160 chars for SEO)..."
              rows="3"
              class="form-input form-textarea"
              class:char-warning={description.length > 160}
            ></textarea>
            {#if description.length > 160}
              <span class="form-warning">Description exceeds recommended SEO length</span>
            {:else if description.length > 0 && description.length < 120}
              <span class="form-hint">Add {120 - description.length} more chars for optimal SEO</span>
            {/if}
          </div>

          <div class="form-group">
            <label for="tags">Tags</label>
            <input
              type="text"
              id="tags"
              bind:value={tagsInput}
              placeholder="tag1, tag2, tag3"
              class="form-input"
            />
            <span class="form-hint">Separate tags with commas</span>
          </div>

          {#if tagsInput}
            <div class="tags-preview">
              {#each parseTags(tagsInput) as tag}
                <span class="tag-preview">{tag}</span>
              {/each}
            </div>
          {/if}

          <div class="form-group">
            <label for="font">Font</label>
            <select id="font" bind:value={font} class="form-input">
              <option value="default">Default (Site Setting)</option>
              <optgroup label="Accessibility">
                <option value="lexend">Lexend (Default)</option>
                <option value="atkinson">Atkinson Hyperlegible</option>
                <option value="opendyslexic">OpenDyslexic</option>
                <option value="luciole">Luciole</option>
                <option value="nunito">Nunito</option>
              </optgroup>
              <optgroup label="Modern Sans">
                <option value="quicksand">Quicksand</option>
                <option value="manrope">Manrope</option>
                <option value="instrument-sans">Instrument Sans</option>
                <option value="plus-jakarta-sans">Plus Jakarta Sans</option>
              </optgroup>
              <optgroup label="Serifs">
                <option value="cormorant">Cormorant</option>
                <option value="bodoni-moda">Bodoni Moda</option>
                <option value="lora">Lora</option>
                <option value="eb-garamond">EB Garamond</option>
                <option value="merriweather">Merriweather</option>
                <option value="fraunces">Fraunces</option>
              </optgroup>
              <optgroup label="Monospace">
                <option value="ibm-plex-mono">IBM Plex Mono</option>
                <option value="cozette">Cozette</option>
              </optgroup>
              <optgroup label="Display & Special">
                <option value="alagard">Alagard</option>
                <option value="calistoga">Calistoga</option>
                <option value="caveat">Caveat</option>
              </optgroup>
            </select>
            <span class="form-hint">Choose a font for this post's content</span>
          </div>
        </div>
      {/if}
    </GlassCard>

    <!-- Editor Panel -->
    <main class="editor-main">
      <div class="editor-with-gutter">
        <div class="editor-section">
          <MarkdownEditor
            bind:this={editorRef}
            bind:content
            bind:firesideAssisted
            {saving}
            onSave={handleSave}
            draftKey="new-post"
            bind:previewTitle={title}
            previewDate={date}
            previewTags={parseTags(tagsInput)}
          />
        </div>
        {#if showGutter}
          <aside class="gutter-section">
            <GutterManager
              bind:gutterItems
              availableAnchors={editorRef?.getAvailableAnchors?.() || []}
              onInsertAnchor={(/** @type {string} */ name) => editorRef?.insertAnchor(name)}
            />
          </aside>
        {/if}
      </div>
      <button
        class="toggle-vines-btn"
        onclick={toggleGutter}
        title={showGutter ? "Hide Vines panel" : "Show Vines panel"}
      >
        {showGutter ? "Hide Vines" : "Show Vines"}
      </button>
    </main>
  </div>
</div>

<style>
  .new-post-page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 8rem);
    min-height: 600px;
  }
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    flex-shrink: 0;
  }
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .back-link {
    color: var(--color-primary);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
    opacity: 0.8;
  }
  .back-link:hover {
    color: var(--color-primary);
    opacity: 1;
  }
  :global(.dark) .back-link {
    color: #86efac;
  }
  .page-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .save-btn {
    padding: 0.6rem 1.25rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--border-radius-button);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, opacity 0.2s;
  }
  .save-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  /* Editor Layout */
  .editor-layout {
    display: flex;
    gap: 1.5rem;
    flex: 1;
    min-height: 0;
  }
  /* Metadata Panel - Now using GlassCard */
  :global(.metadata-panel) {
    width: 280px;
    flex-shrink: 0;
    overflow-y: auto;
    transition: width 0.2s ease;
  }
  :global(.metadata-panel.collapsed) {
    width: 50px;
  }
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 1.25rem;
    transition: border-color 0.3s ease;
  }
  .metadata-panel.collapsed .panel-header {
    flex-direction: column;
    gap: 0.5rem;
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }
  .panel-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .metadata-panel.collapsed .panel-title {
    font-size: 0.7rem;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
  }
  .collapse-details-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    font-family: monospace;
    transition: all 0.15s ease;
  }
  .collapse-details-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-primary);
  }
  .form-group {
    margin-bottom: 1.25rem;
  }
  .form-group label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }
  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-small);
    font-size: 0.9rem;
    background: var(--color-bg-secondary);
    color: var(--color-text);
    transition: border-color 0.2s, background-color 0.3s, color 0.3s;
  }
  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  .form-textarea {
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
  }
  .slug-input-wrapper {
    display: flex;
    align-items: center;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-small);
    overflow: hidden;
    transition: border-color 0.2s, background-color 0.3s;
  }
  .slug-input-wrapper:focus-within {
    border-color: var(--color-primary);
  }
  .slug-prefix {
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    color: var(--color-text-subtle);
    font-size: 0.85rem;
    background: var(--color-border);
    transition: background-color 0.3s, color 0.3s;
  }
  .slug-input {
    border: none;
    background: transparent;
    flex: 1;
  }
  .slug-input:focus {
    outline: none;
  }
  .form-hint {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: var(--color-text-subtle);
    transition: color 0.3s ease;
  }
  .form-warning {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: #e07030;
    transition: color 0.3s ease;
  }
  .char-count {
    font-size: 0.75rem;
    font-weight: normal;
    color: var(--color-text-subtle);
    margin-left: 0.5rem;
  }
  .char-count.good {
    color: var(--accent-success);
  }
  .char-count.warning {
    color: #e07030;
  }
  .form-input.char-warning {
    border-color: #e07030;
  }
  .tags-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: -0.5rem;
  }
  .tag-preview {
    padding: 0.2rem 0.6rem;
    background: rgba(34, 197, 94, 0.7);
    backdrop-filter: blur(4px);
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
  /* Editor Main */
  .editor-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .editor-with-gutter {
    display: flex;
    gap: 1rem;
    flex: 1;
    min-height: 0;
  }
  .editor-section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .gutter-section {
    width: 300px;
    flex-shrink: 0;
    overflow-y: auto;
  }
  .toggle-vines-btn {
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: var(--border-radius-button);
    color: var(--color-primary);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
    align-self: flex-end;
  }
  .toggle-vines-btn:hover {
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.35);
  }
  :global(.dark) .toggle-vines-btn {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.2);
    color: #86efac;
  }
  :global(.dark) .toggle-vines-btn:hover {
    background: rgba(74, 222, 128, 0.2);
    border-color: rgba(74, 222, 128, 0.35);
  }
  /* Responsive */
  @media (max-width: 1200px) {
    .gutter-section {
      width: 250px;
    }
  }
  @media (max-width: 900px) {
    .editor-layout {
      flex-direction: column;
    }
    .metadata-panel {
      width: 100% !important;
      max-height: none;
    }
    .metadata-panel.collapsed {
      width: 100% !important;
      padding: 1rem;
    }
    .metadata-panel.collapsed .panel-header {
      flex-direction: row;
    }
    .metadata-panel.collapsed .panel-title {
      writing-mode: horizontal-tb;
      transform: none;
      font-size: 1rem;
    }
    .new-post-page {
      height: auto;
      min-height: auto;
    }
    .editor-main {
      min-height: 500px;
    }
    .editor-with-gutter {
      flex-direction: column;
    }
    .gutter-section {
      width: 100%;
      max-height: 300px;
    }
  }
</style>
