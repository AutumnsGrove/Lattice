<script lang="ts">
  import { goto } from '$app/navigation';
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { toolIcons, knowledgeCategoryIcons } from '$lib/utils/icons';
  import { kbCategoryColors } from '$lib/utils/kb-colors';

  let { data } = $props();
  const specs = $derived(data.specs);
  const helpArticles = $derived(data.helpArticles);
  const legalDocs = $derived(data.legalDocs);
  const marketingDocs = $derived(data.marketingDocs);
  const patterns = $derived(data.patterns);
  const philosophyDocs = $derived(data.philosophyDocs);
  const designDocs = $derived(data.designDocs);
  const exhibitDocs = $derived(data.exhibitDocs);

  const PhilosophyIcon = knowledgeCategoryIcons.philosophy;
  const DesignIcon = knowledgeCategoryIcons.design;
  const ExhibitIcon = knowledgeCategoryIcons.exhibit;

  // Seasonal color references for cleaner templates
  const colors = {
    help: kbCategoryColors.help,
    legal: kbCategoryColors.legal,
    philosophy: kbCategoryColors.philosophy,
    design: kbCategoryColors.design,
    exhibit: kbCategoryColors.exhibit,
    marketing: kbCategoryColors.marketing,
    specs: kbCategoryColors.specs,
    patterns: kbCategoryColors.patterns,
  };

  let searchQuery = $state('');

  function handleSearch(e: SubmitEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      goto(`/knowledge/search?q=${encodeURIComponent(searchQuery)}`);
    }
  }
</script>

