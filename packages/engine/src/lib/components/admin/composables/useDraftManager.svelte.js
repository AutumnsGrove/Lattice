/**
 * Draft Manager Composable
 * Handles auto-saving drafts to localStorage
 */

const AUTO_SAVE_DELAY = 2000; // 2 seconds

/**
 * @typedef {Object} StoredDraft
 * @property {string} content
 * @property {string} savedAt
 */

/**
 * @typedef {Object} DraftManagerOptions
 * @property {string|null} [draftKey] - Unique key for localStorage
 * @property {() => string} [getContent] - Function to get current content
 * @property {(content: string) => void} [setContent] - Function to set content
 * @property {(draft: StoredDraft) => void} [onDraftRestored] - Callback when draft is restored
 * @property {boolean} [readonly] - Whether editor is readonly
 */

/**
 * @typedef {Object} DraftManager
 * @property {boolean} hasDraft
 * @property {boolean} draftRestorePrompt
 * @property {StoredDraft|null} storedDraft
 * @property {string} lastSavedContent
 * @property {(initialContent: string) => void} init
 * @property {(content: string) => void} scheduleSave
 * @property {() => void} saveDraft
 * @property {() => void} clearDraft
 * @property {() => void} restoreDraft
 * @property {() => void} discardDraft
 * @property {() => {hasDraft: boolean, storedDraft: StoredDraft|null}} getStatus
 * @property {(content: string) => boolean} hasUnsavedChanges
 * @property {() => void} cleanup
 */

/**
 * Creates a draft manager with Svelte 5 runes
 * @param {DraftManagerOptions} options - Configuration options
 * @returns {DraftManager} Draft state and controls
 */
export function useDraftManager(options = /** @type {DraftManagerOptions} */ ({})) {
  const { draftKey, getContent, setContent, onDraftRestored, readonly } = options;

  let lastSavedContent = $state("");
  /** @type {ReturnType<typeof setTimeout> | null} */
  let draftSaveTimer = $state(null);
  let hasDraft = $state(false);
  let draftRestorePrompt = $state(false);
  /** @type {StoredDraft | null} */
  let storedDraft = $state(null);

  function saveDraft() {
    if (!draftKey || readonly || !getContent) return;

    const content = getContent();
    try {
      const draft = {
        content,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(`draft:${draftKey}`, JSON.stringify(draft));
      lastSavedContent = content;
      hasDraft = true;
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  }

  function loadDraft() {
    if (!draftKey) return null;

    try {
      const stored = localStorage.getItem(`draft:${draftKey}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
    return null;
  }

  function clearDraft() {
    if (!draftKey) return;

    try {
      localStorage.removeItem(`draft:${draftKey}`);
      hasDraft = false;
      storedDraft = null;
      draftRestorePrompt = false;
    } catch (e) {
      console.warn("Failed to clear draft:", e);
    }
  }

  function restoreDraft() {
    if (storedDraft && setContent) {
      setContent(storedDraft.content);
      lastSavedContent = storedDraft.content;
      if (onDraftRestored) {
        onDraftRestored(storedDraft);
      }
    }
    draftRestorePrompt = false;
  }

  function discardDraft() {
    clearDraft();
    if (getContent) {
      lastSavedContent = getContent();
    }
  }

  /** @param {string} content */
  function scheduleSave(content) {
    if (!draftKey || readonly) return;

    // Clear previous timer
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }

    // Don't save if content hasn't changed from last saved version
    if (content === lastSavedContent) return;

    // Schedule a draft save
    draftSaveTimer = setTimeout(() => {
      saveDraft();
    }, AUTO_SAVE_DELAY);
  }

  /** @param {string} initialContent */
  function init(initialContent) {
    // Check for existing draft on mount
    if (draftKey) {
      const draft = loadDraft();
      if (draft && draft.content !== initialContent) {
        storedDraft = draft;
        draftRestorePrompt = true;
      } else {
        lastSavedContent = initialContent;
      }
    }
  }

  function cleanup() {
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
    }
  }

  function getStatus() {
    return { hasDraft, storedDraft };
  }

  /** @param {string} content */
  function hasUnsavedChanges(content) {
    return content !== lastSavedContent;
  }

  return {
    get hasDraft() {
      return hasDraft;
    },
    get draftRestorePrompt() {
      return draftRestorePrompt;
    },
    get storedDraft() {
      return storedDraft;
    },
    get lastSavedContent() {
      return lastSavedContent;
    },
    init,
    scheduleSave,
    saveDraft,
    clearDraft,
    restoreDraft,
    discardDraft,
    getStatus,
    hasUnsavedChanges,
    cleanup,
  };
}
