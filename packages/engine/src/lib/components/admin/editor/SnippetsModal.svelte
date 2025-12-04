<script>
  /**
   * SnippetsModal - Modal for managing markdown snippets
   */
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import { Button, Input } from '@groveengine/ui';

  let {
    open = $bindable(false),
    snippets = [],
    onSave = (snippet) => {},
    onDelete = (id) => {},
  } = $props();

  // Internal state
  let editingId = $state(null);
  let name = $state("");
  let content = $state("");
  let trigger = $state("");

  // Reset form when modal opens/closes
  $effect(() => {
    if (!open) {
      resetForm();
    }
  });

  function resetForm() {
    editingId = null;
    name = "";
    content = "";
    trigger = "";
  }

  export function editSnippet(snippet) {
    editingId = snippet.id;
    name = snippet.name;
    content = snippet.content;
    trigger = snippet.trigger || "";
    open = true;
  }

  function handleSave() {
    if (!name.trim() || !content.trim()) return;

    onSave({
      id: editingId,
      name: name.trim(),
      content: content,
      trigger: trigger.trim() || null,
    });

    open = false;
  }

  function handleDelete() {
    if (editingId && confirm("Delete this snippet?")) {
      onDelete(editingId);
      open = false;
    }
  }

  function selectSnippetToEdit(snippet) {
    editingId = snippet.id;
    name = snippet.name;
    content = snippet.content;
    trigger = snippet.trigger || "";
  }
</script>

<Dialog bind:open>
  <h3 slot="title">:: {editingId ? "edit snippet" : "new snippet"}</h3>

  <div class="snippets-modal-body">
    <div class="snippets-form">
      <div class="snippet-field">
        <label for="snippet-name">Name</label>
        <Input
          id="snippet-name"
          type="text"
          bind:value={name}
          placeholder="e.g., Blog signature"
        />
      </div>

      <div class="snippet-field">
        <label for="snippet-trigger">Trigger (optional)</label>
        <Input
          id="snippet-trigger"
          type="text"
          bind:value={trigger}
          placeholder="e.g., sig"
        />
        <span class="field-hint">Type /trigger to quickly insert</span>
      </div>

      <div class="snippet-field">
        <label for="snippet-content">Content</label>
        <textarea
          id="snippet-content"
          bind:value={content}
          placeholder="Enter your markdown snippet..."
          rows="6"
        ></textarea>
      </div>

      <div class="snippet-actions">
        {#if editingId}
          <Button
            variant="danger"
            onclick={handleDelete}
          >
            [<span class="key">d</span>elete]
          </Button>
        {/if}
        <div class="snippet-actions-right">
          <Button variant="outline" onclick={() => open = false}>
            [<span class="key">c</span>ancel]
          </Button>
          <Button
            onclick={handleSave}
            disabled={!name.trim() || !content.trim()}
          >
            {#if editingId}[<span class="key">u</span>pdate]{:else}[<span class="key">s</span>ave]{/if}
          </Button>
        </div>
      </div>
    </div>

    {#if snippets.length > 0 && !editingId}
      <div class="snippets-list-divider">
        <span>:: your snippets</span>
      </div>
      <div class="snippets-list">
        {#each snippets as snippet}
          <button
            type="button"
            class="snippet-list-item"
            onclick={() => selectSnippetToEdit(snippet)}
          >
            <span class="snippet-name">{snippet.name}</span>
            {#if snippet.trigger}
              <span class="snippet-trigger">/{snippet.trigger}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</Dialog>

<style>
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }

  .snippets-modal-body {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .snippets-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .snippet-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .snippet-field label {
    font-size: 0.8rem;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .snippet-field textarea {
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: var(--editor-bg-tertiary, #1a1a1a);
    border: 1px solid var(--editor-border, #3a3a3a);
    border-radius: 4px;
    color: var(--editor-text, #d4d4d4);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.85rem;
    resize: vertical;
    min-height: 120px;
  }

  .snippet-field textarea:focus {
    outline: none;
    border-color: var(--editor-accent, #8bc48b);
  }

  .field-hint {
    font-size: 0.7rem;
    color: var(--editor-text-dim, #9d9d9d);
    font-style: italic;
  }

  .snippet-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .snippet-actions-right {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  .snippets-list-divider {
    padding: 0.5rem 0;
    font-size: 0.75rem;
    color: var(--editor-accent-dim, #7a9a7a);
    border-top: 1px solid var(--editor-border, #3a3a3a);
    margin-top: 0.5rem;
  }

  .snippets-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 200px;
    overflow-y: auto;
  }

  .snippet-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: var(--editor-bg-tertiary, #1a1a1a);
    border: 1px solid var(--editor-border, #3a3a3a);
    border-radius: 4px;
    color: var(--editor-text, #d4d4d4);
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .snippet-list-item:hover {
    border-color: var(--editor-accent-dim, #7a9a7a);
    background: var(--editor-bg-secondary, #252526);
  }

  .snippet-trigger {
    font-size: 0.75rem;
    color: var(--editor-accent-dim, #7a9a7a);
  }
</style>
