<script>
  import { goto } from "$app/navigation";
  import MarkdownEditor from "$lib/components/admin/MarkdownEditor.svelte";
  import { Input, Textarea, Button, GlassCard, GlassConfirmDialog } from '$lib/ui';
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils";

  // Form state
  let title = $state("");
  let slug = $state("");
  let description = $state("");
  let content = $state("# New Page\n\nStart writing...");
  let autoGenerateSlug = $state(true);

  // Hero section state
  let heroTitle = $state("");
  let heroSubtitle = $state("");
  let heroCtaText = $state("");
  let heroCtaLink = $state("");
  let hasHero = $state(false);

  // UI state
  let creating = $state(false);
  let slugError = $state("");
  let showDiscardDialog = $state(false);

  // Auto-generate slug from title
  $effect(() => {
    if (autoGenerateSlug && title) {
      slug = title
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }
  });

  // Validate slug format
  function validateSlugInput() {
    if (!slug) {
      slugError = "";
      return;
    }

    // Check for valid slug format (lowercase, numbers, hyphens only)
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      slugError = "Slug must contain only lowercase letters, numbers, and hyphens";
      return;
    }

    slugError = "";
  }

  // Validate URL for safe schemes (prevent javascript: XSS)
  /** @param {string | null | undefined} url */
  function isValidUrl(url) {
    if (!url) return true;
    const trimmed = url.trim();
    // Allow relative paths starting with /
    if (trimmed.startsWith('/')) return true;
    // Allow http:// and https:// URLs
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
    // Allow anchor links
    if (trimmed.startsWith('#')) return true;
    return false;
  }

  async function handleCreate() {
    // Validation
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    if (slugError) {
      toast.error("Please fix slug errors");
      return;
    }
    if (heroCtaLink && !isValidUrl(heroCtaLink)) {
      toast.error("CTA link must be a relative path (/) or valid URL (http/https)");
      return;
    }

    creating = true;

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

      const response = await api.post('/api/pages', {
        title: title.trim(),
        slug: slug || undefined, // Let backend generate if empty
        description: description.trim(),
        markdown_content: content,
        hero: hero ? JSON.stringify(hero) : null,
      });

      toast.success("Page created successfully!");

      // Redirect to edit page for new page
      goto(`/arbor/pages/edit/${response.slug}`);

    } catch (err) {
      // Handle slug collision with suggestion
      if (err instanceof Error && err.message.includes('already exists')) {
        try {
          // Try to parse error for suggested slug
          const errorData = JSON.parse(err.message);
          if (errorData.suggested_slug) {
            slug = errorData.suggested_slug;
            autoGenerateSlug = false;
            slugError = errorData.message;
          } else {
            slugError = "A page with this slug already exists";
          }
        } catch {
          slugError = "A page with this slug already exists";
        }
        toast.error("Slug already exists. Please use a different slug.");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to create page");
      }
    } finally {
      creating = false;
    }
  }

  function handleCancel() {
    if (title || content !== "# New Page\n\nStart writing...") {
      showDiscardDialog = true;
    } else {
      goto('/arbor/pages');
    }
  }

  function handleDiscardConfirm() {
    goto('/arbor/pages');
  }
</script>

<div class="max-w-screen-2xl mx-auto">
  <header class="flex justify-between items-start mb-6 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-foreground">
        Create New Page
      </h1>
      <p class="m-0 text-sm text-foreground-muted">
        Add a new page to your site
      </p>
    </div>
    <div class="flex gap-2 max-md:flex-col">
      <Button variant="outline" onclick={handleCancel}>
        Cancel
      </Button>
      <Button variant="primary" onclick={handleCreate} disabled={creating}>
        {creating ? 'Creating...' : 'Create Page'}
      </Button>
    </div>
  </header>

  <div class="editor-container">
    <!-- Page Details Section -->
    <GlassCard variant="default" class="details-section">
      <div class="details-content">
        <h2 class="m-0 mb-4 text-xl text-foreground">
          Page Details
        </h2>

        <div class="form-group">
          <label for="title">Title <span class="text-red-500">*</span></label>
          <Input
            id="title"
            bind:value={title}
            placeholder="About Us"
            required
          />
        </div>

        <div class="form-group">
          <label for="slug">
            URL Slug
            <span class="text-xs text-foreground-muted ml-2">
              (Auto-generated from title)
            </span>
          </label>
          <div class="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="autoSlug"
              bind:checked={autoGenerateSlug}
              class="w-4 h-4"
            />
            <label for="autoSlug" class="m-0 text-sm cursor-pointer">Auto-generate slug</label>
          </div>
          <Input
            id="slug"
            bind:value={slug}
            placeholder="about-us"
            disabled={autoGenerateSlug}
            onblur={validateSlugInput}
            class={slugError ? 'border-red-500' : ''}
          />
          {#if slugError}
            <p class="text-sm text-red-500 mt-1">{slugError}</p>
          {:else}
            <p class="text-xs text-foreground-muted mt-1">
              Preview: /{slug || 'your-page-slug'}
            </p>
          {/if}
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <Textarea
            id="description"
            bind:value={description}
            placeholder="A brief description for search engines"
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
    </GlassCard>

    <!-- Markdown Editor -->
    <GlassCard variant="default" class="editor-section">
      <h2 class="m-0 mb-4 text-xl text-foreground">
        Content <span class="text-red-500">*</span>
      </h2>
      <MarkdownEditor
        bind:content
      />
    </GlassCard>
  </div>
</div>

<GlassConfirmDialog
  bind:open={showDiscardDialog}
  title="Discard Changes?"
  message="You have unsaved changes. Are you sure you want to discard them and return to the pages list?"
  confirmLabel="Discard"
  variant="warning"
  onconfirm={handleDiscardConfirm}
/>

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .details-content {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  :global(.dark) .form-group label {
    color: var(--color-text-dark);
  }

  .hero-fields {
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: var(--border-radius-standard);
    transition: background-color 0.3s ease;
  }

  :global(.dark) .hero-fields {
    background: var(--color-bg-secondary-dark);
  }

  .cta-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .cta-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
