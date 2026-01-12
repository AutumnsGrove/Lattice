<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { knowledgeCategoryIcons } from '$lib/utils/icons';

  let { data } = $props();
  const docs = $derived(data.philosophyDocs);

  const PhilosophyIcon = knowledgeCategoryIcons.philosophy;
</script>

<SEO
  title="Philosophy - Grove Knowledge Base"
  description="The heart of Grove: naming systems, voice guidelines, sustainability, and the principles that shape everything we build"
  url="/knowledge/philosophy"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-accent transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Philosophy</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
          <PhilosophyIcon class="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <h1 class="text-4xl font-bold text-foreground">Philosophy</h1>
      </div>
      <p class="text-xl text-foreground-muted max-w-3xl">
        The heart of Grove. How we name things, how we write, what we believe in.
        These documents shape everything else.
      </p>
    </div>

    <!-- Documents List -->
    <div class="grid gap-6">
      {#each docs as doc}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/philosophy/{doc.slug}" class="hover:text-green-600 dark:hover:text-green-400 transition-colors">
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
              href="/knowledge/philosophy/{doc.slug}"
              class="inline-flex items-center text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium transition-colors"
            >
              Read more
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Philosophy
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- About Section -->
    <div class="mt-12 bg-green-50 dark:bg-green-900/20 rounded-lg p-8 border border-green-200 dark:border-green-800/30">
      <h3 class="text-xl font-semibold text-foreground mb-2">Why Philosophy Matters</h3>
      <p class="text-foreground-muted mb-4">
        Grove isn't just software. It's a set of beliefs about how the internet should work,
        how people should own their words, and how technology can serve communities instead of extracting from them.
        These documents are where those beliefs take shape.
      </p>
      <p class="text-foreground-subtle text-sm italic">
        The forest grows from its roots.
      </p>
    </div>
    </div>
  </article>

  <Footer />
</main>
