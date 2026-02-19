/**
 * Editor Theme Composable
 * Applies the Grove theme CSS variables to the editor, reactive to light/dark mode
 */

import { themeStore } from "$lib/ui/stores/theme.svelte";

export interface Theme {
  name: string;
  label: string;
  desc: string;
  accent: string;
  accentDim: string;
  accentBright: string;
  accentGlow: string;
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  border: string;
  borderAccent: string;
  text: string;
  textDim: string;
  statusBg: string;
  statusBorder: string;
}

const groveThemes = {
  dark: {
    name: "grove",
    label: "Grove",
    desc: "forest green",
    accent: "#8bc48b",
    accentDim: "#7a9a7a",
    accentBright: "#a8dca8",
    accentGlow: "#c8f0c8",
    bg: "#1e1e1e",
    bgSecondary: "#252526",
    bgTertiary: "#1a1a1a",
    border: "#3a3a3a",
    borderAccent: "#4a7c4a",
    text: "#d4d4d4",
    textDim: "#9d9d9d",
    statusBg: "#2d4a2d",
    statusBorder: "#3d5a3d",
  },
  light: {
    name: "grove",
    label: "Grove",
    desc: "forest green",
    accent: "#4a8c4a",
    accentDim: "#6a9a6a",
    accentBright: "#3a7c3a",
    accentGlow: "#2d6a2d",
    bg: "#ffffff",
    bgSecondary: "#f9f9f9",
    bgTertiary: "#f5f5f5",
    border: "#e0e0e0",
    borderAccent: "#4a8c4a",
    text: "#333333",
    textDim: "#777777",
    statusBg: "#e8f5e9",
    statusBorder: "#c8e6c9",
  },
} satisfies Record<string, Theme>;

export interface EditorThemeManager {
  currentTheme: string;
  loadTheme: () => void;
}

/**
 * Creates an editor theme manager
 * Reactively applies light/dark theme based on the site's theme setting
 */
export function useEditorTheme(): EditorThemeManager {
  function applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.style.setProperty("--editor-accent", theme.accent);
    root.style.setProperty("--editor-accent-dim", theme.accentDim);
    root.style.setProperty("--editor-accent-bright", theme.accentBright);
    root.style.setProperty("--editor-accent-glow", theme.accentGlow);
    root.style.setProperty("--editor-bg", theme.bg);
    root.style.setProperty("--editor-bg-secondary", theme.bgSecondary);
    root.style.setProperty("--editor-bg-tertiary", theme.bgTertiary);
    root.style.setProperty("--editor-border", theme.border);
    root.style.setProperty("--editor-border-accent", theme.borderAccent);
    root.style.setProperty("--editor-text", theme.text);
    root.style.setProperty("--editor-text-dim", theme.textDim);
    root.style.setProperty("--editor-status-bg", theme.statusBg);
    root.style.setProperty("--editor-status-border", theme.statusBorder);
  }

  function loadTheme(): void {
    const isDark = themeStore.resolvedTheme === "dark";
    applyTheme(isDark ? groveThemes.dark : groveThemes.light);
  }

  $effect(() => {
    const isDark = themeStore.resolvedTheme === "dark";
    applyTheme(isDark ? groveThemes.dark : groveThemes.light);
  });

  return {
    currentTheme: "grove",
    loadTheme,
  };
}
