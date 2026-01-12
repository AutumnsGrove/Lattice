<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
  import { knowledgeCategoryIcons } from '$lib/utils/icons';

  let { data } = $props();
  const docs = $derived(data.developerDocs);

  const DeveloperIcon = knowledgeCategoryIcons.developer;
</script>

<SEO
  title="Developer Guides - Grove Knowledge Base"
  description="Technical architecture, infrastructure patterns, and implementation guides for building on Grove"
  url="/knowledge/developer"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-accent transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Developer Guides</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
          <DeveloperIcon class="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 class="text-4xl font-bold text-foreground">Developer Guides</h1>
      </div>
      <p class="text-xl text-foreground-muted max-w-3xl">
        How Grove is built. Multi-tenant architecture, Cloudflare infrastructure,
        AI integrations, and the technical decisions that hold everything together.
      </p>
    </div>

    <!-- Documents List -->
    <div class="grid gap-6">
      {#each docs as doc}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/developer/{doc.slug}" class="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
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
              href="/knowledge/developer/{doc.slug}"
              class="inline-flex items-center text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
            >
              Read guide
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
              Developer
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- About Section -->
    <div class="mt-12 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-8 border border-cyan-200 dark:border-cyan-800/30">
      <h3 class="text-xl font-semibold text-foreground mb-2">Built in the Open</h3>
      <p class="text-foreground-muted mb-4">
        Grove's architecture isn't a secret. These guides explain how we build multi-tenant systems on Cloudflare,
        integrate AI responsibly, and scale without losing the personal touch.
        Take what's useful. Build something good.
      </p>
      <p class="text-foreground-subtle text-sm italic">
        The lattice holds everything up. Now you can see how.
      </p>
    </div>
    </div>
  </article>

  <Footer />
</main>
