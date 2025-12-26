<script lang="ts">
  import SEO from '$lib/components/SEO.svelte';
  import { specs } from '$lib/data/knowledge-base';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  export let data;
  const { specs: specsList } = data;
</script>

<SEO
  title="Technical Specifications - Grove Knowledge Base"
  description="Technical specifications and implementation details for Grove platform"
  url="/knowledge/specs"
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-accent hover:text-accent-muted transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Technical Specifications</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Technical Specifications</h1>
      <p class="text-xl text-foreground-muted max-w-3xl">
        Detailed technical documentation about Grove's architecture, features, and implementation details.
        These specifications provide transparency into how Grove works and our design decisions.
      </p>
    </div>

    <!-- Specs List -->
    <div class="grid gap-6">
      {#each specsList as spec}
        <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h2 class="text-xl font-semibold text-foreground mb-2">
                <a href="/knowledge/specs/{spec.slug}" class="hover:text-accent hover:text-accent-muted transition-colors">
                  {spec.title}
                </a>
              </h2>
              {#if spec.description}
                <p class="text-foreground-muted mb-3">{spec.description}</p>
              {/if}
              <p class="text-foreground-subtle text-sm">{spec.excerpt}</p>
            </div>
            <div class="ml-6 text-right">
              <div class="text-sm text-foreground-subtle mb-1">{spec.readingTime} min read</div>
              {#if spec.lastUpdated}
                <div class="text-xs text-foreground-faint">Updated {spec.lastUpdated}</div>
              {/if}
            </div>
          </div>
          <div class="flex items-center justify-between">
            <a
              href="/knowledge/specs/{spec.slug}"
              class="inline-flex items-center text-accent hover:text-accent-muted font-medium transition-colors"
            >
              Read specification
              <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-text">
              Technical Spec
            </span>
          </div>
        </article>
      {/each}
    </div>

    <!-- CTA -->
    <div class="mt-12 bg-accent/5 dark:bg-accent/10 rounded-lg p-8 text-center border border-accent/20">
      <h3 class="text-xl font-semibold text-foreground mb-2">Have questions about our specs?</h3>
      <p class="text-foreground-muted mb-4">
        If you need clarification on any technical specification or want to suggest improvements, we'd love to hear from you.
      </p>
      <a href="mailto:autumnbrown23@pm.me" class="inline-flex items-center px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-muted transition-colors">
        Contact Us
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
    </div>
  </article>

  <Footer />
</main>
