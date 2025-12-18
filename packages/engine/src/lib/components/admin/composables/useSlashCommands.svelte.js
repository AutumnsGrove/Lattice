/**
 * Slash Commands Composable
 * Manages the slash command menu and execution
 */

/**
 * @typedef {Object} SlashCommand
 * @property {string} id
 * @property {string} label
 * @property {string} insert
 * @property {number} [cursorOffset]
 * @property {boolean} [isSnippet]
 * @property {boolean} [isAction]
 * @property {(() => void)} [action]
 */

/**
 * @typedef {Object} SlashMenuState
 * @property {boolean} open
 * @property {string} query
 * @property {{x: number, y: number}} position
 * @property {number} selectedIndex
 */

/**
 * @typedef {Object} SlashCommandsOptions
 * @property {() => HTMLTextAreaElement|null} [getTextareaRef] - Function to get textarea reference
 * @property {() => string} [getContent] - Function to get content
 * @property {(content: string) => void} [setContent] - Function to set content
 * @property {() => Array<{id: string, name: string, content: string}>} [getSnippets] - Function to get user snippets
 * @property {() => void} [onOpenSnippetsModal] - Callback to open snippets modal
 */

/**
 * @typedef {Object} SlashCommandsManager
 * @property {SlashMenuState} menu
 * @property {boolean} isOpen
 * @property {() => SlashCommand[]} getAllCommands
 * @property {() => SlashCommand[]} getFilteredCommands
 * @property {() => void} open
 * @property {() => void} close
 * @property {(direction: 'up' | 'down') => void} navigate
 * @property {(index: number) => void} execute
 * @property {(key: string, cursorPos: number, content: string) => boolean} shouldTrigger
 */

// Base slash commands definition
/** @type {SlashCommand[]} */
export const baseSlashCommands = [
  { id: "heading1", label: "Heading 1", insert: "# " },
  { id: "heading2", label: "Heading 2", insert: "## " },
  { id: "heading3", label: "Heading 3", insert: "### " },
  { id: "code", label: "Code Block", insert: "```\n\n```", cursorOffset: 4 },
  { id: "quote", label: "Quote", insert: "> " },
  { id: "list", label: "Bullet List", insert: "- " },
  { id: "numbered", label: "Numbered List", insert: "1. " },
  { id: "link", label: "Link", insert: "[](url)", cursorOffset: 1 },
  { id: "image", label: "Image", insert: "![alt](url)", cursorOffset: 2 },
  { id: "divider", label: "Divider", insert: "\n---\n" },
  {
    id: "anchor",
    label: "Custom Anchor",
    insert: "<!-- anchor:name -->\n",
    cursorOffset: 14,
  },
];

/**
 * Creates a slash commands manager with Svelte 5 runes
 * @param {SlashCommandsOptions} options - Configuration options
 * @returns {SlashCommandsManager} Slash commands state and controls
 */
export function useSlashCommands(options = {}) {
  const {
    getTextareaRef,
    getContent,
    setContent,
    getSnippets,
    onOpenSnippetsModal,
  } = options;

  let menu = $state({
    open: false,
    query: "",
    position: { x: 0, y: 0 },
    selectedIndex: 0,
  });

  // Build full command list including snippets
  /** @returns {SlashCommand[]} */
  function getAllCommands() {
    const snippets = getSnippets ? getSnippets() : [];
    /** @type {SlashCommand[]} */
    const snippetCommands = snippets.map((s) => ({
      id: s.id,
      label: `> ${s.name}`,
      insert: s.content,
      isSnippet: true,
    }));

    /** @type {SlashCommand} */
    const newSnippetCommand = {
      id: "newSnippet",
      label: "Create New Snippet...",
      insert: "",
      isAction: true,
      action: onOpenSnippetsModal,
    };

    return [...baseSlashCommands, newSnippetCommand, ...snippetCommands];
  }

  // Get filtered commands based on query
  function getFilteredCommands() {
    const allCommands = getAllCommands();
    return allCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(menu.query.toLowerCase())
    );
  }

  function open() {
    menu.open = true;
    menu.query = "";
    menu.selectedIndex = 0;
  }

  function close() {
    menu.open = false;
  }

  /** @param {'up' | 'down'} direction */
  function navigate(direction) {
    const filtered = getFilteredCommands();
    const count = filtered.length;
    if (count === 0) return;

    if (direction === "down") {
      menu.selectedIndex = (menu.selectedIndex + 1) % count;
    } else if (direction === "up") {
      menu.selectedIndex = (menu.selectedIndex - 1 + count) % count;
    }
  }

  /** @param {number} index */
  function execute(index) {
    const filtered = getFilteredCommands();
    const cmd = filtered[index];
    if (!cmd) return;

    const textareaRef = getTextareaRef ? getTextareaRef() : null;
    const content = getContent ? getContent() : '';

    if (!textareaRef || !setContent) return;

    // Handle action commands (like "Create New Snippet...")
    if (cmd.isAction && cmd.action) {
      // Remove the slash that triggered the menu
      const pos = textareaRef.selectionStart;
      const textBefore = content.substring(0, pos);
      const lastSlashIndex = textBefore.lastIndexOf("/");
      if (lastSlashIndex >= 0) {
        setContent(content.substring(0, lastSlashIndex) + content.substring(pos));
      }
      menu.open = false;
      cmd.action();
      return;
    }

    // Remove the slash that triggered the menu and insert command
    const pos = textareaRef.selectionStart;
    const textBefore = content.substring(0, pos);
    const lastSlashIndex = textBefore.lastIndexOf("/");

    if (lastSlashIndex >= 0) {
      setContent(
        content.substring(0, lastSlashIndex) + cmd.insert + content.substring(pos)
      );

      setTimeout(() => {
        const newPos = lastSlashIndex + (cmd.cursorOffset || cmd.insert.length);
        textareaRef.selectionStart = textareaRef.selectionEnd = newPos;
        textareaRef.focus();
      }, 0);
    }

    menu.open = false;
  }

  /**
   * @param {string} key
   * @param {number} cursorPos
   * @param {string} content
   */
  function shouldTrigger(key, cursorPos, content) {
    if (key !== "/" || menu.open) return false;
    // Only trigger at start of line or after whitespace
    return cursorPos === 0 || /\s$/.test(content.substring(0, cursorPos));
  }

  return {
    get menu() {
      return menu;
    },
    get isOpen() {
      return menu.open;
    },
    getAllCommands,
    getFilteredCommands,
    open,
    close,
    navigate,
    execute,
    shouldTrigger,
  };
}
