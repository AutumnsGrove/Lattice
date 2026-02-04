<script>
  import { Button, Badge, GlassConfirmDialog, GlassCard, toast } from '$lib/ui';
  import { api } from '$lib/utils';
  import { Trash2 } from 'lucide-svelte';

  let { data } = $props();

  /** @type {{ slug: string, title: string } | null} */
  let bloomToDelete = $state(null);
  let showDeleteDialog = $state(false);
  let deleting = $state(false);

  /** @param {string} dateString */
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /** @param {{ slug: string, title: string }} bloom */
  function confirmDelete(bloom) {
    bloomToDelete = bloom;
    showDeleteDialog = true;
  }

  async function handleDelete() {
    if (!bloomToDelete) return;

    deleting = true;
    try {
      await api.delete(`/api/blooms/${bloomToDelete.slug}`);
      // Remove from local list
      data.posts = data.posts.filter((/** @type {{ slug: string }} */ p) => p.slug !== bloomToDelete?.slug);
      showDeleteDialog = false;
      bloomToDelete = null;
    } catch (error) {
      console.error('Failed to delete bloom:', error);
      toast.error('Failed to delete bloom', { description: 'Please try again.' });
    } finally {
      deleting = false;
    }
  }

  function handleCancelDelete() {
    showDeleteDialog = false;
    bloomToDelete = null;
  }
</script>

<div class="max-w-screen-xl">
  <!-- Example Site Notice -->
  {#if data.isExampleSite}
    <div class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
      <p class="m-0 text-amber-800 dark:text-amber-200 text-sm">
        <strong>✨ Welcome to the Example Site!</strong> This admin panel is publicly accessible so you can explore Grove's features.
        On your own site, this panel is private and only accessible to you.
      </p>
    </div>
  {/if}

  <header class="flex justify-between items-start mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4">
    <div>
      <h1 class="m-0 mb-1 text-3xl text-foreground">Garden</h1>
      <p class="m-0 text-foreground-muted">{data.posts.length} blooms</p>
    </div>
    <Button variant="primary" onclick={() => window.location.href = '/arbor/garden/new'}>
      + New Bloom
    </Button>
  </header>

  <GlassCard variant="default" class="overflow-hidden mb-8">
    <table class="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Title</th>
          <th scope="col" class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden">Date</th>
          <th scope="col" class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden">Tags</th>
          <th scope="col" class="p-4 text-left border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3">Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each data.posts as post (post.slug)}
          <tr>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/garden/{post.slug}" target="_blank" rel="noopener noreferrer" aria-label="{post.title} (opens in new tab)" class="font-medium text-green-700 dark:text-green-400 no-underline hover:underline transition-colors">
                {post.title}
              </a>
              {#if post.description}
                <p class="mt-1 mb-0 text-xs text-foreground-muted">{post.description}</p>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap text-foreground-muted text-sm transition-[border-color] max-md:hidden">
              {#if post.status === 'published' && post.date}
                {formatDate(post.date)}
              {:else if post.status === 'draft'}
                <span class="text-amber-600 dark:text-amber-400 font-medium">Draft</span>
              {:else}
                <span class="text-gray-400 dark:text-gray-500">—</span>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 transition-[border-color] max-md:hidden">
              {#if post.tags.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each post.tags as tag (tag)}
                    <Badge variant="tag">{tag}</Badge>
                  {/each}
                </div>
              {:else}
                <span class="text-foreground-muted">-</span>
              {/if}
            </td>
            <td class="p-4 text-left border-b border-gray-200 dark:border-gray-700 whitespace-nowrap transition-[border-color] max-md:px-2 max-md:py-3">
              <a href="/garden/{post.slug}" target="_blank" rel="noopener noreferrer" aria-label="View {post.title} (opens in new tab)" class="text-green-700 dark:text-green-400 no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">View</a>
              <a href="/arbor/garden/edit/{post.slug}" class="text-green-700 dark:text-green-400 no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2">Edit</a>
              <button
                onclick={() => confirmDelete({ slug: post.slug, title: post.title })}
                disabled={deleting}
                class="text-red-500 dark:text-red-400 text-sm hover:underline transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
                aria-label="Delete {post.title}"
              >
                <Trash2 class="w-3.5 h-3.5" />
                <span class="max-md:hidden">Delete</span>
              </button>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="4" class="text-center text-foreground-muted py-12 px-4">
              No blooms yet. Create your first one!
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </GlassCard>

  <GlassCard variant="muted">
    <h3>How the Garden Works</h3>
    <p>
      Create and edit blooms directly in the built-in markdown editor. Blooms are saved to the database
      and available immediately.
    </p>
    <ul>
      <li>Use <strong>+ New Bloom</strong> to create a new bloom with the markdown editor</li>
      <li>Use <strong>Edit</strong> links to modify existing blooms</li>
    </ul>
  </GlassCard>
</div>

<!-- Delete Confirmation Dialog -->
<GlassConfirmDialog
  bind:open={showDeleteDialog}
  title="Delete Bloom"
  message={`Are you sure you want to delete "${bloomToDelete?.title}"? This action cannot be undone.`}
  confirmLabel="Delete Bloom"
  cancelLabel="Cancel"
  variant="danger"
  loading={deleting}
  onconfirm={handleDelete}
  oncancel={handleCancelDelete}
/>

<style>
  :global(.max-w-screen-xl .glass-card) {
    padding: 1.5rem;
  }

  :global(.max-w-screen-xl .glass-card h3) {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card p) {
    margin: 0 0 0.75rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card ul) {
    margin: 0;
    padding-left: 1.25rem;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }

  :global(.max-w-screen-xl .glass-card li) {
    margin-bottom: 0.25rem;
  }

  :global(.max-w-screen-xl .glass-card code) {
    background: var(--color-border);
    padding: 0.125rem 0.25rem;
    border-radius: var(--border-radius-small);
    font-size: 0.85em;
    transition: background-color 0.3s ease;
  }
</style>
