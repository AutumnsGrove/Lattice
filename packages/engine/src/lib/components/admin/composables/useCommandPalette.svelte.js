/**
 * Command Palette Composable
 * Manages the command palette (Cmd+K) functionality
 */

/**
 * Creates a command palette manager with Svelte 5 runes
 * @param {object} options - Configuration options
 * @param {Function} options.getActions - Function to get available actions
 * @param {Function} options.getThemes - Function to get available themes
 * @param {Function} options.getCurrentTheme - Function to get current theme
 * @returns {object} Command palette state and controls
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

  function execute(index) {
    const filtered = getFilteredCommands();
    const cmd = filtered[index];
    if (cmd && cmd.action) {
      cmd.action();
      close();
    }
    return cmd;
  }

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
