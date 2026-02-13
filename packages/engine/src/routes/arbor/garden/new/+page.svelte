<script>
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import GutterManager from "$lib/components/admin/GutterManager.svelte";
  import { Glass, GroveSwap, GroveIntro } from '$lib/ui';
  import { toast } from "$lib/ui/components/ui/toast";
  import { resolveTermString } from '$lib/ui/utils/grove-term-resolve';
  import { api } from "$lib/utils";
  import { ArrowLeft, ArrowRight, ChevronRight, X, AlertCircle } from "lucide-svelte";

  // Page data from admin layout (includes grafts cascade)
  let { data } = $props();

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
  let featuredImage = $state("");

  // Editor reference for anchor insertion
  /** @type {any} */
  let editorRef = $state(null);

  // UI state
  let saving = $state(false);
  /** @type {string | null} */
  let error = $state(null);
  let slugManuallyEdited = $state(false);
  let showGutter = $state(false);
  let detailsExpanded = $state(false);

  // Details summary — shows populated metadata at a glance when collapsed
  let detailsSummary = $derived.by(() => {
    /** @type {string[]} */
    const parts = [];
    if (featuredImage) parts.push("cover image");
    if (description.trim()) parts.push("description");
    const tagCount = parseTags(tagsInput).length;
    if (tagCount > 0) parts.push(`${tagCount} tag${tagCount > 1 ? "s" : ""}`);
    if (slug && slugManuallyEdited) parts.push("custom slug");
    if (font && font !== "default") parts.push(font);
    return parts.join(" \u00b7 ");
  });

  // Load UI state from localStorage
  $effect(() => {
    if (browser) {
      const savedDetails = localStorage.getItem("new-post-details-collapsed");
      if (savedDetails !== null) {
        detailsExpanded = savedDetails === "false";
      }
      const savedGutter = localStorage.getItem("new-post-gutter-visible");
      if (savedGutter !== null) {
        showGutter = savedGutter === "true";
      }
    }
  });

  function toggleDetails() {
    detailsExpanded = !detailsExpanded;
    if (browser) {
      localStorage.setItem("new-post-details-collapsed", String(!detailsExpanded));
    }
  }

  function toggleGutter() {
    showGutter = !showGutter;
    if (browser) {
      localStorage.setItem("new-post-gutter-visible", String(showGutter));
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

  /** Save as draft — zero validation, API handles untitled naming */
  async function handleSave() {
    error = null;
    saving = true;

    try {
      const result = await api.post("/api/blooms", {
        title: title.trim() || "",
        slug: slug.trim() || "",
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        fireside_assisted: firesideAssisted ? 1 : 0,
        status: "draft",
        featured_image: featuredImage.trim() || null,
      });

      editorRef?.clearDraft();

      toast.success(`Draft saved!`, {
        description: `"${result.title}" has been saved.`,
      });

      goto(`/arbor/garden/edit/${result.slug}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = errorMessage;
      toast.error(`Failed to save draft`, { description: errorMessage });
    } finally {
      saving = false;
    }
  }

  /** Publish — validates title + content before sending */
  async function handlePublish() {
    if (!title.trim()) {
      if (!detailsExpanded) detailsExpanded = true;
      error = "Title is required to publish";
      toast.error("Title is required to publish");
      return;
    }
    if (!content.trim()) {
      error = "Content is required to publish";
      toast.error("Content is required to publish");
      return;
    }

    error = null;
    saving = true;

    try {
      const result = await api.post("/api/blooms", {
        title: title.trim(),
        slug: slug.trim() || "",
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        fireside_assisted: firesideAssisted ? 1 : 0,
        status: "published",
        featured_image: featuredImage.trim() || null,
      });

      editorRef?.clearDraft();

      toast.success(`${resolveTermString('Bloom', 'Post')} published!`, {
        description: `"${result.title}" is now live.`,
      });

      goto(`/arbor/garden/edit/${result.slug}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error = errorMessage;
      toast.error(`Failed to publish`, { description: errorMessage });
    } finally {
      saving = false;
    }
  }
</script>

<div class="new-post-page">
  <header class="page-header">
    <div class="header-content">
      <a href="/arbor/garden" class="back-link"><ArrowLeft size={14} class="inline-block" /> Back to <GroveSwap term="your-garden">Garden</GroveSwap></a>
      <h1>New <GroveSwap term="blooms">Bloom</GroveSwap></h1>
      <GroveIntro term="blooms" />
    </div>
    <div class="header-actions">
      <button
        class="save-draft-btn"
        onclick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save Draft"}
      </button>
      <button
        class="publish-btn"
        onclick={handlePublish}
        disabled={saving}
      >
        {saving ? "Publishing..." : "Publish"}
      </button>
    </div>
  </header>

  {#if error}
    <Glass variant="accent" class="bg-red-500/10 border-red-500/30 p-4 rounded-lg mb-4 flex items-center gap-3">
      <AlertCircle class="w-5 h-5 text-red-500 shrink-0" />
      <span class="flex-1 text-red-600 dark:text-red-400">{error}</span>
      <button class="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 leading-none" onclick={() => (error = null)} aria-label="Dismiss error"><X size={16} /></button>
    </Glass>
  {/if}

  <div class="editor-layout">
    <!-- Inline title -->
    <input
      type="text"
      class="inline-title"
      bind:value={title}
      placeholder="Untitled"
      aria-label="Post title"
    />

    <!-- Add details strip -->
    <div class="details-strip">
      <button class="details-toggle" onclick={toggleDetails}>
        <ChevronRight size={16} class="details-chevron {detailsExpanded ? 'rotated' : ''}" />
        <span class="details-label">Add details</span>
        {#if !detailsExpanded && detailsSummary}
          <span class="details-summary">{detailsSummary}</span>
        {/if}
      </button>

      {#if detailsExpanded}
        <div class="details-fields">
          <div class="form-group field-description">
            <label for="description">
              Description
              <span class="char-count" class:warning={description.length > 160} class:good={description.length >= 120 && description.length <= 160}>
                {description.length}/160
              </span>
            </label>
            <textarea
              id="description"
              bind:value={description}
              placeholder="A brief summary of your bloom (120-160 chars for SEO)..."
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

          <div class="form-group field-cover">
            <label for="featured-image">Cover Image</label>
            <input
              type="url"
              id="featured-image"
              bind:value={featuredImage}
              placeholder="https://..."
              class="form-input"
            />
            <span class="form-hint">
              URL to a cover image. <a href="/arbor/images" target="_blank">Upload one first <ArrowRight size={12} class="inline-block" /></a>
            </span>
            {#if featuredImage}
              <div class="cover-preview">
                <img src={featuredImage} alt="Cover preview" loading="lazy" decoding="async" />
              </div>
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
            {#if tagsInput}
              <div class="tags-preview">
                {#each parseTags(tagsInput) as tag}
                  <span class="tag-preview">{tag}</span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="form-group">
            <label for="slug">Slug</label>
            <div class="slug-input-wrapper">
              <span class="slug-prefix">/garden/</span>
              <input
                type="text"
                id="slug"
                bind:value={slug}
                oninput={handleSlugInput}
                placeholder="your-bloom-slug"
                class="form-input slug-input"
              />
            </div>
          </div>

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
            <span class="form-hint">Choose a font for this bloom's content</span>
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
        </div>
      {/if}
    </div>

    <!-- Editor -->
    <main class="editor-main">
      <div class="editor-with-gutter">
        <div class="editor-section">
          <MarkdownEditor
            bind:this={editorRef}
            bind:content
            bind:firesideAssisted
            {saving}
            onSave={handleSave}
            draftKey="new-bloom"
            bind:previewTitle={title}
            previewDate={date}
            previewTags={parseTags(tagsInput)}
            grafts={data?.grafts ?? {}}
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
    flex-wrap: wrap;
    gap: 1rem;
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
  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .save-draft-btn {
    padding: 0.6rem 1.25rem;
    background: transparent;
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-button);
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s, color 0.2s;
  }
  .save-draft-btn:hover:not(:disabled) {
    background: var(--color-bg-secondary);
    border-color: var(--color-primary);
    color: var(--color-text);
  }
  .save-draft-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .publish-btn {
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
  .publish-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .publish-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Editor Layout — vertical flow, no sidebar */
  .editor-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  /* Inline title — big, clean, heading-style */
  .inline-title {
    font-size: 2rem;
    font-weight: 700;
    font-family: var(--font-heading, "Lexend", sans-serif);
    border: none;
    background: transparent;
    width: 100%;
    padding: 0.25rem 0;
    outline: none;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .inline-title::placeholder {
    color: var(--color-text-muted);
    opacity: 0.5;
  }
  .inline-title:focus {
    border-bottom: 2px solid var(--color-primary);
  }

  /* Details strip */
  .details-strip {
    margin: 0.5rem 0 1rem;
  }
  .details-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.15s ease;
    width: 100%;
    text-align: left;
  }
  .details-toggle:hover {
    color: var(--color-primary);
  }
  :global(.details-chevron) {
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  :global(.details-chevron.rotated) {
    transform: rotate(90deg);
  }
  .details-label {
    flex-shrink: 0;
  }
  .details-summary {
    color: var(--color-text-subtle);
    font-size: 0.8rem;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Details fields — responsive grid */
  .details-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 0.75rem 0;
    border-top: 1px solid var(--color-border);
    transition: border-color 0.3s ease;
  }
  .details-fields :global(.field-description),
  .details-fields :global(.field-cover) {
    grid-column: 1 / -1;
  }
  /* Svelte scoped class targeting */
  .field-description {
    grid-column: 1 / -1;
  }
  .field-cover {
    grid-column: 1 / -1;
  }

  /* Form fields (shared) */
  .form-group {
    margin-bottom: 0;
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
    margin-top: 0.5rem;
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
  .cover-preview {
    margin-top: 0.75rem;
    border-radius: var(--border-radius-small);
    overflow: hidden;
    border: 1px solid var(--color-border);
  }
  .cover-preview img {
    width: 100%;
    height: auto;
    max-height: 150px;
    object-fit: cover;
    display: block;
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
  @media (max-width: 768px) {
    .details-fields {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 900px) {
    .new-post-page {
      height: auto;
      min-height: auto;
    }
    .inline-title {
      font-size: 1.5rem;
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
    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
