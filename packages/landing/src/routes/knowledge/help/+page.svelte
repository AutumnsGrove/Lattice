<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { toolIcons, stateIcons, type ToolIconKey } from '$lib/utils/icons';
  import type { HelpSection } from '$lib/types/docs';

  let { data } = $props();
  const articles = $derived(data.helpArticles);
  const sections = $derived(data.helpSections);

  // Type-safe icon getter (same pattern as specs/workshop)
  function getIcon(icon: string | undefined) {
    if (!icon) return stateIcons.circle;
    return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
  }

  // Group articles by section (the magic line!)
  const articlesBySection = $derived(
    Object.fromEntries(
      sections.map(section => [
        section.id,
        articles.filter(article => article.section === section.id)
      ])
    ) as Record<HelpSection, typeof articles>
  );

  // Generate section ID for anchor links
  function getSectionId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // TOC state for mobile
  let isMobileTocOpen = $state(false);
</script>

<SEO
  title="Help Center - Grove Knowledge Base"
  description="Help articles and guides for using Grove platform"
  url="/knowledge/help"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <!-- Hero -->
  <section class="relative py-12 px-6 text-center bg-gradient-to-b from-emerald-50/80 via-transparent to-transparent dark:from-emerald-950/20 dark:via-transparent dark:to-transparent">
    <div class="max-w-3xl mx-auto">
      <nav class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span>/</span>
        <span class="text-foreground">Help Center</span>
      </nav>
      <h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
        Help Center
      </h1>
      <p class="text-lg text-foreground-muted max-w-xl mx-auto">
        Step-by-step guides and answers to common questions about using Grove.
        Whether you're just getting started or need help with a specific feature, you'll find it here.
      </p>
    </div>
  </section>

  <!-- Floating TOC Icon Navigation (desktop) -->
  <nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-2" aria-label="Section navigation">
    {#each sections as section}
      {@const SectionIcon = getIcon(section.icon)}
      {@const sectionArticles = articlesBySection[section.id] ?? []}
      {#if sectionArticles.length > 0}
        <div class="relative group">
          <a
            href="#{getSectionId(section.name)}"
            class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md border border-emerald-200 dark:border-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-all duration-200 motion-reduce:transition-none"
            aria-label="Jump to {section.name}"
            title="{section.name} ({sectionArticles.length})"
          >
            <SectionIcon class="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none" />
          </a>

          <!-- Section name tooltip on hover -->
          <div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 motion-reduce:transition-none">
            <div class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-emerald-200 dark:border-slate-700 text-sm font-medium text-foreground whitespace-nowrap">
              {section.name}
              <span class="text-foreground-muted">({sectionArticles.length})</span>
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </nav>

  <!-- Floating TOC Button & Dropdown (mobile) -->
  <div class="fixed bottom-6 right-6 z-grove-fab lg:hidden">
    <button
      type="button"
      onclick={() => isMobileTocOpen = !isMobileTocOpen}
      class="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none"
      aria-expanded={isMobileTocOpen}
      aria-label="Table of contents"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>

    {#if isMobileTocOpen}
      <div class="absolute bottom-16 right-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-emerald-200 dark:border-slate-700 overflow-hidden max-h-[70vh] overflow-y-auto">
        <div class="px-4 py-3 border-b border-emerald-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
          <span class="font-medium text-foreground">Sections</span>
          <button type="button" onclick={() => isMobileTocOpen = false} class="text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded transition-colors motion-reduce:transition-none" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="py-2">
          {#each sections as section}
            {@const SectionIcon = getIcon(section.icon)}
            {@const sectionArticles = articlesBySection[section.id] ?? []}
            {#if sectionArticles.length > 0}
              <a
                href="#{getSectionId(section.name)}"
                onclick={() => isMobileTocOpen = false}
                class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus-visible:outline-none focus-visible:bg-emerald-50 dark:focus-visible:bg-emerald-900/20 focus-visible:text-foreground transition-colors motion-reduce:transition-none"
              >
                <SectionIcon class="w-5 h-5 text-emerald-500" />
                <span class="font-medium">{section.name}</span>
                <span class="ml-auto text-xs text-foreground-faint">{sectionArticles.length}</span>
              </a>
            {/if}
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Sections -->
  <section class="flex-1 py-12 px-6">
    <div class="max-w-5xl mx-auto space-y-16">
      {#each sections as section}
        {@const sectionArticles = articlesBySection[section.id] ?? []}
        {@const SectionIcon = getIcon(section.icon)}

        {#if sectionArticles.length > 0}
          <div id={getSectionId(section.name)}>
            <!-- Section Header -->
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <SectionIcon class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-2xl font-serif text-foreground">{section.name}</h2>
                <p class="text-foreground-muted">{section.description}</p>
              </div>
            </div>

            <!-- Articles Grid -->
            <div class="grid gap-4">
              {#each sectionArticles as article}
                <article class="p-5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm border border-emerald-200/50 dark:border-slate-700 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700/50 focus-within:shadow-md focus-within:border-emerald-300 dark:focus-within:border-emerald-700/50 transition-all motion-reduce:transition-none">
                  <h3 class="text-lg font-semibold text-foreground mb-2">
                    <a href="/knowledge/help/{article.slug}" class="hover:text-emerald-600 dark:hover:text-emerald-400 focus-visible:outline-none focus-visible:text-emerald-600 dark:focus-visible:text-emerald-400 transition-colors motion-reduce:transition-none">
                      {article.title}
                    </a>
                  </h3>
                  <p class="text-foreground-muted mb-3 line-clamp-2">{article.excerpt}</p>
                  <div class="flex items-center justify-between text-sm">
                    <a href="/knowledge/help/{article.slug}" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors">
                      Read more
                      <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </a>
                    <span class="text-foreground-subtle">{article.readingTime} min read</span>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      <!-- Contact Support CTA -->
      <div class="text-center p-8 rounded-xl bg-emerald-100/50 dark:bg-emerald-950/25 backdrop-blur-md border border-dashed border-emerald-300 dark:border-emerald-800/30">
        <h3 class="text-xl font-semibold text-foreground mb-2">Need more help?</h3>
        <p class="text-foreground-muted mb-4">
          Can't find what you're looking for? Contact our support team and we'll get back to you within 48 hours.
        </p>
        <a href="mailto:hello@grove.place" class="inline-flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
          Contact Support
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Links -->
  <section class="py-8 px-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-t border-divider">
    <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/specs" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Technical Specs →
      </a>
    </div>
  </section>

  <Footer />
</main>
