/**
 * Editor Theme Composable
 * Manages theme selection and CSS variable application
 */

const THEME_STORAGE_KEY = "grove-editor-theme";

// Theme definitions
export const themes = {
  grove: {
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
  amber: {
    name: "amber",
    label: "Amber",
    desc: "classic terminal",
    accent: "#ffb000",
    accentDim: "#c98b00",
    accentBright: "#ffc940",
    accentGlow: "#ffe080",
    bg: "#1a1400",
    bgSecondary: "#241c00",
    bgTertiary: "#140e00",
    border: "#3a3000",
    borderAccent: "#5a4800",
    text: "#ffcc66",
    textDim: "#aa8844",
    statusBg: "#2a2000",
    statusBorder: "#3a3000",
  },
  matrix: {
    name: "matrix",
    label: "Matrix",
    desc: "digital rain",
    accent: "#00ff00",
    accentDim: "#00aa00",
    accentBright: "#44ff44",
    accentGlow: "#88ff88",
    bg: "#0a0a0a",
    bgSecondary: "#111111",
    bgTertiary: "#050505",
    border: "#1a3a1a",
    borderAccent: "#00aa00",
    text: "#00dd00",
    textDim: "#008800",
    statusBg: "#0a1a0a",
    statusBorder: "#1a3a1a",
  },
  dracula: {
    name: "dracula",
    label: "Dracula",
    desc: "purple night",
    accent: "#bd93f9",
    accentDim: "#9580c9",
    accentBright: "#d4b0ff",
    accentGlow: "#e8d0ff",
    bg: "#282a36",
    bgSecondary: "#343746",
    bgTertiary: "#21222c",
    border: "#44475a",
    borderAccent: "#6272a4",
    text: "#f8f8f2",
    textDim: "#a0a0a0",
    statusBg: "#3a3c4e",
    statusBorder: "#44475a",
  },
  nord: {
    name: "nord",
    label: "Nord",
    desc: "arctic frost",
    accent: "#88c0d0",
    accentDim: "#6a9aa8",
    accentBright: "#a3d4e2",
    accentGlow: "#c0e8f0",
    bg: "#2e3440",
    bgSecondary: "#3b4252",
    bgTertiary: "#272c36",
    border: "#434c5e",
    borderAccent: "#5e81ac",
    text: "#eceff4",
    textDim: "#a0a8b0",
    statusBg: "#3b4252",
    statusBorder: "#434c5e",
  },
  rose: {
    name: "rose",
    label: "Rose",
    desc: "soft pink",
    accent: "#f5a9b8",
    accentDim: "#c98a96",
    accentBright: "#ffccd5",
    accentGlow: "#ffe0e6",
    bg: "#1f1a1b",
    bgSecondary: "#2a2224",
    bgTertiary: "#171314",
    border: "#3a3234",
    borderAccent: "#5a4a4e",
    text: "#e8d8dc",
    textDim: "#a09498",
    statusBg: "#2a2224",
    statusBorder: "#3a3234",
  },
};

/**
 * @typedef {Object} Theme
 * @property {string} name
 * @property {string} label
 * @property {string} desc
 * @property {string} accent
 * @property {string} accentDim
 * @property {string} accentBright
 * @property {string} accentGlow
 * @property {string} bg
 * @property {string} bgSecondary
 * @property {string} bgTertiary
 * @property {string} border
 * @property {string} borderAccent
 * @property {string} text
 * @property {string} textDim
 * @property {string} statusBg
 * @property {string} statusBorder
 */

/**
 * @typedef {Object} EditorThemeManager
 * @property {string} currentTheme
 * @property {Record<string, Theme>} themes
 * @property {() => void} loadTheme
 * @property {(themeName: string) => void} setTheme
 */

/**
 * Creates an editor theme manager with Svelte 5 runes
 * @returns {EditorThemeManager} Theme state and controls
 */
/** @typedef {keyof typeof themes} ThemeName */

export function useEditorTheme() {
  let currentTheme = $state(/** @type {ThemeName} */ ("grove"));

  /** @param {string} themeName */
  function applyTheme(themeName) {
    const theme = themes[/** @type {ThemeName} */ (themeName)];
    if (!theme) return;

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

  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themes[/** @type {ThemeName} */ (stored)]) {
        currentTheme = /** @type {ThemeName} */ (stored);
        applyTheme(stored);
      }
    } catch (e) {
      console.warn("Failed to load theme:", e);
    }
  }

  /** @param {string} themeName */
  function saveTheme(themeName) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (e) {
      console.warn("Failed to save theme:", e);
    }
  }

  /** @param {string} themeName */
  function setTheme(themeName) {
    if (!themes[/** @type {ThemeName} */ (themeName)]) return;
    currentTheme = /** @type {ThemeName} */ (themeName);
    applyTheme(themeName);
    saveTheme(themeName);
  }

  return {
    get currentTheme() {
      return currentTheme;
    },
    themes,
    loadTheme,
    setTheme,
  };
}