<SEO
  title="Knowledge Base - Grove"
  description="Learn about Grove's features, specifications, and how to use our platform"
  url="/knowledge"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Knowledge Base</h1>
      <p class="text-xl text-foreground-muted max-w-3xl mx-auto">
        Everything you need to know about Grove - from technical specifications to guides for Wanderers
      </p>
    </div>

    <!-- Search Bar -->
    <div class="max-w-2xl mx-auto mb-12">
      <form onsubmit={handleSearch} class="relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search documentation..."
          class="w-full px-4 py-3 pl-12 pr-20 text-foreground bg-surface-elevated border border-default rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 flex items-center pl-4">
          <svg class="w-5 h-5 text-foreground-subtle" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          class="absolute inset-y-0 right-0 flex items-center pr-4 text-accent hover:text-accent-muted font-medium"
        >
          Search
        </button>
      </form>
    </div>

    <!-- Categories -->
    <div class="grid md:grid-cols-2 gap-8">
      <!-- Help Center - Summer (emerald) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.help.iconBg} {colors.help.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 {colors.help.text} {colors.help.textDark}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Help Center</h2>
            <p class="text-sm text-foreground-subtle">{helpArticles.length} articles</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Step-by-step guides and answers to common questions about using Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each helpArticles.slice(0, 3) as article}
            <div class="text-sm">
              <a href="/knowledge/help/{article.slug}" class="{colors.help.text} {colors.help.textDark} {colors.help.textHover} {colors.help.textHoverDark} font-medium transition-colors">
                {article.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/help" class="inline-flex items-center {colors.help.text} {colors.help.textDark} {colors.help.textHover} {colors.help.textHoverDark} font-medium transition-colors">
          Browse all articles
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Legal Documents - Autumn (rust) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.legal.iconBg} {colors.legal.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 {colors.legal.text} {colors.legal.textDark}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Legal & Policies</h2>
            <p class="text-sm text-foreground-subtle">{legalDocs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Terms of service, privacy policy, and other legal documents that govern your use of Grove.
        </p>
        <div class="space-y-2 mb-4">
          {#each legalDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/legal/{doc.slug}" class="{colors.legal.text} {colors.legal.textDark} {colors.legal.textHover} {colors.legal.textHoverDark} font-medium transition-colors">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/legal" class="inline-flex items-center {colors.legal.text} {colors.legal.textDark} {colors.legal.textHover} {colors.legal.textHoverDark} font-medium transition-colors">
          View all policies
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Philosophy - Midnight Bloom (violet) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.philosophy.iconBg} {colors.philosophy.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <PhilosophyIcon class="w-6 h-6 {colors.philosophy.text} {colors.philosophy.textDark}" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Philosophy</h2>
            <p class="text-sm text-foreground-subtle">{philosophyDocs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          The heart of Grove. Naming systems, voice guidelines, sustainability, and the principles that shape everything.
        </p>
        <div class="space-y-2 mb-4">
          {#each philosophyDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/philosophy/{doc.slug}" class="{colors.philosophy.text} {colors.philosophy.textDark} {colors.philosophy.textHover} {colors.philosophy.textHoverDark} font-medium transition-colors">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/philosophy" class="inline-flex items-center {colors.philosophy.text} {colors.philosophy.textDark} {colors.philosophy.textHover} {colors.philosophy.textHoverDark} font-medium transition-colors">
          Explore philosophy
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Design - Spring (rose) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.design.iconBg} {colors.design.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <DesignIcon class="w-6 h-6 {colors.design.text} {colors.design.textDark}" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Design</h2>
            <p class="text-sm text-foreground-subtle">{designDocs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Visual language, UI patterns, icons, and the aesthetic that makes Grove feel like home.
        </p>
        <div class="space-y-2 mb-4">
          {#each designDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/design/{doc.slug}" class="{colors.design.text} {colors.design.textDark} {colors.design.textHover} {colors.design.textHoverDark} font-medium transition-colors">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/design" class="inline-flex items-center {colors.design.text} {colors.design.textDark} {colors.design.textHover} {colors.design.textHoverDark} font-medium transition-colors">
          Browse design docs
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Art Exhibit - Gallery (teal) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow md:col-span-2">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.exhibit.iconBg} {colors.exhibit.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <ExhibitIcon class="w-6 h-6 {colors.exhibit.text} {colors.exhibit.textDark}" />
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Art Exhibit</h2>
            <p class="text-sm text-foreground-subtle">{exhibitDocs.length} exhibits</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          The Lattice Museum. A guided tour through how this forest grows, with curator commentary in the margins.
        </p>
        <div class="grid md:grid-cols-3 gap-4 mb-4">
          {#each exhibitDocs as doc}
            <div class="text-sm p-3 {colors.exhibit.cardBg} {colors.exhibit.cardBgDark} rounded-lg">
              <a href="/knowledge/exhibit/{doc.slug}" class="{colors.exhibit.text} {colors.exhibit.textDark} {colors.exhibit.textHover} {colors.exhibit.textHoverDark} font-medium transition-colors">
                {doc.title}
              </a>
              <p class="text-foreground-subtle text-xs mt-1">{doc.description}</p>
            </div>
          {/each}
        </div>
        <a href="/knowledge/exhibit" class="inline-flex items-center {colors.exhibit.text} {colors.exhibit.textDark} {colors.exhibit.textHover} {colors.exhibit.textHoverDark} font-medium transition-colors">
          Enter the museum
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Marketing Documents - Summer (emerald) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.marketing.iconBg} {colors.marketing.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 {colors.marketing.text} {colors.marketing.textDark}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Marketing & Launch</h2>
            <p class="text-sm text-foreground-subtle">{marketingDocs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Launch materials, messaging, and copy that tells the Grove story.
        </p>
        <div class="space-y-2 mb-4">
          {#each marketingDocs.slice(0, 3) as doc}
            <div class="text-sm">
              <a href="/knowledge/marketing/{doc.slug}" class="{colors.marketing.text} {colors.marketing.textDark} {colors.marketing.textHover} {colors.marketing.textHoverDark} font-medium transition-colors">
                {doc.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/marketing" class="inline-flex items-center {colors.marketing.text} {colors.marketing.textDark} {colors.marketing.textHover} {colors.marketing.textHoverDark} font-medium transition-colors">
          View all materials
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Technical Specifications - Midnight Bloom (violet) -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.specs.iconBg} {colors.specs.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 {colors.specs.text} {colors.specs.textDark}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Technical Specifications</h2>
            <p class="text-sm text-foreground-subtle">{specs.length} documents</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Detailed technical documentation about Grove's architecture, features, and implementation details.
        </p>
        <div class="space-y-2 mb-4">
          {#each specs.slice(0, 3) as spec}
            <div class="text-sm">
              <a href="/knowledge/specs/{spec.slug}" class="{colors.specs.text} {colors.specs.textDark} {colors.specs.textHover} {colors.specs.textHoverDark} font-medium transition-colors">
                {spec.title}
              </a>
            </div>
          {/each}
        </div>
        <a href="/knowledge/specs" class="inline-flex items-center {colors.specs.text} {colors.specs.textDark} {colors.specs.textHover} {colors.specs.textHoverDark} font-medium transition-colors">
          View all specifications
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      <!-- Architecture Patterns - Amber -->
      <div class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow md:col-span-2">
        <div class="flex items-center mb-4">
          <div class="w-12 h-12 {colors.patterns.iconBg} {colors.patterns.iconBgDark} rounded-lg flex items-center justify-center mr-4">
            <svg class="w-6 h-6 {colors.patterns.text} {colors.patterns.textDark}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-foreground">Architecture Patterns</h2>
            <p class="text-sm text-foreground-subtle">{patterns.length} patterns</p>
          </div>
        </div>
        <p class="text-foreground-muted mb-4">
          Reusable patterns and architecture decisions that shape how Grove is built. Solutions that work across the ecosystem.
        </p>
        <div class="grid md:grid-cols-3 gap-4 mb-4">
          {#each patterns as pattern}
            <div class="text-sm p-3 {colors.patterns.cardBg} {colors.patterns.cardBgDark} rounded-lg">
              <a href="/knowledge/patterns/{pattern.slug}" class="flex items-start gap-2 {colors.patterns.text} {colors.patterns.textDark} {colors.patterns.textHover} {colors.patterns.textHoverDark} font-medium transition-colors group">
                {#if pattern.icon && toolIcons[pattern.icon as keyof typeof toolIcons]}
                  {@const Icon = toolIcons[pattern.icon as keyof typeof toolIcons]}
                  <div class="flex-shrink-0 w-5 h-5 mt-0.5">
                    <Icon class="w-5 h-5" />
                  </div>
                {/if}
                <span>{pattern.title}</span>
              </a>
              <p class="text-foreground-subtle text-xs mt-1">{pattern.description}</p>
            </div>
          {/each}
        </div>
        <a href="/knowledge/patterns" class="inline-flex items-center {colors.patterns.text} {colors.patterns.textDark} {colors.patterns.textHover} {colors.patterns.textHoverDark} font-medium transition-colors">
          View all patterns
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Quick Links -->
    <div class="mt-12 text-center">
      <h3 class="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
      <div class="flex flex-wrap justify-center gap-4">
        <a href="/knowledge/marketing/grove-at-a-glance" class="px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/40 transition-colors">
          Grove at a Glance
        </a>
        <a href="/knowledge/help/what-is-grove" class="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
          What is Grove?
        </a>
        <a href="/knowledge/help/why-grove-is-different" class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 dark:from-amber-900/40 dark:to-orange-900/40 dark:text-amber-300 rounded-lg hover:from-amber-200 hover:to-orange-200 dark:hover:from-amber-900/50 dark:hover:to-orange-900/50 transition-all ring-1 ring-amber-300/50 dark:ring-amber-700/50">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Why Grove is Different
        </a>
        <a href="/contact" class="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/40 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact Support
        </a>
      </div>
    </div>
  </div>
  </article>

  <Footer />
</main>