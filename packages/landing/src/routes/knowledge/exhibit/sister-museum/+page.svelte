<script lang="ts">
  import { browser } from '$app/environment';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import SEO from '$lib/components/SEO.svelte';
  import { TableOfContents, MobileTOC } from '@autumnsgrove/groveengine';
  import { kbCategoryColors } from '$lib/utils/kb-colors';
  import { toolIcons } from '$lib/utils/icons';
  import '$lib/styles/content.css';

  let { data } = $props();

  let doc = $derived(data.doc);
  let sourceUrl = $derived(data.sourceUrl);
  let headers = $derived(doc?.headers || []);

  const colors = kbCategoryColors.exhibit;
  const GithubIcon = toolIcons.github;

  /**
   * Decode HTML entities safely without innerHTML
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
        const decodedText = decodeHtmlEntities(codeText);
        await navigator.clipboard.writeText(decodedText);

        const copyText = button.querySelector('.copy-text');
        const originalText = copyText?.textContent || 'Copy';
        if (copyText) copyText.textContent = 'Copied!';
        button.classList.add('copied');

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

    const copyButtons = document.querySelectorAll('.code-block-copy');
    copyButtons.forEach(button => {
      button.addEventListener('click', handleCopyClick);
    });

    return () => {
      copyButtons.forEach(button => {
        button.removeEventListener('click', handleCopyClick);
      });
    };
  });
</script>

<SEO
  title="The Original AutumnsGrove Museum — Grove"
  description="A living archive of the original AutumnsGrove website, preserved for learning. Walk through the source code of a real personal website."
  url="/knowledge/exhibit/sister-museum"
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
            <a href="/knowledge/exhibit" class="hover:text-foreground transition-colors">Art Exhibit</a>
            <span aria-hidden="true">/</span>
            <span class="text-foreground" aria-current="page">Sister Museum</span>
          </nav>

          <!-- External Source Banner -->
          <div class="mb-8 p-4 rounded-xl bg-gradient-to-r from-slate-100 to-violet-50 dark:from-slate-800 dark:to-violet-900/30 border border-violet-200 dark:border-violet-800">
            <div class="flex items-start gap-4">
              <div class="w-10 h-10 rounded-lg bg-slate-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                <GithubIcon class="w-5 h-5 text-white dark:text-slate-900" />
              </div>
              <div class="flex-1">
                <h2 class="font-semibold text-foreground mb-1">Dynamically Loaded from GitHub</h2>
                <p class="text-sm text-foreground-muted mb-2">
                  This content is fetched from the original AutumnsGrove repository at build time.
                  It's a living archive that updates whenever the source changes.
                </p>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 text-sm {colors.text} {colors.textDark} {colors.textHover} {colors.textHoverDark} font-medium transition-colors"
                >
                  View source on GitHub
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <!-- Article Header -->
          <header class="content-header">
            <div class="flex items-center gap-3 mb-4 flex-wrap">
              <!-- Category badge -->
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium {colors.badgeBg} {colors.badgeBgDark} {colors.badgeText} {colors.badgeTextDark}">
                Sister Museum
              </span>
              {#if doc.lastUpdated}
                <span class="text-sm text-foreground-subtle">Fetched {doc.lastUpdated}</span>
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
            {@html doc.html}
          </article>

          <!-- Article Footer -->
          <footer class="flex items-center justify-between mt-12 pt-8 border-t border-divider">
            <a
              href="/knowledge/exhibit"
              class="inline-flex items-center text-foreground-muted hover:text-foreground transition-colors"
              aria-label="Return to Art Exhibit"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Art Exhibit
            </a>

            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
              <GithubIcon class="w-4 h-4" />
              View on GitHub
            </a>
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
        <h1 class="text-4xl font-bold text-foreground mb-4">Content Unavailable</h1>
        <p class="text-xl text-foreground-muted mb-8">
          The sister museum content could not be loaded from GitHub.
        </p>
        <a href="/knowledge/exhibit" class="px-4 py-2 {colors.buttonBg} text-white rounded-lg {colors.buttonHover} transition-colors">
          Return to Art Exhibit
        </a>
      </div>
    {/if}
  </div>

  <Footer />
</main>
