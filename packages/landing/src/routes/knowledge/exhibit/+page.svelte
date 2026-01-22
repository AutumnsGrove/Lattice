<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { toolIcons, stateIcons, type ToolIconKey } from '$lib/utils/icons';
  import { kbCategoryColors } from '$lib/utils/kb-colors';
  import type { ExhibitWing } from '$lib/types/docs';

  const colors = kbCategoryColors.exhibit;

  let { data } = $props();
  const exhibits = $derived(data.exhibits);
  const wings = $derived(data.exhibitWings);

  // Type-safe icon getter (same pattern as specs)
  function getIcon(icon: string | undefined) {
    if (!icon) return stateIcons.circle;
    return toolIcons[icon as ToolIconKey] ?? stateIcons.circle;
  }

  // Memoized exhibits by wing (avoids repeated filtering in template)
  const exhibitsByWing = $derived(
    Object.fromEntries(
      wings.map(wing => [
        wing.id,
        exhibits.filter(exhibit => exhibit.exhibitWing === wing.id)
      ])
    ) as Record<ExhibitWing, typeof exhibits>
  );

  // Generate wing ID for anchor links
  function getWingId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  // TOC state
  let isMobileTocOpen = $state(false);
</script>

<SEO
  title="Art Exhibit - Grove Knowledge Base"
  description="The Lattice Museum: A guided tour through how Grove grows. Explore the architecture, philosophy, and design behind the platform."
  url="/knowledge/exhibit"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
  <Header />

  <!-- Hero -->
  <section class="relative py-12 px-6 text-center bg-gradient-to-b from-teal-50 via-slate-50 to-white dark:from-teal-950/30 dark:via-slate-900 dark:to-slate-950">
    <div class="max-w-3xl mx-auto">
      <nav class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span>/</span>
        <span class="text-foreground">Art Exhibit</span>
      </nav>
      <h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
        The Lattice Museum
      </h1>
      <p class="text-lg text-foreground-muted max-w-xl mx-auto mb-6">
        A guided tour through how this forest grows. This is the story of Grove, told through
        the systems that make it work.
      </p>
      <p class="text-sm text-foreground-faint italic max-w-md mx-auto">
        Not the dusty kind with ropes and "do not touch" signs. This is the kind where you can peek behind every curtain.
      </p>
    </div>
  </section>

  <!-- Floating TOC Icon Navigation (desktop) -->
  <nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-3" aria-label="Wing navigation">
    {#each wings as wing}
      {@const WingIcon = getIcon(wing.icon)}
      {@const wingExhibits = exhibitsByWing[wing.id] ?? []}
      <div class="relative group">
        <a
          href="#{getWingId(wing.name)}"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md border border-teal-200 dark:border-slate-700 hover:bg-teal-100 dark:hover:bg-teal-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-all duration-200 motion-reduce:transition-none"
          aria-label="Jump to {wing.name}"
          title="{wing.name} ({wingExhibits.length})"
        >
          <WingIcon class="w-5 h-5 {colors.text} {colors.textDark} group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none" />
        </a>

        <!-- Exhibits revealed on hover -->
        {#if wingExhibits.length > 0}
          <div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 motion-reduce:transition-none flex items-center gap-2 flex-wrap justify-end max-w-xs">
            {#each wingExhibits.slice(0, 6) as exhibit}
              {@const ExhibitIcon = getIcon(exhibit.icon)}
              <a
                href="/knowledge/exhibit/{exhibit.slug}"
                class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 shadow-md border border-teal-200 dark:border-slate-700 {colors.text} {colors.textDark} hover:bg-teal-100 dark:hover:bg-teal-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors motion-reduce:transition-none whitespace-nowrap"
                title={exhibit.description}
              >
                <ExhibitIcon class="w-3.5 h-3.5" />
                <span class="text-xs font-medium">{exhibit.title.split('—')[0].trim()}</span>
              </a>
            {/each}
            {#if wingExhibits.length > 6}
              <span class="text-xs text-foreground-muted">+{wingExhibits.length - 6} more</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>

  <!-- Floating TOC Button & Dropdown (mobile) -->
  <div class="fixed bottom-6 right-6 z-grove-fab lg:hidden">
    <button
      type="button"
      onclick={() => isMobileTocOpen = !isMobileTocOpen}
      class="w-12 h-12 rounded-full bg-teal-500 text-white shadow-lg flex items-center justify-center hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none"
      aria-expanded={isMobileTocOpen}
      aria-label="Table of contents"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    </button>

    {#if isMobileTocOpen}
      <div class="absolute bottom-16 right-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-teal-200 dark:border-slate-700 overflow-hidden max-h-[70vh] overflow-y-auto">
        <div class="px-4 py-3 border-b border-teal-200 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
          <span class="font-medium text-foreground">Navigate</span>
          <button type="button" onclick={() => isMobileTocOpen = false} class="text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded transition-colors motion-reduce:transition-none" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="py-2">
          {#each wings as wing}
            {@const WingIcon = getIcon(wing.icon)}
            {@const wingExhibits = exhibitsByWing[wing.id] ?? []}
            <div class="mb-2">
              <a
                href="#{getWingId(wing.name)}"
                onclick={() => isMobileTocOpen = false}
                class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-teal-50 dark:hover:bg-teal-900/20 focus-visible:outline-none focus-visible:bg-teal-50 dark:focus-visible:bg-teal-900/20 focus-visible:text-foreground transition-colors motion-reduce:transition-none"
              >
                <WingIcon class="w-5 h-5 text-teal-500" />
                <span class="font-medium">{wing.name}</span>
                <span class="ml-auto text-xs text-foreground-faint">{wingExhibits.length}</span>
              </a>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Wings -->
  <section class="flex-1 py-12 px-6">
    <div class="max-w-5xl mx-auto space-y-16">
      {#each wings as wing}
        {@const wingExhibits = exhibitsByWing[wing.id] ?? []}
        {@const WingIcon = getIcon(wing.icon)}

        {#if wingExhibits.length > 0}
          <div id={getWingId(wing.name)}>
            <!-- Wing Header -->
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 rounded-xl {colors.iconBg} {colors.iconBgDark} flex items-center justify-center {colors.text} {colors.textDark}">
                <WingIcon class="w-6 h-6" />
              </div>
              <div>
                <h2 class="text-2xl font-serif text-foreground">{wing.name}</h2>
                <p class="text-foreground-muted">{wing.description}</p>
              </div>
            </div>

            <!-- Exhibits Grid -->
            <div class="grid gap-4 md:grid-cols-2">
              {#each wingExhibits as exhibit}
                {@const ExhibitIcon = getIcon(exhibit.icon)}
                <article class="p-5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-teal-200/50 dark:border-slate-700 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700/50 focus-within:shadow-md focus-within:border-teal-300 dark:focus-within:border-teal-700/50 transition-all motion-reduce:transition-none">
                  <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg {colors.iconBg} {colors.iconBgDark} flex items-center justify-center {colors.text} {colors.textDark} flex-shrink-0">
                      <ExhibitIcon class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-foreground leading-tight">
                        <a href="/knowledge/exhibit/{exhibit.slug}" class="{colors.textHover} {colors.textHoverDark} focus-visible:outline-none transition-colors motion-reduce:transition-none">
                          {exhibit.title}
                        </a>
                      </h3>
                      {#if exhibit.description}
                        <p class="text-sm text-foreground-muted mt-1 line-clamp-2">{exhibit.description}</p>
                      {/if}
                    </div>
                  </div>

                  <div class="flex items-center justify-between text-xs text-foreground-faint">
                    <span>{exhibit.readingTime} min read</span>
                    {#if exhibit.lastUpdated}
                      <span>Updated {exhibit.lastUpdated}</span>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          </div>
        {/if}
      {/each}

      <!-- Vine commentary note -->
      <div class="text-center p-8 rounded-xl {colors.ctaBg} {colors.ctaBgDark} backdrop-blur-md border border-dashed {colors.ctaBorder} {colors.ctaBorderDark}">
        <h3 class="text-xl font-semibold text-foreground mb-2">Look for the vines</h3>
        <p class="text-foreground-muted mb-4">
          Each exhibit may have commentary in the margins. These are personal notes from the curator,
          adding context to the documentation.
        </p>
        <a href="/knowledge/exhibit/MUSEUM" class="inline-flex items-center px-4 py-2 {colors.buttonBg} text-white rounded-lg {colors.buttonHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
          Start the Tour
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Links -->
  <section class="py-8 px-6 bg-white/50 dark:bg-slate-900/50 border-t border-divider">
    <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/specs" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Technical Specifications →
      </a>
    </div>
  </section>

  <Footer />
</main>
