<script lang="ts">
  import { helpArticles } from '$lib/data/knowledge-base';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';

  export let data;
  const { helpArticles: articles } = data;
</script>

<svelte:head>
  <title>Help Center - Grove Knowledge Base</title>
  <meta name="description" content="Help articles and guides for using Grove platform" />
</svelte:head>

<main class="min-h-screen flex flex-col">
  <Header />

  <article class="flex-1 px-6 py-12">
    <div class="max-w-6xl mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center space-x-2 text-sm text-foreground-muted mb-8">
      <a href="/knowledge" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Knowledge Base</a>
      <span>/</span>
      <span class="text-foreground">Help Center</span>
    </nav>

    <!-- Header -->
    <div class="mb-12">
      <h1 class="text-4xl font-bold text-foreground mb-4">Help Center</h1>
      <p class="text-xl text-foreground-muted max-w-3xl">
        Step-by-step guides and answers to common questions about using Grove.
        Whether you're just getting started or need help with a specific feature, you'll find it here.
      </p>
    </div>

    <!-- Getting Started Section -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold text-foreground mb-6">Getting Started</h2>
      <div class="grid gap-4">
        {#each articles.filter(a => ['what-is-grove', 'writing-your-first-post', 'choosing-your-plan'].includes(a.slug)) as article}
          <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
            <h3 class="text-lg font-semibold text-foreground mb-2">
              <a href="/knowledge/help/{article.slug}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {article.title}
              </a>
            </h3>
            <p class="text-foreground-muted mb-3">{article.excerpt}</p>
            <div class="flex items-center justify-between">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Read more
                <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <span class="text-sm text-foreground-subtle">{article.readingTime} min read</span>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <!-- Writing & Publishing -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold text-foreground mb-6">Writing & Publishing</h2>
      <div class="grid gap-4">
        {#each articles.filter(a => ['drafts-and-scheduling', 'tags-and-organization', 'exporting-your-content'].includes(a.slug)) as article}
          <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
            <h3 class="text-lg font-semibold text-foreground mb-2">
              <a href="/knowledge/help/{article.slug}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {article.title}
              </a>
            </h3>
            <p class="text-foreground-muted mb-3">{article.excerpt}</p>
            <div class="flex items-center justify-between">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Read more
                <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <span class="text-sm text-foreground-subtle">{article.readingTime} min read</span>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <!-- Community & Social -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold text-foreground mb-6">Community & Social</h2>
      <div class="grid gap-4">
        {#each articles.filter(a => ['opting-into-the-feed', 'reactions-and-voting', 'understanding-replies-vs-comments'].includes(a.slug)) as article}
          <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
            <h3 class="text-lg font-semibold text-foreground mb-2">
              <a href="/knowledge/help/{article.slug}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {article.title}
              </a>
            </h3>
            <p class="text-foreground-muted mb-3">{article.excerpt}</p>
            <div class="flex items-center justify-between">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Read more
                <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <span class="text-sm text-foreground-subtle">{article.readingTime} min read</span>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <!-- Troubleshooting -->
    <section class="mb-12">
      <h2 class="text-2xl font-semibold text-foreground mb-6">Troubleshooting</h2>
      <div class="grid gap-4">
        {#each articles.filter(a => ['my-site-isnt-loading'].includes(a.slug)) as article}
          <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-6 hover:shadow-md transition-shadow">
            <h3 class="text-lg font-semibold text-foreground mb-2">
              <a href="/knowledge/help/{article.slug}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {article.title}
              </a>
            </h3>
            <p class="text-foreground-muted mb-3">{article.excerpt}</p>
            <div class="flex items-center justify-between">
              <a href="/knowledge/help/{article.slug}" class="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors">
                Read more
                <svg class="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <span class="text-sm text-foreground-subtle">{article.readingTime} min read</span>
            </div>
          </article>
        {/each}
      </div>
    </section>

    <!-- All Articles -->
    <section>
      <h2 class="text-2xl font-semibold text-foreground mb-6">All Help Articles</h2>
      <div class="grid md:grid-cols-2 gap-4">
        {#each articles as article}
          <article class="bg-surface-elevated rounded-lg shadow-sm border border-default p-4 hover:shadow-md transition-shadow">
            <h3 class="font-semibold text-foreground mb-1">
              <a href="/knowledge/help/{article.slug}" class="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {article.title}
              </a>
            </h3>
            <p class="text-sm text-foreground-muted mb-2">{article.excerpt}</p>
            <div class="flex items-center justify-between text-xs text-foreground-subtle">
              <span>{article.readingTime} min read</span>
              {#if article.lastUpdated}
                <span>Updated {article.lastUpdated}</span>
              {/if}
            </div>
          </article>
        {/each}
      </div>
    </section>

    <!-- Contact Support -->
    <div class="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-8 text-center border border-blue-200 dark:border-blue-800">
      <h3 class="text-xl font-semibold text-foreground mb-2">Need more help?</h3>
      <p class="text-foreground-muted mb-4">
        Can't find what you're looking for? Contact our support team and we'll get back to you within 48 hours.
      </p>
      <a href="mailto:autumnbrown23@pm.me" class="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
        Contact Support
        <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </a>
    </div>
  </article>

  <Footer />
</main>
