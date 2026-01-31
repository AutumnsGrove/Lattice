<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { GlassLegend } from '@autumnsgrove/groveengine/ui';
  import { CategoryNav } from '@autumnsgrove/groveengine';
  import { toolIcons, stateIcons, type ToolIconKey } from '$lib/utils/icons';
  import { kbCategoryColors } from '$lib/utils/kb-colors';
  import type { SpecCategory } from '$lib/types/docs';

  const colors = kbCategoryColors.specs;

  // Status legend items for the specs page
  const statusLegend = [
    { label: 'Active', description: 'In production', color: 'green' as const },
    { label: 'New', description: 'Recently added', color: 'amber' as const },
    { label: 'Planned', description: 'Coming soon', color: 'slate' as const },
    { label: 'Reference', description: 'Documentation only', color: 'blue' as const },
    { label: 'Client', description: 'Customer-specific', color: 'purple' as const },
  ];

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

  // CategoryNav sections
  const navSections = $derived(
    categories.map(c => ({
      id: c.id,
      name: c.name,
      icon: getIcon(c.icon)
    }))
  );

  // CategoryNav items (specs grouped by category)
  const navItems = $derived(
    Object.fromEntries(
      categories.map(c => [
        c.id,
        (specsByCategory[c.id] ?? []).map(spec => ({
          id: spec.slug,
          title: spec.title.split('—')[0].trim(),
          icon: getIcon(spec.icon),
          description: spec.description
        }))
      ])
    )
  );
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
      <nav aria-label="Breadcrumb" class="flex items-center justify-center space-x-2 text-sm text-foreground-muted mb-6">
        <a href="/knowledge" class="hover:text-accent focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded transition-colors">Knowledge Base</a>
        <span aria-hidden="true">/</span>
        <span class="text-foreground" aria-current="page">Technical Specifications</span>
      </nav>
      <h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
        Technical Specifications
      </h1>
      <p class="text-lg text-foreground-muted max-w-xl mx-auto mb-6">
        Detailed documentation about Grove's architecture, features, and implementation details.
        Transparency into how everything works.
      </p>

      <GlassLegend
        title="Status Legend"
        items={statusLegend}
        layout="inline"
        compact
        collapsible
        defaultOpen={false}
        class="max-w-md mx-auto"
      />
    </div>
  </section>

  <!-- Floating Category Navigation -->
  <CategoryNav
    sections={navSections}
    items={navItems}
    getItemHref={(item) => `/knowledge/specs/${item.id}`}
    color="violet"
    ariaLabel="Category navigation"
  />

  <!-- Categories -->
  <section class="flex-1 py-12 px-6">
    <div class="max-w-5xl mx-auto space-y-16">
      {#each categories as category}
        {@const categorySpecs = specsByCategory[category.id] ?? []}
        {@const CategoryIcon = getIcon(category.icon)}

        {#if categorySpecs.length > 0}
          <div id={getCategoryId(category.name)}>
            <!-- Category Header - Midnight Bloom -->
            <div class="flex items-center gap-4 mb-8">
              <div class="w-12 h-12 rounded-xl {colors.iconBg} {colors.iconBgDark} flex items-center justify-center {colors.text} {colors.textDark}">
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
                <article class="p-5 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-violet-200/50 dark:border-slate-700 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700/50 focus-within:shadow-md focus-within:border-violet-300 dark:focus-within:border-violet-700/50 transition-all motion-reduce:transition-none">
                  <div class="flex items-start gap-3 mb-3">
                    <div class="w-9 h-9 rounded-lg {colors.iconBg} {colors.iconBgDark} flex items-center justify-center {colors.text} {colors.textDark} flex-shrink-0">
                      <SpecIcon class="w-4 h-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-foreground leading-tight">
                        <a href="/knowledge/specs/{spec.slug}" class="{colors.textHover} {colors.textHoverDark} focus-visible:outline-none transition-colors motion-reduce:transition-none">
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

      <!-- CTA - Midnight Bloom -->
      <div class="text-center p-8 rounded-xl {colors.ctaBg} {colors.ctaBgDark} backdrop-blur-md border border-dashed {colors.ctaBorder} {colors.ctaBorderDark}">
        <h3 class="text-xl font-semibold text-foreground mb-2">Have questions about our specs?</h3>
        <p class="text-foreground-muted mb-4">
          If you need clarification on any technical specification or want to suggest improvements, we'd love to hear from you.
        </p>
        <a href="mailto:hello@grove.place" class="inline-flex items-center px-4 py-2 {colors.buttonBg} text-white rounded-lg {colors.buttonHover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
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
      <a href="/knowledge" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        ← Knowledge Base
      </a>
      <a href="/knowledge/patterns" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none">
        Architecture Patterns →
      </a>
    </div>
  </section>

  <Footer />
</main>
