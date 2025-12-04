/**
 * MarkdownEditor Components
 *
 * This module exports all editor sub-components for use in the MarkdownEditor
 * or for custom editor implementations.
 *
 * Usage in MarkdownEditor.svelte:
 *   import { EditorToolbar, EditorStatusBar, ... } from './editor';
 *
 * Usage in custom implementations:
 *   import { CommandPalette, SnippetsModal } from '$lib/components/admin/editor';
 */

// Theme and configuration
export {
  themes,
  soundLibrary,
  applyTheme,
  loadTheme,
  saveTheme,
  THEME_STORAGE_KEY,
  SOUNDS_STORAGE_KEY,
  SNIPPETS_STORAGE_KEY,
} from './EditorThemes.js';

// UI Components
export { default as EditorToolbar } from './EditorToolbar.svelte';
export { default as EditorStatusBar } from './EditorStatusBar.svelte';
export { default as SlashCommandMenu } from './SlashCommandMenu.svelte';
export { default as CommandPalette } from './CommandPalette.svelte';
export { default as AmbientSoundsPanel } from './AmbientSoundsPanel.svelte';
export { default as SnippetsModal } from './SnippetsModal.svelte';
export { default as FullPreviewModal } from './FullPreviewModal.svelte';
export { default as CampfireControls } from './CampfireControls.svelte';
