<script>
  import { Button, Badge, GlassCard } from '$lib/ui';

  let { data } = $props();

  /** @param {string} dateString */
  function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="max-w-screen-xl">
  <header class="flex justify-between items-start mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">Site Pages</h1>
      <p class="m-0 text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] transition-colors">{data.pages.length} pages</p>
    </div>
  </header>

  <GlassCard variant="default" class="overflow-hidden mb-8">
    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Page</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] sticky top-0 z-10 max-md:hidden">Type</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] sticky top-0 z-10 max-md:hidden">Updated</th>
          <th class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-[background-color,color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.pages as page (page.slug)}
          <tr>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/{page.slug === 'home' ? '' : page.slug}" target="_blank" class="font-medium text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline hover:underline transition-colors">
                {page.title}
              </a>
              {#if page.description}
                <p class="mt-1 mb-0 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] transition-colors">{page.description}</p>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] whitespace-nowrap transition-[border-color] max-md:hidden">
              <Badge variant="tag">{page.type}</Badge>
            </td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] whitespace-nowrap text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] text-sm transition-[border-color,color] max-md:hidden">{formatDate(page.updated_at)}</td>
            <td class="p-4 text-left border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] whitespace-nowrap transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/{page.slug === 'home' ? '' : page.slug}" target="_blank" class="text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">View</a>
              <a href="/admin/pages/edit/{page.slug}" class="text-[var(--color-primary)] dark:text-[var(--color-primary-light)] no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">Edit</a>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] py-12 px-4 transition-colors">
              No pages yet. Run the sync script to import pages.
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </GlassCard>

  <GlassCard variant="muted">
    <h3>How Pages Work</h3>
    <p>
      Site pages (Home, About, Contact, etc.) can be edited directly from the admin panel or synced from files.
    </p>
    <ul>
      <li>Use <strong>Edit</strong> links to modify page content with the markdown editor</li>
      <li>Pages from <code>UserContent/Home/</code>, <code>UserContent/About/</code>, etc. can be synced</li>
      <li>Run <code>node scripts/sync-pages.cjs --remote</code> to sync from files to database</li>
      <li>Edit the hero section, description, and content directly in the editor</li>
    </ul>
  </GlassCard>
</div>

<style>
  :global(.max-w-screen-xl .glass-card) {
    padding: 1.5rem;
  }

  :global(.max-w-screen-xl .glass-card h3) {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card p) {
    margin: 0.5rem 0;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card ul) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card code) {
    background: var(--color-bg-tertiary);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    font-size: 0.9em;
    transition: background-color 0.3s ease;
  }
</style>
