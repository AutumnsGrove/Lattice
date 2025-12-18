/**
 * Command Palette Composable
 * Manages the command palette (Cmd+K) functionality
 */

/**
 * @typedef {Object} PaletteAction
 * @property {string} id
 * @property {string} label
 * @property {string} shortcut
 * @property {() => void} action
 * @property {string} [themeKey]
 * @property {boolean} [isTheme]
 */

/**
 * @typedef {Object} CommandPaletteState
 * @property {boolean} open
 * @property {string} query
 * @property {number} selectedIndex
 */

/**
 * @typedef {Object} CommandPaletteOptions
 * @property {() => PaletteAction[]} [getActions] - Function to get available actions
 * @property {() => Record<string, any>} [getThemes] - Function to get available themes
 * @property {() => string} [getCurrentTheme] - Function to get current theme
 */

/**
 * @typedef {Object} CommandPaletteManager
 * @property {CommandPaletteState} state
 * @property {boolean} isOpen
 * @property {string} query
 * @property {number} selectedIndex
 * @property {() => PaletteAction[]} getAllCommands
 * @property {() => PaletteAction[]} getFilteredCommands
 * @property {() => void} open
 * @property {() => void} close
 * @property {() => void} toggle
 * @property {(direction: 'up' | 'down') => void} navigate
 * @property {(index: number) => PaletteAction | undefined} execute
 * @property {(query: string) => void} setQuery
 */

/**
 * Creates a command palette manager with Svelte 5 runes
 * @param {CommandPaletteOptions} options - Configuration options
 * @returns {CommandPaletteManager} Command palette state and controls
 */
export function useCommandPalette(options = {}) {
  const { getActions, getThemes, getCurrentTheme } = options;

  let state = $state({
    open: false,
    query: "",
    selectedIndex: 0,
  });

  // Get all commands including theme commands
  function getAllCommands() {
    const actions = getActions ? getActions() : [];
    const themes = getThemes ? getThemes() : {};
    const currentTheme = getCurrentTheme ? getCurrentTheme() : "";

    const themeCommands = Object.entries(themes).map(([key, theme]) => ({
      id: `theme-${key}`,
      label: `Theme: ${theme.label} (${theme.desc})`,
      shortcut: currentTheme === key ? "●" : "",
      action: () => {
        // Theme action is handled by the caller
      },
      themeKey: key,
      isTheme: true,
    }));

    return [...actions, ...themeCommands];
  }

  // Get filtered commands based on query
  function getFilteredCommands() {
    const allCommands = getAllCommands();
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(state.query.toLowerCase())
    );
  }

  function open() {
    state.open = true;
    state.query = "";
    state.selectedIndex = 0;
  }

  function close() {
    state.open = false;
  }

  function toggle() {
    if (state.open) {
      close();
    } else {
      open();
    }
  }

  /** @param {'up' | 'down'} direction */
  function navigate(direction) {
    const filtered = getFilteredCommands();
    const count = filtered.length;
    if (count === 0) return;

    if (direction === "down") {
      state.selectedIndex = (state.selectedIndex + 1) % count;
    } else if (direction === "up") {
      state.selectedIndex = (state.selectedIndex - 1 + count) % count;
    }
  }

  /** @param {number} index */
  function execute(index) {
    const filtered = getFilteredCommands();
    const cmd = filtered[index];
    if (cmd && cmd.action) {
      cmd.action();
      close();
    }
    return cmd;
  }

  /** @param {string} query */
  function setQuery(query) {
    state.query = query;
    state.selectedIndex = 0;
  }

  return {
    get state() {
      return state;
    },
    get isOpen() {
      return state.open;
    },
    get query() {
      return state.query;
    },
    get selectedIndex() {
      return state.selectedIndex;
    },
    getAllCommands,
    getFilteredCommands,
    open,
    close,
    toggle,
    navigate,
    execute,
    setQuery,
  };
}
