<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { toolIcons, stateIcons, type ToolIconKey } from '$lib/utils/icons';
  import type { SpecCategory } from '$lib/types/docs';

  let { data } = $props();
  const specsList = $derived(data.specs);
  const categories = $derived(data.specCategories);

  // Type-safe icon getter (same pattern as workshop)
  function getIcon(icon: string | undefined) {
    if (!icon) return stateIcons.circle;
    return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
  }

  // Memoized specs by category (avoids repeated filtering in template)
  const specsByCategory = $derived(
    Object.fromEntries(
      categories.map(cat => [
        cat.id,
        specsList.filter(spec => spec.specCategory === cat.id)
      ])
    ) as Record<SpecCategory, typeof specsList>
  );

  // Generate category ID for anchor links
  function getCategoryId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // TOC state
  let isMobileTocOpen = $state(false);
</script>

<SEO
  title="Technical Specifications - Grove Knowledge Base"
  description="Technical specifications and implementation details for Grove platform, organized by category"
  url="/knowledge/specs"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
  <Header />

  <!-- Hero -->
  <section class="relative py-12 px-6 text-center bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
    <div class="max-w-3xl mx-auto">
      <nav class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span>/</span>
        <span class="text-foreground">Technical Specifications</span>
      </nav>
      <h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
        Technical Specifications
      </h1>
      <p class="text-lg text-foreground-muted max-w-xl mx-auto">
        Detailed documentation about Grove's architecture, features, and implementation details.
        Transparency into how everything works.
      </p>
    </div>
  </section>

  <!-- Floating TOC Icon Navigation (desktop) -->
  <nav class="fixed top-1/2 right-6 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3" aria-label="Category navigation">
    {#each categories as category}
      {@const CategoryIcon = getIcon(category.icon)}
      {@const categorySpecs = specsByCategory[category.id] ?? []}
      <div class="relative group">
        <a
          href="#{getCategoryId(category.name)}"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-all duration-200 motion-reduce:transition-none"
          aria-label="Jump to {category.name}"
          title="{category.name} ({categorySpecs.length})"
        >
          <CategoryIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none" />
        </a>

        <!-- Specs revealed on hover -->
        {#if categorySpecs.length > 0}
          <div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 motion-reduce:transition-none flex items-center gap-2 flex-wrap justify-end max-w-xs">
            {#each categorySpecs.slice(0, 6) as spec}
              {@const SpecIcon = getIcon(spec.icon)}
              <a
                href="/knowledge/specs/{spec.slug}"
                class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors motion-reduce:transition-none whitespace-nowrap"
                title={spec.description}
              >
                <SpecIcon class="w-3.5 h-3.5" />
                <span class="text-xs font-medium">{spec.title.split('—')[0].trim()}</span>
              </a>
            {/each}
            {#if categorySpecs.length > 6}
              <span class="text-xs text-foreground-muted">+{categorySpecs.length - 6} more</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <!-- Floating TOC Button & Dropdown (mobile) -->
  <div class="fixed bottom-6 right-6 z-50 lg:hidden">
    <button
      type="button"
      onclick={() => isMobileTocOpen = !isMobileTocOpen}
      class="w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none"
      aria-expanded={isMobileTocOpen}
      aria-label="Table of contents"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>

    {#if isMobileTocOpen}
      <div class="absolute bottom-16 right-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-amber-200 dark:border-slate-700 overflow-hidden max-h-[70vh] overflow-y-auto">
        <div class="px-4 py-3 border-b border-amber-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
          <span class="font-medium text-foreground">Navigate</span>
          <button type="button" onclick={() => isMobileTocOpen = false} class="text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded transition-colors motion-reduce:transition-none" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="py-2">
          {#each categories as category}
            {@const CategoryIcon = getIcon(category.icon)}
            {@const categorySpecs = specsByCategory[category.id] ?? []}
            <div class="mb-2">
              <a
                href="#{getCategoryId(category.name)}"
                onclick={() => isMobileTocOpen = false}
                class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:bg-amber-50 dark:focus-visible:bg-amber-900/20 focus-visible:text-foreground transition-colors motion-reduce:transition-none"
              >
                <CategoryIcon class="w-5 h-5 text-amber-500" />
                <span class="font-medium">{category.name}</span>
                <span class="ml-auto text-xs text-foreground-faint">{categorySpecs.length}</span>
              </a>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Categories -->
  <section class="flex-1 py-12 px-6">
    <div class="max-w-5xl mx-auto space-y-16">
      {#each categories as category}
        {@const categorySpecs = specsByCategory[category.id] ?? []}
        {@const CategoryIcon = getIcon(category.icon)}

        {#if categorySpecs.length > 0}
          <div id={getCategoryId(category.name)}>
            <!-- Category Header -->
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <CategoryIcon class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-2xl font-serif text-foreground">{category.name}</h2>
                <p class="text-foreground-muted">{category.description}</p>
              </div>
            </div>

            <!-- Specs Grid -->
            <div class="grid gap-4 md:grid-cols-2">
              {#each categorySpecs as spec}
                {@const SpecIcon = getIcon(spec.icon)}
                <article class="p-5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200/50 dark:border-slate-700 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/50 focus-within:shadow-md focus-within:border-amber-300 dark:focus-within:border-amber-700/50 transition-all motion-reduce:transition-none">
                  <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                      <SpecIcon class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-foreground leading-tight">
                        <a href="/knowledge/specs/{spec.slug}" class="hover:text-accent focus-visible:text-accent focus-visible:outline-none transition-colors motion-reduce:transition-none">
                          {spec.title}
                        </a>
                      </h3>
                      {#if spec.description}
                        <p class="text-sm text-foreground-muted mt-1 line-clamp-2">{spec.description}</p>
                      {/if}
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xs text-foreground-faint">
                    <span>{spec.readingTime} min read</span>
                    {#if spec.lastUpdated}
                      <span>Updated {spec.lastUpdated}</span>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      <!-- CTA -->
      <div class="text-center p-8 rounded-xl bg-amber-100/50 dark:bg-amber-950/25 backdrop-blur-md border border-dashed border-amber-300 dark:border-amber-800/30">
        <h3 class="text-xl font-semibold text-foreground mb-2">Have questions about our specs?</h3>
        <p class="text-foreground-muted mb-4">
          If you need clarification on any technical specification or want to suggest improvements, we'd love to hear from you.
        </p>
        <a href="mailto:autumnbrown23@pm.me" class="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
          Contact Us
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Links -->
  <section class="py-8 px-6 bg-white/50 dark:bg-slate-900/50 border-t border-divider">
    <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/patterns" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Architecture Patterns →
      </a>
    </div>
  </section>

  <Footer />
</main>
