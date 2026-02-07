<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { CategoryNav } from '@autumnsgrove/groveengine';
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

  // CategoryNav sections
  const navSections = $derived(
    wings.map(w => ({
      id: w.id,
      name: w.name,
      icon: getIcon(w.icon)
    }))
  );

  // CategoryNav items (exhibits grouped by wing)
  const navItems = $derived(
    Object.fromEntries(
      wings.map(w => [
        w.id,
        (exhibitsByWing[w.id] ?? []).map(exhibit => ({
          id: exhibit.slug,
          title: exhibit.title.split('—')[0].trim(),
          icon: getIcon(exhibit.icon),
          description: exhibit.description
        }))
      ])
    )
  );
</script>

<SEO
  title="Art Exhibit - Grove Knowledge Base"
  description="The Lattice Museum: A guided tour through how Grove grows. Explore the architecture, philosophy, and design behind the platform."
  url="/knowledge/exhibit"
/>

<main class="min-h-screen flex flex-col bg-cream-50 dark:bg-bark-900">
  <Header user={data.user} />

  <!-- Hero -->
  <section class="relative py-12 px-6 text-center bg-gradient-to-b from-violet-50 via-cream-50 to-white dark:from-violet-950/30 dark:via-bark-900 dark:to-bark-950">
    <div class="max-w-3xl mx-auto">
      <nav aria-label="Breadcrumb" class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground" aria-current="page">Art Exhibit</span>
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

  <!-- Floating Category Navigation -->
  <CategoryNav
    sections={navSections}
    items={navItems}
    getItemHref={(item) => `/knowledge/exhibit/${item.id}`}
    color="violet"
    ariaLabel="Wing navigation"
  />

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
                <article class="p-5 rounded-xl bg-white dark:bg-bark-800 shadow-sm border border-violet-200/50 dark:border-bark-700 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700/50 focus-within:shadow-md focus-within:border-violet-300 dark:focus-within:border-violet-700/50 transition-all motion-reduce:transition-none">
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
        <a href="/knowledge/exhibit/MUSEUM" class="inline-flex items-center px-4 py-2 {colors.buttonBg} text-white rounded-lg {colors.buttonHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
          Start the Tour
          <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>
  </section>

  <!-- Links -->
  <section class="py-8 px-6 bg-white/70 dark:bg-bark-900/50 border-t border-divider">
    <div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-cream-100 dark:bg-bark-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/specs" class="px-4 py-2 rounded-lg bg-cream-100 dark:bg-bark-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Technical Specifications →
      </a>
    </div>
  </section>

  <Footer />
</main>
