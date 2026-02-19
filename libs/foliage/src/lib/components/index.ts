// src/lib/components/index.ts
// Component exports

// Core theme components
export { default as ThemeSelector } from "./ThemeSelector.svelte";
export { default as ThemePreview } from "./ThemePreview.svelte";
export { default as AccentColorPicker } from "./AccentColorPicker.svelte";
export { default as ThemeCustomizer } from "./ThemeCustomizer.svelte";

// Customizer panels
export { default as ColorPanel } from "./ColorPanel.svelte";
export { default as TypographyPanel } from "./TypographyPanel.svelte";
export { default as LayoutPanel } from "./LayoutPanel.svelte";
export { default as CustomCSSEditor } from "./CustomCSSEditor.svelte";

// Font management
export { default as FontUploader } from "./FontUploader.svelte";

// Community themes (Oak+ tier)
export { default as ThemeRating } from "./ThemeRating.svelte";
export { default as CommunityThemeBrowser } from "./CommunityThemeBrowser.svelte";
export { default as CommunityThemeSubmit } from "./CommunityThemeSubmit.svelte";
export { default as ModerationQueue } from "./ModerationQueue.svelte";
