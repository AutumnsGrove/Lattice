<script>
  import { goto, beforeNavigate } from "$app/navigation";
  import { browser } from "$app/environment";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import GutterManager from "$lib/components/admin/GutterManager.svelte";
  import { Button, GroveSwap } from "$lib/ui";
  import Dialog from "$lib/ui/components/ui/Dialog.svelte";
  import { toast } from "$lib/ui/components/ui/toast";
  import { resolveTermString } from '$lib/ui/utils/grove-term-resolve';
  import { api } from "$lib/utils";
  import { clickOutside } from "$lib/actions/clickOutside";
  import { ExternalLink, Ellipsis, Trash2, ChevronRight, ArrowLeft, ArrowRight } from "lucide-svelte";
  import Waystone from "$lib/ui/components/ui/Waystone.svelte";

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
  let shareToMeadow = $state(true);
  let originalSlug = $state("");
  let slugError = $state("");

  // Sync form state when data changes (e.g., navigating to different post)
  $effect(() => {
    title = data.post.title || "";
    slug = data.post.slug || "";
    originalSlug = data.post.slug || "";
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
    shareToMeadow = /** @type {any} */ (data.post).meadow_exclude !== 1;
  });

  // Editor reference for anchor insertion
  /** @type {any} */
  let editorRef = $state(null);

  // UI state
  let saving = $state(false);
  let hasUnsavedChanges = $state(false);
  let showGutter = $state(false);
  let showDeleteDialog = $state(false);
  let showMoreMenu = $state(false);
  let detailsExpanded = $state(false);

  // Details summary — shows populated metadata at a glance when collapsed
  let detailsSummary = $derived.by(() => {
    /** @type {string[]} */
    const parts = [];
    if (featuredImage) parts.push("cover image");
    if (description.trim()) parts.push("description");
    const tagCount = parseTags(tagsInput).length;
    if (tagCount > 0) parts.push(`${tagCount} tag${tagCount > 1 ? "s" : ""}`);
    if (font && font !== "default") parts.push(font);
    return parts.join(" \u00b7 ");
  });

  // Load UI state from localStorage
  $effect(() => {
    if (browser) {
      const savedDetails = localStorage.getItem("editor-details-collapsed");
      if (savedDetails !== null) {
        detailsExpanded = savedDetails === "false";
      }
      const savedGutter = localStorage.getItem("editor-gutter-visible");
      if (savedGutter !== null) {
        showGutter = savedGutter === "true";
      }
    }
  });

  function toggleDetails() {
    detailsExpanded = !detailsExpanded;
    if (browser) {
      localStorage.setItem("editor-details-collapsed", String(!detailsExpanded));
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
    const hasChanges =
      title !== data.post.title ||
      description !== data.post.description ||
      content !== data.post.markdown_content;
    hasUnsavedChanges = hasChanges;
  });

  /** @param {string} input */
  function parseTags(input) {
    return input
      .split(",")
      .map((/** @type {string} */ tag) => tag.trim())
      .filter((/** @type {string} */ tag) => tag.length > 0);
  }

  /** @param {string} value */
  function validateSlug(value) {
    if (!value) {
      slugError = "Slug is required";
      return;
    }
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(value)) {
      slugError = "Only lowercase letters, numbers, and hyphens";
      return;
    }
    slugError = "";
  }

  /** Save — for drafts, zero validation; for published, title + content required */
  async function handleSave() {
    if (status === "published") {
      if (!title.trim()) {
        toast.error("Title is required for published posts");
        return;
      }
      if (!content.trim()) {
        toast.error("Content is required for published posts");
        return;
      }
    }

    if (slugError) {
      toast.error("Please fix the slug error");
      return;
    }

    saving = true;

    try {
      const saveSlug = originalSlug; // Use original slug for the URL
      await api.put(`/api/blooms/${saveSlug}`, {
        title: title.trim() || "",
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        status,
        featured_image: featuredImage.trim() || null,
        meadow_exclude: shareToMeadow ? 0 : 1,
        slug: slug !== originalSlug ? slug : undefined,
      });

      editorRef?.clearDraft();
      toast.success(`${resolveTermString('Bloom', 'Post')} saved successfully!`);
      hasUnsavedChanges = false;

      // If slug changed, navigate to the new URL
      if (slug !== originalSlug) {
        originalSlug = slug;
        await goto(`/arbor/garden/edit/${slug}`, { replaceState: true });
      }
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

    // Validation before publish
    if (newStatus === "published") {
      if (!title.trim()) {
        if (!detailsExpanded) detailsExpanded = true;
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
      const saveSlug = originalSlug;
      await api.put(`/api/blooms/${saveSlug}`, {
        title: title.trim() || "",
        date,
        description: description.trim(),
        tags: parseTags(tagsInput),
        font,
        markdown_content: content,
        gutter_content: JSON.stringify(gutterItems),
        status: newStatus,
        featured_image: featuredImage.trim() || null,
        meadow_exclude: shareToMeadow ? 0 : 1,
        slug: slug !== originalSlug ? slug : undefined,
      });

      editorRef?.clearDraft();

      if (newStatus === "published") {
        toast.success(`${resolveTermString('Bloom', 'Post')} published!`, { description: `Your ${resolveTermString('bloom', 'post')} is now live.` });
      } else {
        toast.success(`${resolveTermString('Bloom', 'Post')} unpublished`, { description: "Moved back to drafts." });
      }
      hasUnsavedChanges = false;

      // If slug changed, navigate to the new URL
      if (slug !== originalSlug) {
        originalSlug = slug;
        await goto(`/arbor/garden/edit/${slug}`, { replaceState: true });
      }
    } catch (err) {
      // Revert on failure
      status = status === "published" ? "draft" : "published";
      toast.error(err instanceof Error ? err.message : `Failed to ${newStatus === "published" ? "publish" : "unpublish"}`);
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
      goto("/arbor/garden");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete ${resolveTermString('bloom', 'post')}`);
    } finally {
      saving = false;
    }
  }

  // Flush draft and warn about unsaved changes on page unload
  /** @param {BeforeUnloadEvent} e */
  function handleBeforeUnload(e) {
    // Always flush the draft to localStorage so content survives session expiry
    editorRef?.flushDraft();

    if (hasUnsavedChanges) {
      e.preventDefault();
      return (e.returnValue =
        "You have unsaved changes. Are you sure you want to leave?");
    }
  }

  // Guard SvelteKit client-side navigations (beforeunload only covers tab close / hard nav)
  beforeNavigate((navigation) => {
    editorRef?.flushDraft();

    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Leave this page?")) {
        navigation.cancel();
      }
    }
  });
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<div class="edit-post-page">
  <header class="page-header">
    <div class="header-content">
      <a href="/arbor/garden" class="back-link"><ArrowLeft size={14} class="inline-block" /> Back to <GroveSwap term="your-garden">Garden</GroveSwap></a>
      <div class="title-row">
        <h1>Edit <GroveSwap term="blooms">Bloom</GroveSwap></h1>
        <Waystone slug="using-curios-in-content" label="Curio directives" size="sm" />
        {#if hasUnsavedChanges}
          <span class="unsaved-badge">Unsaved changes</span>
        {/if}
      </div>
    </div>
    <div class="header-actions">
      <!-- Status indicator (non-interactive) -->
      <span class="status-badge {status}">
        {#if status === "published"}
          <span class="status-dot published"></span> Published
        {:else}
          <span class="status-dot draft"></span> Draft
        {/if}
      </span>

      <!-- View Live (icon-only, only when published) -->
      {#if status === "published"}
        <Button variant="ghost" size="icon" href="/garden/{slug}" title="View live post">
          <ExternalLink size={16} />
        </Button>
      {/if}

      <!-- More menu (contains Delete) -->
      <div class="more-menu">
        <Button
          variant="ghost"
          size="icon"
          onclick={() => showMoreMenu = !showMoreMenu}
          title="More actions"
          aria-expanded={showMoreMenu}
          aria-haspopup="true"
        >
          <Ellipsis size={16} />
        </Button>
        {#if showMoreMenu}
          <div class="more-menu-dropdown" role="menu" use:clickOutside={() => showMoreMenu = false}>
            <button
              class="menu-item danger"
              role="menuitem"
              onclick={() => { showMoreMenu = false; confirmDelete(); }}
            >
              <Trash2 size={14} />
              Delete {resolveTermString('Bloom', 'Post')}
            </button>
          </div>
        {/if}
      </div>

      <!-- Publish / Unpublish -->
      {#if status === "draft"}
        <Button variant="outline" onclick={handleStatusToggle} disabled={saving}>
          {saving ? "Publishing..." : "Publish"}
        </Button>
      {:else}
        <Button variant="ghost" onclick={handleStatusToggle} disabled={saving}>
          {saving ? "Unpublishing..." : "Unpublish"}
        </Button>
      {/if}

      <!-- Save (primary action, always rightmost) -->
      <Button onclick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  </header>

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
                id="slug"
                type="text"
                bind:value={slug}
                oninput={() => validateSlug(slug)}
                class="slug-input"
                placeholder="my-post-slug"
              />
            </div>
            {#if slugError}
              <span class="form-hint form-error">{slugError}</span>
            {:else if slug !== originalSlug}
              <span class="form-hint slug-changed">URL will change from <code>/{originalSlug}</code> to <code>/{slug}</code></span>
            {:else}
              <span class="form-hint">Lowercase letters, numbers, and hyphens only</span>
            {/if}
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
            <input type="date" id="date" bind:value={date} class="form-input" />
          </div>

          <div class="form-group field-full">
            <label class="meadow-toggle">
              <input type="checkbox" bind:checked={shareToMeadow} />
              <span class="meadow-toggle-text">
                <span class="meadow-toggle-title">Share to Meadow</span>
                <span class="meadow-toggle-hint">This post will appear in the community feed when published.</span>
              </span>
            </label>
          </div>

          <!-- Metadata info -->
          <div class="metadata-info field-full">
            {#if "last_synced" in data.post && data.post.last_synced}
              <p class="info-item">
                <span class="info-label">Last synced:</span>
                <span class="info-value">
                  {new Date(/** @type {any} */ (data.post).last_synced).toLocaleString()}
                </span>
              </p>
            {/if}
            {#if "updated_at" in data.post && data.post.updated_at}
              <p class="info-item">
                <span class="info-label">Last updated:</span>
                <span class="info-value">
                  {new Date(/** @type {any} */ (data.post).updated_at).toLocaleString()}
                </span>
              </p>
            {/if}
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
            {saving}
            onSave={handleSave}
            draftKey={`edit-${slug}`}
            serverDraftSlug={`edit-${slug}`}
            previewTitle={title}
            previewDate={date}
            previewTags={parseTags(tagsInput)}
            {gutterItems}
            grafts={data?.grafts ?? {}}
            configuredCurios={data?.curios ?? []}
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
    <Button variant="outline" onclick={() => (showDeleteDialog = false)}>Cancel</Button>
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
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  /* Status badge (non-interactive indicator) */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 500;
    user-select: none;
  }
  .status-badge.draft {
    background: rgba(245, 158, 11, 0.1);
    color: #92400e;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  .status-badge.published {
    background: rgba(16, 185, 129, 0.1);
    color: #065f46;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  :global(.dark) .status-badge.draft {
    background: rgba(251, 191, 36, 0.12);
    color: #fcd34d;
    border-color: rgba(251, 191, 36, 0.25);
  }
  :global(.dark) .status-badge.published {
    background: rgba(16, 185, 129, 0.12);
    color: #6ee7b7;
    border-color: rgba(16, 185, 129, 0.25);
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .status-dot.draft {
    background: #f59e0b;
  }
  .status-dot.published {
    background: #10b981;
  }

  /* More menu (overflow) */
  .more-menu {
    position: relative;
  }
  .more-menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    min-width: 180px;
    padding: 0.25rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-small);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
  }
  :global(.dark) .more-menu-dropdown {
    background: var(--color-bg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: calc(var(--border-radius-small) - 2px);
    background: transparent;
    font-size: 0.85rem;
    cursor: pointer;
    color: var(--color-text);
    transition: background 0.15s ease;
  }
  .menu-item:hover {
    background: var(--color-bg-secondary);
  }
  .menu-item.danger {
    color: #dc2626;
  }
  .menu-item.danger:hover {
    background: rgba(220, 38, 38, 0.08);
  }
  :global(.dark) .menu-item.danger {
    color: #f87171;
  }
  :global(.dark) .menu-item.danger:hover {
    background: rgba(248, 113, 113, 0.1);
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
  .field-description {
    grid-column: 1 / -1;
  }
  .field-cover {
    grid-column: 1 / -1;
  }
  .field-full {
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
    transition: background-color 0.3s, border-color 0.3s;
    overflow: hidden;
  }
  .slug-input-wrapper:focus-within {
    border-color: var(--user-accent, var(--color-primary));
  }
  .slug-prefix {
    color: var(--color-text-subtle);
    font-size: 0.85rem;
    padding-left: 0.75rem;
    flex-shrink: 0;
    transition: color 0.3s;
  }
  .slug-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--color-text);
    font-family: monospace;
    font-size: 0.85rem;
    padding: 0.5rem 0.75rem 0.5rem 0.25rem;
    outline: none;
    min-width: 0;
  }
  .form-error {
    color: var(--color-danger, #ef4444) !important;
  }
  .slug-changed {
    color: var(--color-info, #3b82f6) !important;
  }
  .slug-changed code {
    font-size: 0.7rem;
    background: var(--color-bg-secondary);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
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
  .metadata-info {
    padding-top: 0.75rem;
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

  /* Meadow toggle */
  .meadow-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    cursor: pointer;
  }
  .meadow-toggle input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
    margin-top: 2px;
    flex-shrink: 0;
  }
  .meadow-toggle-text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .meadow-toggle-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
  }
  .meadow-toggle-hint {
    font-size: 0.75rem;
    color: var(--color-text-subtle);
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
    .edit-post-page {
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

  /* Mobile-specific refinements */
  @media (max-width: 600px) {
    .page-header {
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .page-header h1 {
      font-size: 1.35rem;
    }
    .inline-title {
      font-size: 1.35rem;
    }
    .header-actions {
      gap: 0.35rem;
    }
    .status-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
    }
    .details-strip {
      margin: 0.25rem 0 0.75rem;
    }
    .toggle-vines-btn {
      font-size: 0.8rem;
      padding: 0.4rem 0.75rem;
    }
  }
</style>
