<script lang="ts">
  import { FileText, ArrowRight } from 'lucide-svelte';
  import type { Doc } from '$lib/types/docs';
  import { kbCategoryColors } from '$lib/utils/kb-colors';

  interface Props {
    articles: Doc[];
  }

  let { articles }: Props = $props();

  // Get colors for article category with fallback
  function getColors(article: Doc) {
    return kbCategoryColors[article.category] || kbCategoryColors.help;
  }
</script>

{#if articles.length > 0}
  <aside aria-label="Related content" class="mt-12 pt-8 border-t border-divider">
    <h2 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
      <FileText aria-hidden="true" class="w-5 h-5 text-foreground-muted" />
      Related Content
    </h2>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each articles as article}
        {@const colors = getColors(article)}
        <a
          href="/knowledge/{article.category}/{article.slug}"
          aria-label="Read article: {article.title}"
          class="group p-4 rounded-xl bg-white/80 dark:bg-bark-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-bark-700/50 hover:border-slate-300 dark:hover:border-bark-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-green focus-visible:ring-offset-2 transition-all motion-reduce:transition-none"
        >
          <div class="flex items-start gap-3">
            <div aria-hidden="true" class="w-8 h-8 rounded-lg {colors.iconBg} {colors.iconBgDark} flex items-center justify-center flex-shrink-0">
              <FileText class="w-4 h-4 {colors.text} {colors.textDark}" />
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-medium text-foreground group-hover:text-grove-green dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                {article.title}
              </h3>
              <p class="text-xs text-foreground-muted mt-1 line-clamp-2">
                {article.excerpt}
              </p>
              <span class="inline-flex items-center text-xs {colors.text} {colors.textDark} mt-2 group-hover:gap-1.5 transition-all">
                Read article
                <ArrowRight class="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </div>
          </div>
        </a>
      {/each}
    </div>
  </aside>
{/if}
