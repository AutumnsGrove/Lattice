<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';

  let { data } = $props();
  const patterns = $derived(data.patterns);
</script>

<SEO
  title="Architecture Patterns - Grove Knowledge Base"
  description="Reusable architecture patterns and design decisions used across the Grove ecosystem"
  url="/knowledge/patterns"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-accent transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Architecture Patterns</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Architecture Patterns</h1>
      <p class="text-xl text-foreground-muted max-w-3xl">
        Reusable patterns and architecture decisions that shape how Grove is built.
        These patterns solve common problems across the ecosystem and can be applied to multiple tools.
      </p>
    </div>

    <!-- Patterns List -->
    <div class="grid gap-6">
      {#each patterns as pattern}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/patterns/{pattern.slug}" class="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  {pattern.title}
                </a>
              </h2>
              {#if pattern.description}
                <p class="text-foreground-muted mb-3">{pattern.description}</p>
              {/if}
              <p class="text-foreground-subtle text-sm">{pattern.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-foreground-subtle mb-1">{pattern.readingTime} min read</div>
              {#if pattern.lastUpdated}
                <div class="text-xs text-foreground-faint">Updated {pattern.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a
              href="/knowledge/patterns/{pattern.slug}"
              class="inline-flex items-center text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
            >
              Read pattern
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              Pattern
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- About Patterns -->
    <div class="mt-12 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-8 border border-amber-200 dark:border-amber-800/30">
      <h3 class="text-xl font-semibold text-foreground mb-2">Why Patterns?</h3>
      <p class="text-foreground-muted mb-4">
        Patterns capture solutions that work. Rather than reinventing the wheel for each tool in the Grove ecosystem,
        patterns let us solve a problem once and apply it everywhere. They're living documents that evolve as we learn.
      </p>
      <div class="grid md:grid-cols-3 gap-4 mt-6">
        <div class="text-center">
          <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{patterns.length}</div>
          <div class="text-sm text-foreground-muted">Documented Patterns</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">Ecosystem</div>
          <div class="text-sm text-foreground-muted">Wide Application</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">Open</div>
          <div class="text-sm text-foreground-muted">Freely Shared</div>
        </div>
      </div>
    </div>
    </div>
  </article>

  <Footer />
</main>
