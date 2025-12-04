/**
 * Snippets Composable
 * Manages user-created markdown snippets stored in localStorage
 */

const SNIPPETS_STORAGE_KEY = "grove-editor-snippets";

/**
 * Creates a snippets manager with Svelte 5 runes
 * @returns {object} Snippets state and controls
 */
export function useSnippets() {
  let snippets = $state([]);

  let modal = $state({
    open: false,
    editingId: null,
    name: "",
    content: "",
    trigger: "",
  });

  function load() {
    try {
      const stored = localStorage.getItem(SNIPPETS_STORAGE_KEY);
      if (stored) {
        snippets = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load snippets:", e);
    }
  }

  function save() {
    try {
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets));
    } catch (e) {
      console.warn("Failed to save snippets:", e);
    }
  }

  function openModal(editId = null) {
    if (editId) {
      const snippet = snippets.find((s) => s.id === editId);
      if (snippet) {
        modal.editingId = editId;
        modal.name = snippet.name;
        modal.content = snippet.content;
        modal.trigger = snippet.trigger || "";
      }
    } else {
      modal.editingId = null;
      modal.name = "";
      modal.content = "";
      modal.trigger = "";
    }
    modal.open = true;
  }

  function closeModal() {
    modal.open = false;
    modal.editingId = null;
    modal.name = "";
    modal.content = "";
    modal.trigger = "";
  }

  function saveSnippet() {
    if (!modal.name.trim() || !modal.content.trim()) return;

    if (modal.editingId) {
      // Update existing snippet
      snippets = snippets.map((s) =>
        s.id === modal.editingId
          ? {
              ...s,
              name: modal.name.trim(),
              content: modal.content,
              trigger: modal.trigger.trim() || null,
            }
          : s
      );
    } else {
      // Create new snippet
      const newSnippet = {
        id: `snippet-${Date.now()}`,
        name: modal.name.trim(),
        content: modal.content,
        trigger: modal.trigger.trim() || null,
        createdAt: new Date().toISOString(),
      };
      snippets = [...snippets, newSnippet];
    }

    save();
    closeModal();
  }

  function deleteSnippet(id) {
    if (confirm("Delete this snippet?")) {
      snippets = snippets.filter((s) => s.id !== id);
      save();
      if (modal.editingId === id) {
        closeModal();
      }
    }
  }

  return {
    get snippets() {
      return snippets;
    },
    get modal() {
      return modal;
    },
    load,
    openModal,
    closeModal,
    saveSnippet,
    deleteSnippet,
  };
}
