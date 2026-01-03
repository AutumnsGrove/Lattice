<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import { Input, Textarea, Button, GlassCard } from '$lib/ui';
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils/api.js";

  /**
   * @typedef {Object} PageData
   * @property {string} slug
   * @property {string} title
   * @property {string} description
   * @property {string} markdown_content
   * @property {{ title?: string; subtitle?: string; cta?: { text: string; link: string } } | null} hero
   * @property {string} gutter_content
   */

  /**
   * @type {{ data: { page: PageData } }}
   */
  let { data } = $props();

  // Form state - initialized from loaded data
  let title = $state("");
  let slug = $state("");
  let description = $state("");
  let content = $state("");

  // Hero section state
  let heroTitle = $state("");
  let heroSubtitle = $state("");
  let heroCtaText = $state("");
  let heroCtaLink = $state("");
  let hasHero = $state(false);

  // Initialize form state from data
  $effect(() => {
    title = data.page.title || "";
    slug = data.page.slug || "";
    description = data.page.description || "";
    content = data.page.markdown_content || "";
    heroTitle = data.page.hero?.title || "";
    heroSubtitle = data.page.hero?.subtitle || "";
    heroCtaText = data.page.hero?.cta?.text || "";
    heroCtaLink = data.page.hero?.cta?.link || "";
    hasHero = !!data.page.hero;
  });

  // Editor reference for anchor insertion
  /** @type {import('$lib/components/admin/MarkdownEditor.svelte').default | null} */
  let editorRef = $state(null);

  // UI state
  let saving = $state(false);
  let hasUnsavedChanges = $state(false);
  let detailsCollapsed = $state(false);

  // Track original values for unsaved changes detection
  let originalTitle = $state("");
  let originalDescription = $state("");
  let originalContent = $state("");
  let originalHeroTitle = $state("");
  let originalHeroSubtitle = $state("");
  let originalHeroCtaText = $state("");
  let originalHeroCtaLink = $state("");

  // Load collapsed state from localStorage
  onMount(() => {
    if (browser) {
      const saved = localStorage.getItem("editor-details-collapsed");
      if (saved !== null) {
        detailsCollapsed = saved === "true";
      }
    }
  });

  function toggleDetailsCollapsed() {
    detailsCollapsed = !detailsCollapsed;
    if (browser) {
      localStorage.setItem("editor-details-collapsed", String(detailsCollapsed));
    }
  }

  // Update original values when data changes
  $effect(() => {
    originalTitle = data.page.title || "";
    originalDescription = data.page.description || "";
    originalContent = data.page.markdown_content || "";
    originalHeroTitle = data.page.hero?.title || "";
    originalHeroSubtitle = data.page.hero?.subtitle || "";
    originalHeroCtaText = data.page.hero?.cta?.text || "";
    originalHeroCtaLink = data.page.hero?.cta?.link || "";
  });

  // Track changes
  $effect(() => {
    const hasChanges =
      title !== originalTitle ||
      description !== originalDescription ||
      content !== originalContent ||
      heroTitle !== originalHeroTitle ||
      heroSubtitle !== originalHeroSubtitle ||
      heroCtaText !== originalHeroCtaText ||
      heroCtaLink !== originalHeroCtaLink;
    hasUnsavedChanges = hasChanges;
  });

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
      // Build hero object if enabled
      /** @type {{ title: string; subtitle: string; cta?: { text: string; link: string } } | null} */
      let hero = null;
      if (hasHero && heroTitle.trim()) {
        hero = {
          title: heroTitle.trim(),
          subtitle: heroSubtitle.trim(),
        };
        if (heroCtaText.trim() && heroCtaLink.trim()) {
          hero.cta = {
            text: heroCtaText.trim(),
            link: heroCtaLink.trim(),
          };
        }
      }

      await api.put(`/api/pages/${slug}`, {
        title: title.trim(),
        description: description.trim(),
        markdown_content: content,
        hero: hero ? JSON.stringify(hero) : null,
      });

      // Clear draft on successful save
      editorRef?.clearDraft();

      toast.success("Page saved successfully!");
      hasUnsavedChanges = false;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update page");
    } finally {
      saving = false;
    }
  }

  /**
   * Warn about unsaved changes
   * @param {BeforeUnloadEvent} e
   */
  function handleBeforeUnload(e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = "";
    }
  }
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<div class="max-w-screen-2xl mx-auto">
  <header class="flex justify-between items-start mb-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">
        Edit Page: {data.page.title}
      </h1>
      <p class="m-0 text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] transition-colors">
        Slug: {slug}
        {#if hasUnsavedChanges}
          <span class="unsaved-indicator">• Unsaved changes</span>
        {/if}
      </p>
    </div>
    <div class="flex gap-2 max-md:flex-col">
      <Button variant="outline" onclick={() => goto('/admin/pages')}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleSave} disabled={saving || !hasUnsavedChanges}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  </header>

  <div class="editor-container">
    <!-- Page Details Section -->
    <GlassCard variant="default" class="details-section">
      <button class="details-header" onclick={toggleDetailsCollapsed}>
        <h2 class="m-0 text-xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">
          Page Details
        </h2>
        <span class="collapse-icon">{detailsCollapsed ? '▼' : '▲'}</span>
      </button>

      {#if !detailsCollapsed}
        <div class="details-content">
          <div class="form-group">
            <label for="title">Title</label>
            <Input
              id="title"
              bind:value={title}
              placeholder="Page title"
              required
            />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <Textarea
              id="description"
              bind:value={description}
              placeholder="A brief description of this page"
              rows={2}
            />
          </div>

          <!-- Hero Section -->
          <div class="form-group">
            <div class="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="hasHero"
                bind:checked={hasHero}
                class="w-4 h-4"
              />
              <label for="hasHero" class="m-0 cursor-pointer">Enable Hero Section</label>
            </div>

            {#if hasHero}
              <div class="hero-fields">
                <div class="form-group">
                  <label for="heroTitle">Hero Title</label>
                  <Input
                    id="heroTitle"
                    bind:value={heroTitle}
                    placeholder="Welcome to..."
                  />
                </div>

                <div class="form-group">
                  <label for="heroSubtitle">Hero Subtitle</label>
                  <Input
                    id="heroSubtitle"
                    bind:value={heroSubtitle}
                    placeholder="A brief tagline"
                  />
                </div>

                <div class="cta-fields">
                  <div class="form-group">
                    <label for="heroCtaText">CTA Button Text</label>
                    <Input
                      id="heroCtaText"
                      bind:value={heroCtaText}
                      placeholder="Learn More"
                    />
                  </div>

                  <div class="form-group">
                    <label for="heroCtaLink">CTA Button Link</label>
                    <Input
                      id="heroCtaLink"
                      bind:value={heroCtaLink}
                      placeholder="/blog"
                    />
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </GlassCard>

    <!-- Markdown Editor -->
    <GlassCard variant="default" class="editor-section">
      <h2 class="m-0 mb-4 text-xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">
        Content
      </h2>
      <MarkdownEditor
        bind:this={editorRef}
        bind:content
        draftKey="page-{slug}"
      />
    </GlassCard>
  </div>
</div>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  :global(.details-section) {
    overflow: hidden;
  }

  .details-header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .details-header:hover {
    background: var(--color-bg-tertiary);
  }

  :global(.dark) .details-header:hover {
    background: var(--color-bg-primary-dark);
  }

  .collapse-icon {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }

  :global(.dark) .collapse-icon {
    color: var(--color-text-subtle-dark);
  }

  .details-content {
    padding: 0 1.5rem 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  :global(.dark) label {
    color: var(--color-text-dark);
  }

  .hero-fields {
    padding: 1rem;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: var(--border-radius-standard);
    margin-top: 0.5rem;
    transition: background-color 0.3s ease, border-color 0.3s ease;
  }

  :global(.dark) .hero-fields {
    background: rgba(30, 41, 59, 0.4);
    border-color: rgba(71, 85, 105, 0.3);
  }

  .cta-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 768px) {
    .cta-fields {
      grid-template-columns: 1fr;
    }
  }

  :global(.editor-section) {
    padding: 1.5rem;
  }

  .unsaved-indicator {
    color: var(--color-warning);
    font-weight: 600;
  }
</style>
