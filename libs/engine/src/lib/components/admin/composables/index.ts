/**
 * MarkdownEditor Composables
 * Extracted from MarkdownEditor.svelte for better maintainability
 *
 * Note: useAmbientSounds, useSnippets, and useWritingSession were removed (features deprecated)
 */

export { useEditorTheme } from "./useEditorTheme.svelte";
export type { Theme, EditorThemeManager } from "./useEditorTheme.svelte";

export { useDraftManager } from "./useDraftManager.svelte";
export type {
  StoredDraft,
  DraftManagerOptions,
  DraftManager,
  SaveStatus,
} from "./useDraftManager.svelte";
