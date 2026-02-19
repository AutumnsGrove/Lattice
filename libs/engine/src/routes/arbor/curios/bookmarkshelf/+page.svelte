<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { BookMarked, Plus, Trash2, Star, BookOpen } from "lucide-svelte";

  let { data, form } = $props();

  let showAddShelf = $state(false);
  let addingBookmarkToShelf = $state<string | null>(null);

  $effect(() => {
    if (form?.shelfAdded) {
      toast.success("Shelf created");
      showAddShelf = false;
    } else if (form?.bookmarkAdded) {
      toast.success("Bookmark added");
      addingBookmarkToShelf = null;
    } else if (form?.shelfRemoved) {
      toast.success("Shelf removed");
    } else if (form?.bookmarkRemoved) {
      toast.success("Bookmark removed");
    } else if (form?.error) {
      toast.error(form.error);
    }
  });
</script>

<svelte:head>
  <title>Bookmark Shelf - Curios</title>
</svelte:head>

<div class="shelf-page">
  <header class="page-header">
    <div class="title-row">
      <BookMarked class="header-icon" />
      <h1>Bookmark Shelf</h1>
    </div>
    <p class="subtitle">
      A visual bookshelf for your favorite reads.
      Arrange them on shelves, mark favorites, track what you're reading.
    </p>
  </header>

  <section class="add-section">
    {#if !showAddShelf}
      <GlassButton variant="accent" onclick={() => (showAddShelf = true)}>
        <Plus class="btn-icon" />
        Add a Shelf
      </GlassButton>
    {:else}
      <GlassCard class="add-form-card">
        <h2>New Shelf</h2>
        <form method="POST" action="?/addShelf" use:enhance>
          <div class="form-grid">
            <div class="form-field">
              <label for="name">Shelf Name</label>
              <input type="text" id="name" name="name" placeholder="Currently Reading" required maxlength="100" class="glass-input" />
            </div>
            <div class="form-field">
              <label for="shelfDesc">Description <span class="optional">(optional)</span></label>
              <input type="text" id="shelfDesc" name="description" placeholder="Books I'm reading right now" maxlength="500" class="glass-input" />
            </div>
          </div>
          <div class="form-actions">
            <GlassButton type="submit" variant="accent">Create Shelf</GlassButton>
            <GlassButton variant="ghost" onclick={() => (showAddShelf = false)}>Cancel</GlassButton>
          </div>
        </form>
      </GlassCard>
    {/if}
  </section>

  <section class="shelves-section">
    {#if data.shelves.length === 0}
      <GlassCard class="empty-card">
        <BookMarked class="empty-icon" />
        <p>No shelves yet.</p>
        <p class="empty-hint">Create a shelf to start organizing your bookmarks.</p>
      </GlassCard>
    {:else}
      {#each data.shelves as shelf}
        <GlassCard class="shelf-card">
          <div class="shelf-header">
            <div>
              <h3>{shelf.name}</h3>
              {#if shelf.description}
                <p class="shelf-description">{shelf.description}</p>
              {/if}
            </div>
            <div class="shelf-actions">
              <GlassButton variant="ghost" onclick={() => (addingBookmarkToShelf = addingBookmarkToShelf === shelf.id ? null : shelf.id)} aria-label="Add bookmark">
                <Plus class="btn-icon" />
                Add Bookmark
              </GlassButton>
              <form method="POST" action="?/removeShelf" use:enhance>
                <input type="hidden" name="shelfId" value={shelf.id} />
                <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove shelf" aria-label="Remove shelf">
                  <Trash2 class="btn-icon" />
                </GlassButton>
              </form>
            </div>
          </div>

          {#if addingBookmarkToShelf === shelf.id}
            <div class="add-bookmark-form">
              <form method="POST" action="?/addBookmark" use:enhance>
                <input type="hidden" name="shelfId" value={shelf.id} />
                <div class="form-grid">
                  <div class="form-field">
                    <label for="bmTitle">Title</label>
                    <input type="text" id="bmTitle" name="title" required maxlength="200" class="glass-input" />
                  </div>
                  <div class="form-field">
                    <label for="bmUrl">URL <span class="optional">(optional)</span></label>
                    <input type="url" id="bmUrl" name="url" class="glass-input" />
                  </div>
                  <div class="form-field">
                    <label for="bmAuthor">Author <span class="optional">(optional)</span></label>
                    <input type="text" id="bmAuthor" name="author" maxlength="100" class="glass-input" />
                  </div>
                  <div class="form-field full-width">
                    <label for="bmDescription">Description <span class="optional">(optional)</span></label>
                    <textarea id="bmDescription" name="description" maxlength="500" rows="2" placeholder="A short note about this bookmark" class="glass-input"></textarea>
                  </div>
                  <div class="form-field">
                    <label for="bmCategory">Category <span class="optional">(optional)</span></label>
                    <select id="bmCategory" name="category" class="glass-input">
                      <option value="">None</option>
                      {#each data.defaultCategories as cat}
                        <option value={cat}>{cat}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="form-field">
                    <label class="checkbox-label">
                      <input type="checkbox" name="isCurrentlyReading" />
                      Currently Reading
                    </label>
                  </div>
                  <div class="form-field">
                    <label class="checkbox-label">
                      <input type="checkbox" name="isFavorite" />
                      Favorite
                    </label>
                  </div>
                </div>
                <div class="form-actions">
                  <GlassButton type="submit" variant="accent">Add Bookmark</GlassButton>
                  <GlassButton variant="ghost" onclick={() => (addingBookmarkToShelf = null)}>Cancel</GlassButton>
                </div>
              </form>
            </div>
          {/if}

          {#if shelf.bookmarks.length > 0}
            <div class="bookmark-list">
              {#each shelf.bookmarks as bookmark}
                <div class="bookmark-item">
                  <div class="bookmark-info">
                    {#if bookmark.url}
                      <a href={bookmark.url} target="_blank" rel="noopener noreferrer" class="bookmark-title">
                        {bookmark.title}
                      </a>
                    {:else}
                      <span class="bookmark-title">{bookmark.title}</span>
                    {/if}
                    <div class="bookmark-meta">
                      {#if bookmark.author}<span class="meta-author">{bookmark.author}</span>{/if}
                      {#if bookmark.category}<span class="meta-category">{bookmark.category}</span>{/if}
                      {#if bookmark.isCurrentlyReading}<BookOpen class="meta-icon reading" />{/if}
                      {#if bookmark.isFavorite}<Star class="meta-icon favorite" />{/if}
                    </div>
                  </div>
                  <form method="POST" action="?/removeBookmark" use:enhance>
                    <input type="hidden" name="bookmarkId" value={bookmark.id} />
                    <GlassButton type="submit" variant="ghost" class="remove-btn" title="Remove" aria-label="Remove bookmark">
                      <Trash2 class="btn-icon" />
                    </GlassButton>
                  </form>
                </div>
              {/each}
            </div>
          {:else}
            <p class="empty-shelf">No bookmarks on this shelf yet.</p>
          {/if}
        </GlassCard>
      {/each}
    {/if}
  </section>
</div>

<style>
  .shelf-page { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 0.95rem; line-height: 1.6; max-width: 600px; }
  .add-section { margin-bottom: 2rem; }
  :global(.add-form-card) { padding: 1.5rem; }
  :global(.empty-card) { padding: 3rem 1.5rem; text-align: center; }
  :global(.empty-icon) { width: 3rem; height: 3rem; color: var(--color-text-muted); opacity: 0.5; margin-bottom: 1rem; }
  .empty-hint { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; }
  h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 1.25rem 0; color: var(--color-text); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-field { display: flex; flex-direction: column; gap: 0.375rem; }
  .form-field label { font-size: 0.85rem; font-weight: 500; color: var(--color-text-muted); }
  .optional { font-weight: 400; opacity: 0.7; }
  .glass-input { padding: 0.5rem 0.75rem; border: 1px solid var(--grove-overlay-12); border-radius: var(--border-radius-standard); background: var(--grove-overlay-4); color: var(--color-text); font-size: 0.9rem; }
  .glass-input:focus { outline: none; border-color: var(--color-primary); }
  .form-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  :global(.btn-icon) { width: 1rem; height: 1rem; margin-right: 0.375rem; }
  .shelves-section { display: flex; flex-direction: column; gap: 1.5rem; }
  :global(.shelf-card) { padding: 1.25rem; }
  .shelf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
  .shelf-header h3 { font-size: 1.1rem; font-weight: 600; margin: 0; color: var(--color-text); }
  .shelf-description { font-size: 0.85rem; color: var(--color-text-muted); margin: 0.25rem 0 0; }
  .shelf-actions { display: flex; gap: 0.5rem; align-items: center; }
  .add-bookmark-form { padding: 1rem; background: var(--grove-overlay-4); border-radius: var(--border-radius-standard); margin-bottom: 1rem; }
  .bookmark-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .bookmark-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; background: var(--grove-overlay-4); border-radius: var(--border-radius-standard); }
  .bookmark-title { color: var(--color-text); text-decoration: none; font-weight: 500; font-size: 0.9rem; }
  .bookmark-title:hover { color: var(--color-primary); }
  .bookmark-meta { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
  .meta-author { font-size: 0.8rem; color: var(--color-text-muted); }
  .meta-category { font-size: 0.75rem; padding: 0.125rem 0.5rem; background: var(--grove-overlay-8); border-radius: 1rem; color: var(--color-text-muted); }
  :global(.meta-icon) { width: 0.875rem; height: 0.875rem; }
  :global(.meta-icon.reading) { color: var(--color-primary); }
  :global(.meta-icon.favorite) { color: #fbbf24; }
  :global(.remove-btn) { min-width: 2.75rem; min-height: 2.75rem; }
  .empty-shelf { font-size: 0.85rem; color: var(--color-text-muted); opacity: 0.7; padding: 0.5rem 0; }
  .full-width { grid-column: 1 / -1; }
  .full-width textarea { resize: vertical; min-height: 2.5rem; }
  .checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; color: var(--color-text); }
  @media (max-width: 640px) {
    .form-grid { grid-template-columns: 1fr; }
    .title-row { flex-wrap: wrap; }
    .shelf-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
    .shelf-actions { flex-wrap: wrap; }
    .bookmark-item { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  }
</style>
