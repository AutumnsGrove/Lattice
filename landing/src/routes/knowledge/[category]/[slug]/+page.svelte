<script lang="ts">
  import { page } from '$app/stores';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import SEO from '$lib/components/SEO.svelte';
  import { ContentWithGutter } from '@autumnsgrove/groveengine';
  import '$lib/styles/content.css';

  export let data;

  $: doc = data.doc;
  $: category = $page.params.category;
  $: slug = $page.params.slug;
  $: headers = doc?.headers || [];

  $: categoryTitle = category === 'specs' ? 'Technical Specifications' :
                     category === 'help' ? 'Help Center' :
                     category === 'marketing' ? 'Marketing & Launch' : 'Legal & Policies';
</script>

<SEO
  title={`${doc?.title || 'Not Found'} — Grove`}
  description={doc?.description || doc?.excerpt || "Grove knowledge base article"}
  url={`/knowledge/${category}/${slug}`}
/>

<main class="min-h-screen flex flex-col">
  <Header />

  <div class="flex-1 px-6 py-12">
    {#if doc}
      <ContentWithGutter
        content={doc.html || `<p class="text-foreground-muted leading-relaxed">${doc.excerpt}</p>`}
        gutterContent={[]}
        {headers}
        showTableOfContents={true}
      >
        {#snippet children()}
          <!-- Breadcrumb -->
          <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8" aria-label="Breadcrumb">
            <a href="/knowledge" class="hover:text-foreground transition-colors">Knowledge Base</a>
            <span aria-hidden="true">/</span>
            <a href="/knowledge/{category}" class="hover:text-foreground transition-colors">{categoryTitle}</a>
            <span aria-hidden="true">/</span>
            <span class="text-foreground" aria-current="page">{doc.title}</span>
          </nav>

          <!-- Article Header -->
          <header class="content-header">
            <div class="flex items-center gap-3 mb-4">
              {#if category === 'specs'}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent dark:bg-accent/20 dark:text-accent-text">
                  Technical Spec
                </span>
              {:else if category === 'help'}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Help Article
                </span>
              {:else if category === 'marketing'}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                  Marketing
                </span>
              {:else}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  Legal Document
                </span>
              {/if}
              {#if doc.lastUpdated}
                <span class="text-sm text-foreground-subtle">Updated {doc.lastUpdated}</span>
              {/if}
              <span class="text-sm text-foreground-subtle">{doc.readingTime} min read</span>
            </div>
            <h1>{doc.title}</h1>
            {#if doc.description}
              <p class="text-xl text-foreground-muted mt-4">{doc.description}</p>
            {/if}
          </header>
        {/snippet}
      </ContentWithGutter>

      <!-- Article Footer -->
      <footer class="flex items-center justify-between max-w-[800px] mx-auto mt-12">
        <a
          href="/knowledge/{category}"
          class="inline-flex items-center text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Return to {categoryTitle}"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to {categoryTitle}
        </a>

        <div class="flex gap-4">
          <a
            href="mailto:autumnbrown23@pm.me"
            class="text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Contact support via email"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </footer>
    {:else}
      <!-- 404 -->
      <div class="text-center py-12 max-w-4xl mx-auto">
        <h1 class="text-4xl font-bold text-foreground mb-4">Document Not Found</h1>
        <p class="text-xl text-foreground-muted mb-8">
          The document you're looking for doesn't exist or has been moved.
        </p>
        <div class="flex gap-4 justify-center">
          <a href="/knowledge" class="px-4 py-2 bg-foreground text-background rounded-lg hover:bg-foreground-muted transition-colors">
            Knowledge Base Home
          </a>
          <a href="/knowledge/specs" class="px-4 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors">
            Browse Specs
          </a>
          <a href="/knowledge/help" class="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors">
            Browse Help
          </a>
        </div>
      </div>
    {/if}
  </div>

  <Footer />
</main>
