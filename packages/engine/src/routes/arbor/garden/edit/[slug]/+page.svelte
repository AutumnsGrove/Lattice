<script>
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import GutterManager from "$lib/components/admin/GutterManager.svelte";
  import { Input, Button, GlassCard, GroveSwap } from "$lib/ui";
  import Dialog from "$lib/ui/components/ui/Dialog.svelte";
  import { toast } from "$lib/ui/components/ui/toast";
  import { resolveTermString } from '$lib/ui/utils/grove-term-resolve';
  import { api } from "$lib/utils";
  import { ExternalLink } from "lucide-svelte";

  let { data } = $props();

  // Form state - initialized from loaded data (synced via effect)
  let title = $state("");
  let slug = $state("");
  let date = $state("");
  let description = $state("");
  let tagsInput = $state("");
  let font = $state("default");
  let content = $state("");
  let gutterItems = $state(/** @type {any[]} */ ([]));
  let status = $state("draft");
  let featuredImage = $state("");

  // Sync form state when data changes (e.g., navigating to different post)
  $effect(() => {
    title = data.post.title || "";
    slug = data.post.slug || "";
    date = data.post.date || new Date().toISOString().split("T")[0];
    description = data.post.description || "";
    tagsInput = Array.isArray(data.post.tags) ? data.post.tags.join(", ") : "";
    font = /** @type {any} */ (data.post).font || "default";
    content = data.post.markdown_content || "";
    gutterItems = data.post.gutter_content
      ? JSON.parse(/** @type {string} */ (data.post.gutter_content))
      : [];
    status = /** @type {any} */ (data.post).status || "draft";
    featuredImage = /** @type {any} */ (data.post).featured_image || "";
  });

  // Editor reference for anchor insertion
  /** @type {any} */
  let editorRef = $state(null);

  // UI state
  let saving = $state(false);
  let hasUnsavedChanges = $state(false);
  let showGutter = $state(false); // Start hidden for cleaner first-time experience
  let showDeleteDialog = $state(false);
  let detailsCollapsed = $state(true); // Start collapsed for focused writing

  // Load collapsed state from localStorage
  $effect(() => {
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
      localStorage.setItem(
        "editor-details-collapsed",
        String(detailsCollapsed),
      );
    }
  }

  function toggleGutter() {
    showGutter = !showGutter;
    if (browser) {
      localStorage.setItem("editor-gutter-visible", String(showGutter));
    }
  }

  // Track changes
  $effect(() => {
    // Simple dirty check - could be more sophisticated
    const hasChanges =
      title !== data.post.title ||
      description !== data.post.description ||
      content !== data.post.markdown_content;
    hasUnsavedChanges = hasChanges;
  });

  // Parse tags from comma-separated input
  /** @param {string} input */
  function parseTags(input) {
    return input
      .split(",")
      .map((/** @type {string} */ tag) => tag.trim())
      .filter((/** @type {string} */ tag) => tag.length > 0);
  }

  async function handleSave() {
    // Validation
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    saving = true;

    try {
      await api.put(`/api/blooms/${slug}`, {
        title: title.trim(),
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        status,
        featured_image: featuredImage.trim() || null,
      });

      // Clear draft on successful save
      editorRef?.clearDraft();

      toast.success(`${resolveTermString('Bloom', 'Post')} saved successfully!`);
      hasUnsavedChanges = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to update ${resolveTermString('bloom', 'post')}`);
    } finally {
      saving = false;
    }
  }

  /**
   * Toggle publish status and immediately save
   * Publishing/unpublishing is a critical action that should persist immediately
   */
  async function handleStatusToggle() {
    const newStatus = status === "published" ? "draft" : "published";
    const action = newStatus === "published" ? "Publishing" : "Unpublishing";

    // Validation before publish
    if (newStatus === "published") {
      if (!title.trim()) {
        toast.error("Title is required before publishing");
        return;
      }
      if (!content.trim()) {
        toast.error("Content is required before publishing");
        return;
      }
    }

    saving = true;
    status = newStatus; // Optimistically update UI

    try {
      await api.put(`/api/blooms/${slug}`, {
        title: title.trim(),
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        status: newStatus,
        featured_image: featuredImage.trim() || null,
      });

      // Clear draft on successful save
      editorRef?.clearDraft();

      if (newStatus === "published") {
        toast.success(`${resolveTermString('Bloom', 'Post')} published!`, { description: `Your ${resolveTermString('bloom', 'post')} is now live.` });
      } else {
        toast.success(`${resolveTermString('Bloom', 'Post')} unpublished`, { description: "Moved back to drafts." });
      }
      hasUnsavedChanges = false;
    } catch (err) {
      // Revert on failure
      status = status === "published" ? "draft" : "published";
      toast.error(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()}`);
    } finally {
      saving = false;
    }
  }

  async function confirmDelete() {
    showDeleteDialog = true;
  }

  async function handleDelete() {
    showDeleteDialog = false;
    saving = true;

    try {
      await api.delete(`/api/blooms/${slug}`);

      toast.success(`${resolveTermString('Bloom', 'Post')} deleted successfully`);
      // Redirect to blog admin
      goto("/arbor/garden");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${resolveTermString('bloom', 'post')}`);
    } finally {
      saving = false;
    }
  }

  // Warn about unsaved changes
  /** @param {BeforeUnloadEvent} e */
  function handleBeforeUnload(e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      return (e.returnValue =
        "You have unsaved changes. Are you sure you want to leave?");
    }
  }
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<div class="edit-post-page">
  <header class="page-header">
    <div class="header-content">
      <a href="/arbor/garden" class="back-link">&larr; Back to <GroveSwap term="your-garden">Garden</GroveSwap></a>
      <div class="title-row">
        <h1>Edit <GroveSwap term="blooms">Bloom</GroveSwap></h1>
        {#if data.source === "filesystem"}
          <span class="source-badge filesystem">From UserContent</span>
        {:else}
          <span class="source-badge d1">From Database</span>
        {/if}
        {#if hasUnsavedChanges}
          <span class="unsaved-badge">Unsaved changes</span>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      <!-- Prominent Publish/Draft Toggle - Auto-saves on click -->
      <button
        class="status-toggle {status === 'published' ? 'published' : 'draft'}"
        onclick={handleStatusToggle}
        disabled={saving}
        title={status === "published"
          ? "Click to unpublish (save as draft)"
          : "Click to publish (goes live immediately)"}
      >
        {#if saving}
          <span class="status-icon">⏳</span> Saving...
        {:else if status === "published"}
          <span class="status-icon">✓</span> Published
        {:else}
          <span class="status-icon">○</span> Draft — Click to Publish
        {/if}
      </button>

      <Button
        variant="danger"
        onclick={confirmDelete}
        disabled={saving}
        title="Delete this bloom"
      >
        Delete
      </Button>
      <Button variant="outline" href="/garden/{slug}">
        View Live <ExternalLink size={16} class="inline-block ml-1" />
      </Button>
      <Button onclick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  </header>

  <div class="editor-layout">
    <!-- Metadata Panel -->
    <GlassCard
      variant="frosted"
      class="metadata-panel {detailsCollapsed ? 'collapsed' : ''}"
    >
      <div class="panel-header">
        <h2 class="panel-title">
          {#if detailsCollapsed}Details{:else}<GroveSwap term="blooms">Bloom</GroveSwap> Details{/if}
        </h2>
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
              placeholder={resolveTermString("Your Bloom Title", "Your Post Title")}
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="slug">Slug</label>
            <div class="slug-display">
              <span class="slug-prefix">/garden/</span>
              <span class="slug-value">{slug}</span>
            </div>
            <span class="form-hint">Slug cannot be changed after creation</span>
          </div>

          <div class="form-group">
            <label for="date">Date</label>
            <input type="date" id="date" bind:value={date} class="form-input" />
          </div>

          <div class="form-group">
            <label for="description">
              Description
              <span
                class="char-count"
                class:warning={description.length > 160}
                class:good={description.length >= 120 &&
                  description.length <= 160}
              >
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
              <span class="form-warning"
                >Description exceeds recommended SEO length</span
              >
            {:else if description.length > 0 && description.length < 120}
              <span class="form-hint"
                >Add {120 - description.length} more chars for optimal SEO</span
              >
            {/if}
          </div>

          <div class="form-group">
            <label for="featured-image">Cover Image</label>
            <input
              type="url"
              id="featured-image"
              bind:value={featuredImage}
              placeholder="https://..."
              class="form-input"
            />
            <span class="form-hint">
              URL to a cover image. <a href="/arbor/images" target="_blank">Upload one first →</a>
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
            <span class="form-hint">Choose a font for this bloom's content</span>
          </div>

          <div class="form-group">
            <label for="status">Status</label>
            <select id="status" bind:value={status} class="form-input">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <span class="form-hint">
              {status === "draft"
                ? "This bloom will be hidden from public view"
                : "This bloom will be visible to all visitors"}
            </span>
          </div>

          <div class="metadata-info">
            {#if "last_synced" in data.post && data.post.last_synced}
              <p class="info-item">
                <span class="info-label">Last synced:</span>
                <span class="info-value">
                  {new Date(
                    /** @type {any} */ (data.post).last_synced,
                  ).toLocaleString()}
                </span>
              </p>
            {/if}
            {#if "updated_at" in data.post && data.post.updated_at}
              <p class="info-item">
                <span class="info-label">Last updated:</span>
                <span class="info-value">
                  {new Date(
                    /** @type {any} */ (data.post).updated_at,
                  ).toLocaleString()}
                </span>
              </p>
            {/if}
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
            {saving}
            onSave={handleSave}
            draftKey={`edit-${slug}`}
            previewTitle={title}
            previewDate={date}
            previewTags={parseTags(tagsInput)}
            {gutterItems}
            grafts={data?.grafts ?? {}}
          />
        </div>
        {#if showGutter}
          <aside class="gutter-section">
            <GutterManager
              bind:gutterItems
              availableAnchors={editorRef?.getAvailableAnchors?.() || []}
              onInsertAnchor={(/** @type {string} */ name) =>
                editorRef?.insertAnchor(name)}
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

<!-- Delete Confirmation Dialog -->
<Dialog bind:open={showDeleteDialog} title={`Delete ${resolveTermString('Bloom', 'Post')}`}>
  <p>Are you sure you want to delete "{title}"? This cannot be undone.</p>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (showDeleteDialog = false)}
      >Cancel</Button
    >
    <Button variant="danger" onclick={handleDelete}>Delete</Button>
  {/snippet}
</Dialog>

<style>
  .edit-post-page {
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
  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .page-header h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .source-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .source-badge.filesystem {
    background: #fff5b1;
    color: var(--status-warning-bg);
  }
  :global(.dark) .source-badge.filesystem {
    background: rgba(255, 245, 177, 0.2);
    color: #f0c674;
  }
  .source-badge.d1 {
    background: #dcffe4;
    color: var(--accent-success-dark);
  }
  :global(.dark) .source-badge.d1 {
    background: rgba(40, 167, 69, 0.2);
    color: #7ee787;
  }
  .unsaved-badge {
    padding: 0.2rem 0.6rem;
    background: #ffeef0;
    color: #cf222e;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  :global(.dark) .unsaved-badge {
    background: rgba(248, 81, 73, 0.15);
    color: #ff7b72;
  }
  .header-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    align-items: center;
  }

  /* Prominent Status Toggle Button */
  .status-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.25rem;
    border-radius: var(--border-radius-button);
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid;
  }

  .status-toggle.draft {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border-color: #f59e0b;
    color: #92400e;
  }

  .status-toggle.draft:hover {
    background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
    transform: scale(1.02);
  }

  .status-toggle.published {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border-color: #10b981;
    color: #065f46;
  }

  .status-toggle.published:hover {
    background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
  }

  .status-toggle:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .status-icon {
    font-size: 1.1rem;
  }

  :global(.dark) .status-toggle.draft {
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.2) 0%,
      rgba(245, 158, 11, 0.3) 100%
    );
    border-color: #f59e0b;
    color: #fcd34d;
  }

  :global(.dark) .status-toggle.draft:hover {
    background: linear-gradient(
      135deg,
      rgba(251, 191, 36, 0.3) 0%,
      rgba(245, 158, 11, 0.4) 100%
    );
  }

  :global(.dark) .status-toggle.published {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.2) 0%,
      rgba(52, 211, 153, 0.3) 100%
    );
    border-color: #10b981;
    color: #6ee7b7;
  }

  :global(.dark) .status-toggle.published:hover {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.3) 0%,
      rgba(52, 211, 153, 0.4) 100%
    );
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
  :global(.metadata-panel.collapsed .panel-header) {
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
  :global(.metadata-panel.collapsed .panel-title) {
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
    flex-shrink: 0; /* Prevent button from being squeezed */
  }
  .collapse-details-btn:hover {
    background: var(--color-bg-secondary);
    color: var(--color-primary);
  }
  /* Mobile touch target - WCAG 2.5.5 requires 44×44px minimum */
  @media (max-width: 900px) {
    .collapse-details-btn {
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
    }
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
    transition:
      border-color 0.2s,
      background-color 0.3s,
      color 0.3s;
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
  .slug-display {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-secondary);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-small);
    transition:
      background-color 0.3s,
      border-color 0.3s;
  }
  .slug-prefix {
    color: var(--color-text-subtle);
    font-size: 0.85rem;
    transition: color 0.3s;
  }
  .slug-value {
    color: var(--color-text);
    font-family: monospace;
    font-size: 0.85rem;
    transition: color 0.3s;
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
  /* Cover image preview */
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
  .metadata-info {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    transition: border-color 0.3s;
  }
  .info-item {
    margin: 0.5rem 0;
    font-size: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .info-label {
    color: var(--color-text-subtle);
    transition: color 0.3s;
  }
  .info-value {
    color: var(--color-text-muted);
    font-family: monospace;
    font-size: 0.75rem;
    transition: color 0.3s;
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
    :global(.metadata-panel) {
      width: 100% !important;
      max-height: none;
    }
    :global(.metadata-panel.collapsed) {
      width: 100% !important;
      padding: 1rem;
    }
    :global(.metadata-panel.collapsed .panel-header) {
      flex-direction: row;
    }
    :global(.metadata-panel.collapsed .panel-title) {
      writing-mode: horizontal-tb;
      transform: none;
      font-size: 1rem;
    }
    .edit-post-page {
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
    .header-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
