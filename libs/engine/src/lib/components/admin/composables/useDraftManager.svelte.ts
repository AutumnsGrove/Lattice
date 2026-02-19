/**
 * Draft Manager Composable
 * Handles auto-saving drafts to localStorage and server (TenantDO)
 */

import { apiRequest } from "$lib/utils/api";

const AUTO_SAVE_DELAY = 5000; // 5 seconds

export interface DraftMetadata {
  title?: string;
  description?: string;
  tags?: string[];
}

export interface StoredDraft {
  content: string;
  savedAt: string;
  metadata?: DraftMetadata;
}

export interface DraftManagerOptions {
  /** Unique key for localStorage */
  draftKey?: string | null;
  /** Function to get current content */
  getContent?: () => string;
  /** Function to set content */
  setContent?: (content: string) => void;
  /** Callback when draft is restored */
  onDraftRestored?: (draft: StoredDraft) => void;
  /** Whether editor is readonly */
  readonly?: boolean;
  /** Function to get current metadata (title, description, tags) */
  getMetadata?: () => DraftMetadata;
  /** Server-side draft slug for cross-device sync (null disables server sync) */
  serverSlug?: string | null;
}

export type SaveStatus = "idle" | "saving" | "saved";
export type ServerSyncStatus = "idle" | "syncing" | "synced" | "error";

export interface DraftManager {
  readonly hasDraft: boolean;
  readonly draftRestorePrompt: boolean;
  readonly storedDraft: StoredDraft | null;
  readonly lastSavedContent: string;
  readonly saveStatus: SaveStatus;
  readonly serverSyncStatus: ServerSyncStatus;
  init: (initialContent: string) => void;
  scheduleSave: (content: string) => void;
  saveDraft: () => void;
  clearDraft: () => void;
  restoreDraft: () => void;
  discardDraft: () => void;
  getStatus: () => { hasDraft: boolean; storedDraft: StoredDraft | null };
  hasUnsavedChanges: (content: string) => boolean;
  flushSave: () => void;
  cleanup: () => void;
}

/**
 * Get or create a stable device ID for cross-device draft conflict detection.
 * Stored in localStorage so it persists across sessions on the same device.
 */
