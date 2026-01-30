<script lang="ts">
  import { page } from '$app/state';
  import { browser } from '$app/environment';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { Trace } from '@autumnsgrove/groveengine/ui/feedback';
  import SEO from '$lib/components/SEO.svelte';
  import { TableOfContents, MobileTOC } from '@autumnsgrove/groveengine';
  import RelatedArticles from '$lib/components/RelatedArticles.svelte';
  import { kbCategoryColors, categoryLabels } from '$lib/utils/kb-colors';
  import type { DocCategory } from '$lib/types/docs';
  import '$lib/styles/content.css';

  let { data } = $props();

  let doc = $derived(data.doc);
  let relatedArticles = $derived(data.relatedArticles || []);
  let category = $derived(page.params.category as DocCategory);
  let slug = $derived(page.params.slug);
  let headers = $derived(doc?.headers || []);

  // Get colors for current category (with fallback)
  let colors = $derived(kbCategoryColors[category] || kbCategoryColors.help);

  let categoryTitle = $derived(
    categoryLabels[category] ||
    (category === 'specs' ? 'Technical Specifications' :
    category === 'help' ? 'Help Center' :
    category === 'patterns' ? 'Architecture Patterns' :
    category === 'marketing' ? 'Marketing & Launch' : 'Legal & Policies')
  );

  /**
   * Decode HTML entities safely without innerHTML
   * Handles common entities: &amp; &lt; &gt; &quot; &#39;
   */
  function decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Setup copy button functionality for code blocks
  $effect(() => {
    if (!browser) return;

    const handleCopyClick = async (event: Event) => {
      const button = event.currentTarget as HTMLElement;
      const codeText = button.getAttribute('data-code');

      if (!codeText) return;

      try {
        // Decode HTML entities back to original text safely
        const decodedText = decodeHtmlEntities(codeText);

        await navigator.clipboard.writeText(decodedText);

        // Update button text and style to show success
        const copyText = button.querySelector('.copy-text');
        const originalText = copyText?.textContent || 'Copy';
        if (copyText) copyText.textContent = 'Copied!';
        button.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
          if (copyText) copyText.textContent = originalText;
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code:', err);
        const copyText = button.querySelector('.copy-text');
        if (copyText) copyText.textContent = 'Failed';
        setTimeout(() => {
          if (copyText) copyText.textContent = 'Copy';
        }, 2000);
      }
    };

    // Attach event listeners to all copy buttons
    const copyButtons = document.querySelectorAll('.code-block-copy');
    copyButtons.forEach(button => {
      button.addEventListener('click', handleCopyClick);
    });

    // Cleanup
    return () => {
      copyButtons.forEach(button => {
        button.removeEventListener('click', handleCopyClick);
      });
    };
  });
</script>

<SEO
  title={`${doc?.title || 'Not Found'} — Grove`}
  description={doc?.description || doc?.excerpt || "Grove knowledge base article"}
  url={`/knowledge/${category}/${slug}`}
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <div class="flex-1 px-6 py-12">
    {#if doc}
      <!-- Two-column layout: content + TOC -->
      <div class="max-w-7xl mx-auto flex gap-8">
        <!-- Main content -->
        <div class="flex-1 min-w-0 max-w-4xl">
          <!-- Breadcrumb -->
          <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8" aria-label="Breadcrumb">
            <a href="/knowledge" class="hover:text-foreground transition-colors">Knowledge Base</a>
            <span aria-hidden="true">/</span>
            <a href="/knowledge/{category}" class="hover:text-foreground transition-colors">{categoryTitle}</a>
            <span aria-hidden="true">/</span>
            <span class="text-foreground" aria-current="page">{doc.title}</span>
          </nav>

          <!-- Article Header -->
          <header class="content-header">
            <div class="flex items-center gap-3 mb-4 flex-wrap">
              <!-- Seasonal category badge -->
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {colors.badgeBg} {colors.badgeBgDark} {colors.badgeText} {colors.badgeTextDark}">
                {#if category === 'specs'}
                  Technical Spec
                {:else if category === 'help'}
                  Help Article
                {:else if category === 'patterns'}
                  Architecture Pattern
                {:else if category === 'marketing'}
                  Marketing
                {:else if category === 'philosophy'}
                  Philosophy
                {:else if category === 'design'}
                  Design
                {:else if category === 'exhibit'}
                  Art Exhibit
                {:else}
                  Legal Document
                {/if}
              </span>
              {#if doc.lastUpdated}
                <span class="text-sm text-foreground-subtle">Updated {doc.lastUpdated}</span>
              {/if}
              <span class="text-sm text-foreground-subtle">{doc.readingTime} min read</span>
            </div>
            <h1>{doc.title}</h1>
            {#if doc.description}
              <p class="text-xl text-foreground-muted mt-4">{doc.description}</p>
            {/if}
          </header>

          <!-- Article Content -->
          <article class="content-body prose prose-slate dark:prose-invert max-w-none">
            {@html doc.html || `<p class="text-foreground-muted leading-relaxed">${doc.excerpt}</p>`}
          </article>

          <!-- Related Articles -->
          <RelatedArticles articles={relatedArticles} />

          <!-- Feedback -->
          <div class="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <Trace prompt="Was this article helpful?" />
          </div>

          <!-- Article Footer -->
          <footer class="flex items-center justify-between mt-12">
            <a
              href="/knowledge/{category}"
              class="inline-flex items-center text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Return to {categoryTitle}"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to {categoryTitle}
            </a>

            <div class="flex gap-4">
              <a
                href="mailto:hello@grove.place"
                class="text-foreground-muted hover:text-foreground transition-colors"
                aria-label="Contact support via email"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </a>
            </div>
          </footer>
        </div>

        <!-- Table of Contents sidebar -->
        <aside class="hidden lg:block w-64 flex-shrink-0">
          <TableOfContents {headers} />
        </aside>
      </div>

      <!-- Mobile TOC (floating button) -->
      <MobileTOC {headers} />
    {:else}
      <!-- 404 -->
      <div class="text-center py-12 max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-foreground mb-4">Document Not Found</h1>
        <p class="text-xl text-foreground-muted mb-8">
          The document you're looking for doesn't exist or has been moved.
        </p>
        <div class="flex gap-4 justify-center flex-wrap">
          <a href="/knowledge" class="px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground-muted transition-colors">
            Knowledge Base Home
          </a>
          <a href="/knowledge/specs" class="px-4 py-2 {kbCategoryColors.specs.badgeBg} {kbCategoryColors.specs.badgeBgDark} {kbCategoryColors.specs.badgeText} {kbCategoryColors.specs.badgeTextDark} rounded-lg hover:opacity-80 transition-colors">
            Browse Specs
          </a>
          <a href="/knowledge/help" class="px-4 py-2 {kbCategoryColors.help.badgeBg} {kbCategoryColors.help.badgeBgDark} {kbCategoryColors.help.badgeText} {kbCategoryColors.help.badgeTextDark} rounded-lg hover:opacity-80 transition-colors">
            Browse Help
          </a>
        </div>
      </div>
    {/if}
  </div>

  <Footer />
</main>
