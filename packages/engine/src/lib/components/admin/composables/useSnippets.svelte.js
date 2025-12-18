/**
 * Snippets Composable
 * Manages user-created markdown snippets stored in localStorage
 */

const SNIPPETS_STORAGE_KEY = "grove-editor-snippets";

/**
 * @typedef {Object} Snippet
 * @property {string} id
 * @property {string} name
 * @property {string} content
 * @property {string|null} trigger
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} SnippetModal
 * @property {boolean} open
 * @property {string|null} editingId
 * @property {string} name
 * @property {string} content
 * @property {string} trigger
 */

/**
 * @typedef {Object} SnippetsManager
 * @property {Snippet[]} snippets
 * @property {SnippetModal} modal
 * @property {() => void} load
 * @property {(editId?: string|null) => void} openModal
 * @property {() => void} closeModal
 * @property {() => void} saveSnippet
 * @property {(id: string) => void} deleteSnippet
 */

/**
 * Creates a snippets manager with Svelte 5 runes
 * @returns {SnippetsManager} Snippets state and controls
 */
export function useSnippets() {
  /** @type {Snippet[]} */
  let snippets = $state([]);

  let modal = $state(/** @type {SnippetModal} */ ({
    open: false,
    editingId: null,
    name: "",
    content: "",
    trigger: "",
  }));

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

  /** @param {string | null} [editId] */
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

  /** @param {string} id */
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
