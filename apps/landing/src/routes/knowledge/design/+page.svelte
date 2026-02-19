<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { knowledgeCategoryIcons } from '$lib/utils/icons';
  import { kbCategoryColors } from '$lib/utils/kb-colors';

  let { data } = $props();
  const docs = $derived(data.designDocs);

  const DesignIcon = knowledgeCategoryIcons.design;
  const colors = kbCategoryColors.design;
</script>

<SEO
  title="Design - Grove Knowledge Base"
  description="Visual language, UI patterns, icon standards, and the aesthetic principles that make Grove feel like home"
  url="/knowledge/design"
/>

<main class="min-h-screen flex flex-col">
  <Header user={data.user} />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-accent transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Design</span>
    </nav>

    <!-- Header - Spring -->
    <div class="mb-12">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 {colors.iconBg} {colors.iconBgDark} rounded-lg flex items-center justify-center">
          <DesignIcon class="w-6 h-6 {colors.text} {colors.textDark}" />
        </div>
        <h1 class="text-4xl font-bold text-foreground">Design</h1>
      </div>
      <p class="text-xl text-foreground-muted max-w-3xl">
        How Grove looks and feels. Glassmorphism, seasonal themes, icon composition,
        and the visual language that makes every page feel like a place you want to visit.
      </p>
    </div>

    <!-- Documents List -->
    <div class="grid gap-6">
      {#each docs as doc}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/design/{doc.slug}" class="{colors.textHover} {colors.textHoverDark} transition-colors">
                  {doc.title}
                </a>
              </h2>
              {#if doc.description}
                <p class="text-foreground-muted mb-3">{doc.description}</p>
              {/if}
              <p class="text-foreground-subtle text-sm">{doc.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-foreground-subtle mb-1">{doc.readingTime} min read</div>
              {#if doc.lastUpdated}
                <div class="text-xs text-foreground-faint">Updated {doc.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a
              href="/knowledge/design/{doc.slug}"
              class="inline-flex items-center {colors.text} {colors.textDark} {colors.textHover} {colors.textHoverDark} font-medium transition-colors"
            >
              Read more
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium {colors.badgeBg} {colors.badgeBgDark} {colors.badgeText} {colors.badgeTextDark}">
              Design
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- About Section - Spring -->
    <div class="mt-12 {colors.ctaBg} {colors.ctaBgDark} rounded-lg p-8 border {colors.ctaBorder} {colors.ctaBorderDark}">
      <h3 class="text-xl font-semibold text-foreground mb-2">Design as Hospitality</h3>
      <p class="text-foreground-muted mb-4">
        Every pixel is an invitation. Grove's design system isn't about looking pretty;
        it's about making people feel welcome. Warm colors, soft edges, nature motifs.
        A digital space that remembers what "cozy" means.
      </p>
      <p class="text-foreground-subtle text-sm italic">
        The best interfaces disappear. What's left is home.
      </p>
    </div>
    </div>
  </article>

  <Footer />
</main>