function getDeviceId(): string {
  const key = "grove-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

/**
 * Creates a draft manager with Svelte 5 runes
 */
export function useDraftManager(
  options: DraftManagerOptions = {},
): DraftManager {
  const {
    draftKey,
    getContent,
    setContent,
    onDraftRestored,
    readonly,
    getMetadata,
    serverSlug,
  } = options;

  let lastSavedContent = $state("");
  let draftSaveTimer = $state<ReturnType<typeof setTimeout> | null>(null);
  let hasDraft = $state(false);
  let draftRestorePrompt = $state(false);
  let storedDraft = $state<StoredDraft | null>(null);
  let saveStatus = $state<SaveStatus>("idle");
  let serverSyncStatus = $state<ServerSyncStatus>("idle");
  let savedConfirmTimer = $state<ReturnType<typeof setTimeout> | null>(null);

  function saveDraft(): void {
    if (!draftKey || readonly || !getContent) return;

    const content = getContent();
    const metadata = getMetadata?.();
    saveStatus = "saving";
    try {
      const draft: StoredDraft = {
        content,
        savedAt: new Date().toISOString(),
        metadata,
      };
      localStorage.setItem(`draft:${draftKey}`, JSON.stringify(draft));
      lastSavedContent = content;
      hasDraft = true;
      saveStatus = "saved";

      // Clear "saved" status after 2 seconds
      if (savedConfirmTimer) clearTimeout(savedConfirmTimer);
      savedConfirmTimer = setTimeout(() => {
        saveStatus = "idle";
      }, 2000);

      // Fire-and-forget server sync after localStorage save
      syncToServer(content, metadata);
    } catch (e) {
      console.warn("Failed to save draft:", e);
      saveStatus = "idle";
    }
  }

  /**
   * Sync draft to server via PUT /api/drafts/{slug}.
   * Non-blocking — localStorage is the source of truth,
   * server sync is additive for cross-device durability.
   */
  async function syncToServer(
    content: string,
    metadata?: DraftMetadata,
  ): Promise<void> {
    if (!serverSlug) return;

    serverSyncStatus = "syncing";
    try {
      const deviceId = getDeviceId();
      await apiRequest(`/api/drafts/${encodeURIComponent(serverSlug)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          metadata: {
            title: metadata?.title || "Untitled",
            description: metadata?.description,
            tags: metadata?.tags,
          },
          deviceId,
        }),
      });
      serverSyncStatus = "synced";
    } catch (e) {
      console.warn("Server draft sync failed (local draft is safe):", e);
      serverSyncStatus = "error";
    }
  }

  /**
   * Best-effort server sync during page unload using sendBeacon.
   * sendBeacon always sends POST (can't set method), so the API
   * needs a POST handler that delegates to the same upsert logic.
   * CSRF is covered by origin-based fallback in hooks.server.ts.
   */
  function beaconSyncToServer(): void {
    if (!serverSlug || !getContent) return;

    try {
      const deviceId = getDeviceId();
      const content = getContent();
      const metadata = getMetadata?.();
      const blob = new Blob(
        [
          JSON.stringify({
            content,
            metadata: {
              title: metadata?.title || "Untitled",
              description: metadata?.description,
              tags: metadata?.tags,
            },
            deviceId,
          }),
        ],
        { type: "application/json" },
      );
      navigator.sendBeacon(
        `/api/drafts/${encodeURIComponent(serverSlug)}`,
        blob,
      );
    } catch {
      // Best-effort — if beacon fails, localStorage draft is still there
    }
  }

  function loadDraft(): StoredDraft | null {
    if (!draftKey) return null;

    try {
      const stored = localStorage.getItem(`draft:${draftKey}`);
      if (stored) {
        return JSON.parse(stored) as StoredDraft;
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    }
    return null;
  }

  function clearDraft(): void {
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

  function restoreDraft(): void {
    if (storedDraft && setContent) {
      setContent(storedDraft.content);
      lastSavedContent = storedDraft.content;
      if (onDraftRestored) {
        onDraftRestored(storedDraft);
      }
    }
    draftRestorePrompt = false;
  }

  function discardDraft(): void {
    clearDraft();
    if (getContent) {
      lastSavedContent = getContent();
    }
  }

  function scheduleSave(content: string): void {
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

  let initialized = false;

  function init(initialContent: string): void {
    // Guard: only run once per component lifecycle.
    // The mount effect can re-run if reactive dependencies sneak in;
    // re-initializing would re-show the draft banner after dismiss.
    if (initialized) return;
    initialized = true;

    // Always set lastSavedContent so auto-save has a correct baseline.
    // Without this, lastSavedContent stays "" when a draft is found,
    // causing the auto-save to think content has changed immediately.
    lastSavedContent = initialContent;

    // Check for existing draft on mount
    if (draftKey) {
      const draft = loadDraft();
      if (draft && draft.content !== initialContent) {
        storedDraft = draft;
        draftRestorePrompt = true;
      }
    }
  }

  /**
   * Immediately persist any pending draft save.
   * Called on component unmount, beforeunload, visibilitychange,
   * and beforeNavigate to prevent data loss.
   */
  function flushSave(): void {
    if (!draftKey || readonly || !getContent) return;

    // If there's a pending debounce timer, cancel it and save now
    if (draftSaveTimer) {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = null;
    }

    // Save if content has changed since last save
    const current = getContent();
    if (current !== lastSavedContent) {
      saveDraft();
    }

    // Best-effort server sync via sendBeacon (survives page teardown)
    beaconSyncToServer();
  }

  function cleanup(): void {
    // Flush any pending draft save before clearing timers
    flushSave();

    if (savedConfirmTimer) {
      clearTimeout(savedConfirmTimer);
    }
  }

  function getStatus(): { hasDraft: boolean; storedDraft: StoredDraft | null } {
    return { hasDraft, storedDraft };
  }

  function hasUnsavedChanges(content: string): boolean {
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
    get saveStatus() {
      return saveStatus;
    },
    get serverSyncStatus() {
      return serverSyncStatus;
    },
    init,
    scheduleSave,
    saveDraft,
    clearDraft,
    restoreDraft,
    discardDraft,
    getStatus,
    hasUnsavedChanges,
    flushSave,
    cleanup,
  };
}
