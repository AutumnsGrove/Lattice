<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';

  let { data } = $props();
  const { marketingDocs } = data;
</script>

<SEO
  title="Marketing & Launch Materials - Grove Knowledge Base"
  description="Marketing copy, launch materials, and brand messaging for Grove platform"
  url="/knowledge/marketing"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Marketing & Launch</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Marketing & Launch Materials</h1>
      <p class="text-xl text-foreground-muted max-w-3xl">
        Copy, messaging, and launch materials that tell the Grove story.
        Everything here reflects our values: honest, accessible, and human.
      </p>
    </div>

    <!-- Marketing Docs List -->
    <div class="grid gap-6">
      {#each marketingDocs as doc}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/marketing/{doc.slug}" class="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
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
              href="/knowledge/marketing/{doc.slug}"
              class="inline-flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              Read document
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
              Marketing
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- Note about usage -->
    <div class="mt-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-8 text-center border border-emerald-200 dark:border-emerald-800">
      <h3 class="text-xl font-semibold text-foreground mb-2">Using these materials</h3>
      <p class="text-foreground-muted mb-4">
        These documents are reference materials for Grove's launch and ongoing marketing.
        They reflect our authentic voice — warm, honest, and unapologetically values-first.
      </p>
    </div>
    </div>
  </article>

  <Footer />
</main>
