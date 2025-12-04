<script>
  import { marked } from "marked";
  import { onMount, tick } from "svelte";
  import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
  import "$lib/styles/content.css";
  import { Button, Input } from '@groveengine/ui';
  import Dialog from "$lib/components/ui/Dialog.svelte";

  // Props
  let {
    content = $bindable(""),
    onSave = () => {},
    saving = false,
    readonly = false,
    draftKey = null, // Unique key for localStorage draft storage
    onDraftRestored = () => {}, // Callback when draft is restored
    // Optional metadata for full preview mode
    previewTitle = "",
    previewDate = "",
    previewTags = [],
  } = $props();

  // Local state
  let textareaRef = $state(null);
  let previewRef = $state(null);
  let showPreview = $state(true);
  let lineNumbers = $state([]);
  let cursorLine = $state(1);
  let cursorCol = $state(1);

  // Image upload state
  let isDragging = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state("");
  let uploadError = $state(null);

  // Auto-save draft state
  let lastSavedContent = $state("");
  let draftSaveTimer = $state(null);
  let hasDraft = $state(false);
  let draftRestorePrompt = $state(false);
  let storedDraft = $state(null);
  const AUTO_SAVE_DELAY = 2000; // 2 seconds

  // Full preview mode state
  let showFullPreview = $state(false);

  // Editor settings (configurable, persisted to localStorage)
  let editorSettings = $state({
    typewriterMode: false,
    zenMode: false,
    showLineNumbers: true,
    wordWrap: true,
  });

  // Zen mode state
  let isZenMode = $state(false);

  // Campfire session state
  let campfireSession = $state({
    active: false,
    startTime: null,
    targetMinutes: 25,
    startWordCount: 0,
  });

  // Writing goals
  let writingGoal = $state({
    enabled: false,
    targetWords: 500,
    sessionWords: 0,
  });

  // Slash commands state
  let slashMenu = $state({
    open: false,
    query: "",
    position: { x: 0, y: 0 },
    selectedIndex: 0,
  });

  // Command palette state
  let commandPalette = $state({
    open: false,
    query: "",
    selectedIndex: 0,
  });

  // AI Assistant state (stubs - not deployed yet)
  let aiAssistant = $state({
    enabled: false, // Keep disabled for now
    panelOpen: false,
    suggestions: [],
    isAnalyzing: false,
  });

  // Markdown snippets state
  let snippets = $state([]);
  let snippetsModal = $state({
    open: false,
    editingId: null,
    name: "",
    content: "",
    trigger: "", // Optional shortcut trigger like "sig" for signature
  });

  // Ambient sounds state
  let ambientSounds = $state({
    enabled: false,
    currentSound: "forest",
    volume: 0.3,
    showPanel: false,
  });
  let audioElement = $state(null);

  // Theme system
  const themes = {
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

  let currentTheme = $state("grove");
  const THEME_STORAGE_KEY = "grove-editor-theme";

  // Sound definitions with free ambient loops
  const soundLibrary = {
    forest: {
      name: "forest",
      key: "f",
      // Using freesound.org URLs for ambient sounds (CC0 licensed)
      // These are placeholder paths - user can provide their own audio files
      url: "/sounds/forest-ambience.mp3",
      description: "birds, wind",
    },
    rain: {
      name: "rain",
      key: "r",
      url: "/sounds/rain-ambience.mp3",
      description: "gentle rainfall",
    },
    campfire: {
      name: "fire",
      key: "i",
      url: "/sounds/campfire-ambience.mp3",
      description: "crackling embers",
    },
    night: {
      name: "night",
      key: "n",
      url: "/sounds/night-ambience.mp3",
      description: "crickets, breeze",
    },
    cafe: {
      name: "cafe",
      key: "a",
      url: "/sounds/cafe-ambience.mp3",
      description: "soft murmurs",
    },
  };

  // Line numbers container ref for scroll sync
  let lineNumbersRef = $state(null);

  // Computed values
  let wordCount = $derived(
    content.trim() ? content.trim().split(/\s+/).length : 0
  );
  let charCount = $derived(content.length);
  let lineCount = $derived(content.split("\n").length);

  let previewHtml = $derived(content ? sanitizeMarkdown(marked.parse(content)) : "");

  // Reading time estimate (average 200 words per minute)
  let readingTime = $derived(() => {
    const minutes = Math.ceil(wordCount / 200);
    return minutes < 1 ? "< 1 min" : `~${minutes} min read`;
  });

  // Writing goal progress
  let goalProgress = $derived(() => {
    if (!writingGoal.enabled) return 0;
    const wordsWritten = wordCount - writingGoal.sessionWords;
    return Math.min(100, Math.round((wordsWritten / writingGoal.targetWords) * 100));
  });

  // Campfire session elapsed time
  let campfireElapsed = $derived(() => {
    if (!campfireSession.active || !campfireSession.startTime) return "0:00";
    const now = Date.now();
    const elapsed = Math.floor((now - campfireSession.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  // Extract available anchors from content (headings and custom anchors)
  let availableAnchors = $derived.by(() => {
    const anchors = [];
    // Extract headings
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      anchors.push(match[0].trim());
    }
    // Extract custom anchors
    const anchorRegex = /<!--\s*anchor:([\w-]+)\s*-->/g;
    while ((match = anchorRegex.exec(content)) !== null) {
      anchors.push(`anchor:${match[1]}`);
    }
    return anchors;
  });

  // Public function to get available anchors
  export function getAvailableAnchors() {
    return availableAnchors;
  }

  // Public function to insert an anchor at cursor position
  export function insertAnchor(name) {
    insertAtCursor(`<!-- anchor:${name} -->\n`);
  }

  // Update line numbers when content changes
  $effect(() => {
    const lines = content.split("\n").length;
    lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);
  });

  // Handle cursor position tracking
  function updateCursorPosition() {
    if (!textareaRef) return;

    const pos = textareaRef.selectionStart;
    const textBefore = content.substring(0, pos);
    const lines = textBefore.split("\n");
    cursorLine = lines.length;
    cursorCol = lines[lines.length - 1].length + 1;
  }

  // Handle tab key for indentation
  function handleKeydown(e) {
    // Escape key handling
    if (e.key === "Escape") {
      if (slashMenu.open) {
        slashMenu.open = false;
        return;
      }
      if (commandPalette.open) {
        commandPalette.open = false;
        return;
      }
      if (isZenMode) {
        isZenMode = false;
        return;
      }
    }

    // Slash commands trigger
    if (e.key === "/" && !slashMenu.open) {
      const pos = textareaRef.selectionStart;
      const textBefore = content.substring(0, pos);
      // Only trigger at start of line or after whitespace
      if (pos === 0 || /\s$/.test(textBefore)) {
        // Don't prevent default yet - let the slash be typed
        setTimeout(() => {
          openSlashMenu();
        }, 0);
      }
    }

    // Close slash menu on space or enter if open
    if (slashMenu.open && (e.key === " " || e.key === "Enter")) {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSlashCommand(slashMenu.selectedIndex);
      }
      slashMenu.open = false;
    }

    // Navigate slash menu
    if (slashMenu.open) {
      const cmdCount = filteredSlashCommands.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        slashMenu.selectedIndex = (slashMenu.selectedIndex + 1) % cmdCount;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        slashMenu.selectedIndex = (slashMenu.selectedIndex - 1 + cmdCount) % cmdCount;
      }
    }

    // Command palette: Cmd+K
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commandPalette.open = !commandPalette.open;
      commandPalette.query = "";
      commandPalette.selectedIndex = 0;
    }

    // Zen mode: Cmd+Shift+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      toggleZenMode();
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;

      // Insert 2 spaces
      content = content.substring(0, start) + "  " + content.substring(end);

      // Move cursor
      setTimeout(() => {
        textareaRef.selectionStart = textareaRef.selectionEnd = start + 2;
      }, 0);
    }

    // Cmd/Ctrl + S to save
    if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    }

    // Cmd/Ctrl + B for bold
    if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      wrapSelection("**", "**");
    }

    // Cmd/Ctrl + I for italic
    if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      wrapSelection("_", "_");
    }
  }

  // Global keyboard handler for modals
  function handleGlobalKeydown(e) {
    if (e.key === "Escape") {
      if (ambientSounds.showPanel) {
        ambientSounds.showPanel = false;
        e.preventDefault();
        return;
      }
      if (snippetsModal.open) {
        closeSnippetsModal();
        e.preventDefault();
        return;
      }
      if (showFullPreview) {
        showFullPreview = false;
        e.preventDefault();
      }
    }
  }

  // Slash commands definition
  const slashCommands = [
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
    { id: "anchor", label: "Custom Anchor", insert: "<!-- anchor:name -->\n", cursorOffset: 14 },
    { id: "newSnippet", label: "Create New Snippet...", insert: "", isAction: true, action: () => openSnippetsModal() },
  ];

  // Dynamic slash commands including user snippets
  let allSlashCommands = $derived(() => {
    const snippetCommands = snippets.map(s => ({
      id: s.id,
      label: `> ${s.name}`,
      insert: s.content,
      isSnippet: true,
    }));
    return [...slashCommands, ...snippetCommands];
  });

  // Filtered slash commands based on query
  let filteredSlashCommands = $derived(
    allSlashCommands().filter(cmd =>
      cmd.label.toLowerCase().includes(slashMenu.query.toLowerCase())
    )
  );

  function openSlashMenu() {
    slashMenu.open = true;
    slashMenu.query = "";
    slashMenu.selectedIndex = 0;
  }

  function executeSlashCommand(index) {
    const cmd = filteredSlashCommands[index];
    if (!cmd) return;

    // Handle action commands (like "Create New Snippet...")
    if (cmd.isAction && cmd.action) {
      // Remove the slash that triggered the menu
      const pos = textareaRef.selectionStart;
      const textBefore = content.substring(0, pos);
      const lastSlashIndex = textBefore.lastIndexOf("/");
      if (lastSlashIndex >= 0) {
        content = content.substring(0, lastSlashIndex) + content.substring(pos);
      }
      slashMenu.open = false;
      cmd.action();
      return;
    }

    // Remove the slash that triggered the menu
    const pos = textareaRef.selectionStart;
    const textBefore = content.substring(0, pos);
    const lastSlashIndex = textBefore.lastIndexOf("/");

    if (lastSlashIndex >= 0) {
      content = content.substring(0, lastSlashIndex) + cmd.insert + content.substring(pos);

      setTimeout(() => {
        const newPos = lastSlashIndex + (cmd.cursorOffset || cmd.insert.length);
        textareaRef.selectionStart = textareaRef.selectionEnd = newPos;
        textareaRef.focus();
      }, 0);
    }

    slashMenu.open = false;
  }

  // Command palette actions
  const basePaletteCommands = [
    { id: "save", label: "Save", shortcut: "⌘S", action: () => onSave() },
    { id: "preview", label: "Toggle Preview", shortcut: "", action: () => showPreview = !showPreview },
    { id: "fullPreview", label: "Full Preview", shortcut: "", action: () => showFullPreview = true },
    { id: "zen", label: "Toggle Zen Mode", shortcut: "⌘⇧↵", action: () => toggleZenMode() },
    { id: "campfire", label: "Start Campfire Session", shortcut: "", action: () => startCampfireSession() },
    { id: "bold", label: "Bold", shortcut: "⌘B", action: () => wrapSelection("**", "**") },
    { id: "italic", label: "Italic", shortcut: "⌘I", action: () => wrapSelection("_", "_") },
    { id: "code", label: "Insert Code Block", shortcut: "", action: () => insertCodeBlock() },
    { id: "link", label: "Insert Link", shortcut: "", action: () => insertLink() },
    { id: "image", label: "Insert Image", shortcut: "", action: () => insertImage() },
    { id: "goal", label: "Set Writing Goal", shortcut: "", action: () => promptWritingGoal() },
    { id: "snippets", label: "Manage Snippets", shortcut: "", action: () => openSnippetsModal() },
    { id: "newSnippet", label: "Create New Snippet", shortcut: "", action: () => openSnippetsModal() },
    { id: "sounds", label: "Toggle Ambient Sounds", shortcut: "", action: () => toggleAmbientSound() },
    { id: "soundPanel", label: "Sound Settings", shortcut: "", action: () => toggleSoundPanel() },
  ];

  // Add theme commands dynamically
  let paletteCommands = $derived(() => {
    const themeCommands = Object.entries(themes).map(([key, theme]) => ({
      id: `theme-${key}`,
      label: `Theme: ${theme.label} (${theme.desc})`,
      shortcut: currentTheme === key ? "●" : "",
      action: () => setTheme(key),
    }));
    return [...basePaletteCommands, ...themeCommands];
  });

  let filteredPaletteCommands = $derived(
    paletteCommands().filter(cmd =>
      cmd.label.toLowerCase().includes(commandPalette.query.toLowerCase())
    )
  );

  function executePaletteCommand(index) {
    const cmd = filteredPaletteCommands[index];
    if (cmd) {
      cmd.action();
      commandPalette.open = false;
    }
  }

  // Zen mode toggle
  function toggleZenMode() {
    isZenMode = !isZenMode;
    if (isZenMode) {
      editorSettings.typewriterMode = true;
    }
  }

  // Campfire session controls
  function startCampfireSession() {
    campfireSession.active = true;
    campfireSession.startTime = Date.now();
    campfireSession.startWordCount = wordCount;
  }

  function endCampfireSession() {
    const wordsWritten = wordCount - campfireSession.startWordCount;
    const elapsed = campfireSession.startTime ? Math.floor((Date.now() - campfireSession.startTime) / 1000) : 0;

    // Could show a summary modal here
    campfireSession.active = false;
    campfireSession.startTime = null;
  }

  // Writing goal prompt
  function promptWritingGoal() {
    const target = prompt("Set your word goal for this session:", "500");
    if (target && !isNaN(parseInt(target))) {
      writingGoal.enabled = true;
      writingGoal.targetWords = parseInt(target);
      writingGoal.sessionWords = wordCount;
    }
  }

  // Snippet management
  const SNIPPETS_STORAGE_KEY = "grove-editor-snippets";

  function loadSnippets() {
    try {
      const stored = localStorage.getItem(SNIPPETS_STORAGE_KEY);
      if (stored) {
        snippets = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to load snippets:", e);
    }
  }

  function saveSnippets() {
    try {
      localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets));
    } catch (e) {
      console.warn("Failed to save snippets:", e);
    }
  }

  function openSnippetsModal(editId = null) {
    if (editId) {
      const snippet = snippets.find(s => s.id === editId);
      if (snippet) {
        snippetsModal.editingId = editId;
        snippetsModal.name = snippet.name;
        snippetsModal.content = snippet.content;
        snippetsModal.trigger = snippet.trigger || "";
      }
    } else {
      snippetsModal.editingId = null;
      snippetsModal.name = "";
      snippetsModal.content = "";
      snippetsModal.trigger = "";
    }
    snippetsModal.open = true;
    commandPalette.open = false;
  }

  function closeSnippetsModal() {
    snippetsModal.open = false;
    snippetsModal.editingId = null;
    snippetsModal.name = "";
    snippetsModal.content = "";
    snippetsModal.trigger = "";
  }

  function saveSnippet() {
    if (!snippetsModal.name.trim() || !snippetsModal.content.trim()) return;

    if (snippetsModal.editingId) {
      // Update existing snippet
      snippets = snippets.map(s =>
        s.id === snippetsModal.editingId
          ? {
              ...s,
              name: snippetsModal.name.trim(),
              content: snippetsModal.content,
              trigger: snippetsModal.trigger.trim() || null,
            }
          : s
      );
    } else {
      // Create new snippet
      const newSnippet = {
        id: `snippet-${Date.now()}`,
        name: snippetsModal.name.trim(),
        content: snippetsModal.content,
        trigger: snippetsModal.trigger.trim() || null,
        createdAt: new Date().toISOString(),
      };
      snippets = [...snippets, newSnippet];
    }

    saveSnippets();
    closeSnippetsModal();
  }

  function deleteSnippet(id) {
    if (confirm("Delete this snippet?")) {
      snippets = snippets.filter(s => s.id !== id);
      saveSnippets();
      if (snippetsModal.editingId === id) {
        closeSnippetsModal();
      }
    }
  }

  function insertSnippet(snippet) {
    insertAtCursor(snippet.content);
    slashMenu.open = false;
  }

  // Ambient sound controls
  const SOUNDS_STORAGE_KEY = "grove-editor-sounds";

  function loadSoundSettings() {
    try {
      const stored = localStorage.getItem(SOUNDS_STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        ambientSounds.currentSound = settings.currentSound || "forest";
        ambientSounds.volume = settings.volume ?? 0.3;
        // Don't auto-enable on load - user must click to start
      }
    } catch (e) {
      console.warn("Failed to load sound settings:", e);
    }
  }

  function saveSoundSettings() {
    try {
      localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify({
        currentSound: ambientSounds.currentSound,
        volume: ambientSounds.volume,
      }));
    } catch (e) {
      console.warn("Failed to save sound settings:", e);
    }
  }

  function toggleAmbientSound() {
    if (ambientSounds.enabled) {
      stopSound();
    } else {
      playSound(ambientSounds.currentSound);
    }
  }

  function playSound(soundKey) {
    const sound = soundLibrary[soundKey];
    if (!sound) return;

    // Stop current sound if playing
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }

    // Create new audio element
    audioElement = new Audio(sound.url);
    audioElement.loop = true;
    audioElement.volume = ambientSounds.volume;

    // Handle playback errors gracefully
    audioElement.onerror = () => {
      console.warn(`Sound file not found: ${sound.url}`);
      ambientSounds.enabled = false;
    };

    audioElement.play().then(() => {
      ambientSounds.enabled = true;
      ambientSounds.currentSound = soundKey;
      saveSoundSettings();
    }).catch((e) => {
      console.warn("Failed to play sound:", e);
      ambientSounds.enabled = false;
    });
  }

  function stopSound() {
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    ambientSounds.enabled = false;
  }

  function setVolume(newVolume) {
    ambientSounds.volume = newVolume;
    if (audioElement) {
      audioElement.volume = newVolume;
    }
    saveSoundSettings();
  }

  function selectSound(soundKey) {
    if (ambientSounds.enabled) {
      playSound(soundKey);
    } else {
      ambientSounds.currentSound = soundKey;
      saveSoundSettings();
    }
  }

  function toggleSoundPanel() {
    ambientSounds.showPanel = !ambientSounds.showPanel;
  }

  // Theme controls
  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored && themes[stored]) {
        currentTheme = stored;
        applyTheme(stored);
      }
    } catch (e) {
      console.warn("Failed to load theme:", e);
    }
  }

  function saveTheme(themeName) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeName);
    } catch (e) {
      console.warn("Failed to save theme:", e);
    }
  }

  function applyTheme(themeName) {
    const theme = themes[themeName];
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

  function setTheme(themeName) {
    if (!themes[themeName]) return;
    currentTheme = themeName;
    applyTheme(themeName);
    saveTheme(themeName);
    commandPalette.open = false;
  }

  // Typewriter scrolling - keep cursor line centered
  function applyTypewriterScroll() {
    if (!textareaRef || !editorSettings.typewriterMode) return;

    const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 24;
    const viewportHeight = textareaRef.clientHeight;
    const centerOffset = viewportHeight / 2;
    const targetScroll = (cursorLine - 1) * lineHeight - centerOffset + lineHeight / 2;

    textareaRef.scrollTop = Math.max(0, targetScroll);
  }

  // Sync line numbers scroll with textarea
  function syncLineNumbersScroll() {
    if (lineNumbersRef && textareaRef) {
      lineNumbersRef.scrollTop = textareaRef.scrollTop;
    }
  }

  // Wrap selected text with markers
  function wrapSelection(before, after) {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = content.substring(start, end);

    content =
      content.substring(0, start) +
      before +
      selectedText +
      after +
      content.substring(end);

    setTimeout(() => {
      textareaRef.selectionStart = start + before.length;
      textareaRef.selectionEnd = end + before.length;
      textareaRef.focus();
    }, 0);
  }

  // Insert text at cursor
  function insertAtCursor(text) {
    if (!textareaRef) return;

    const start = textareaRef.selectionStart;
    content = content.substring(0, start) + text + content.substring(start);

    setTimeout(() => {
      textareaRef.selectionStart = textareaRef.selectionEnd =
        start + text.length;
      textareaRef.focus();
    }, 0);
  }

  // Toolbar actions
  function insertHeading(level) {
    const prefix = "#".repeat(level) + " ";
    insertAtCursor(prefix);
  }

  function insertLink() {
    wrapSelection("[", "](url)");
  }

  function insertImage() {
    insertAtCursor("![alt text](image-url)");
  }

  function insertCodeBlock() {
    const start = textareaRef.selectionStart;
    const selectedText = content.substring(
      start,
      textareaRef.selectionEnd
    );
    const codeBlock = "```\n" + (selectedText || "code here") + "\n```";
    content =
      content.substring(0, start) +
      codeBlock +
      content.substring(textareaRef.selectionEnd);
  }

  function insertList() {
    insertAtCursor("- ");
  }

  function insertQuote() {
    insertAtCursor("> ");
  }

  // Sync scroll between editor and preview (optional)
  function handleScroll() {
    // Sync line numbers
    syncLineNumbersScroll();

    // Sync preview
    if (textareaRef && previewRef && showPreview) {
      const scrollRatio =
        textareaRef.scrollTop /
        (textareaRef.scrollHeight - textareaRef.clientHeight);
      previewRef.scrollTop =
        scrollRatio * (previewRef.scrollHeight - previewRef.clientHeight);
    }
  }

  // Apply typewriter scroll when cursor moves
  $effect(() => {
    if (editorSettings.typewriterMode && cursorLine) {
      applyTypewriterScroll();
    }
  });

  // Drag and drop image upload
  function handleDragEnter(e) {
    e.preventDefault();
    if (readonly) return;

    // Check if dragging files
    if (e.dataTransfer?.types?.includes("Files")) {
      isDragging = true;
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    if (readonly) return;

    if (e.dataTransfer?.types?.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      isDragging = true;
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();
    // Only set to false if leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      isDragging = false;
    }
  }

  async function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    if (readonly) return;

    const files = Array.from(e.dataTransfer?.files || []);
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      uploadError = "No image files detected";
      setTimeout(() => (uploadError = null), 3000);
      return;
    }

    // Upload each image
    for (const file of imageFiles) {
      await uploadImage(file);
    }
  }

  async function uploadImage(file) {
    isUploading = true;
    uploadProgress = `Uploading ${file.name}...`;
    uploadError = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog");

      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      // Insert markdown image at cursor
      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const imageMarkdown = `![${altText}](${result.url})\n`;
      insertAtCursor(imageMarkdown);

      uploadProgress = "";
    } catch (err) {
      uploadError = err.message;
      setTimeout(() => (uploadError = null), 5000);
    } finally {
      isUploading = false;
      uploadProgress = "";
    }
  }

  // Handle paste for images
  function handlePaste(e) {
    if (readonly) return;

    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        // Generate a filename for pasted images
        const timestamp = Date.now();
        const extension = file.type.split("/")[1] || "png";
        const renamedFile = new File([file], `pasted-${timestamp}.${extension}`, {
          type: file.type,
        });
        uploadImage(renamedFile);
      }
    }
  }

  // Auto-save draft to localStorage
  $effect(() => {
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

    return () => {
      if (draftSaveTimer) {
        clearTimeout(draftSaveTimer);
      }
    };
  });

  function saveDraft() {
    if (!draftKey || readonly) return;

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

  export function clearDraft() {
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

  export function getDraftStatus() {
    return { hasDraft, storedDraft };
  }

  function restoreDraft() {
    if (storedDraft) {
      content = storedDraft.content;
      lastSavedContent = storedDraft.content;
      onDraftRestored(storedDraft);
    }
    draftRestorePrompt = false;
  }

  function discardDraft() {
    clearDraft();
    lastSavedContent = content;
  }

  onMount(() => {
    updateCursorPosition();
    loadSnippets();
    loadSoundSettings();
    loadTheme();

    // Check for existing draft on mount
    if (draftKey) {
      const draft = loadDraft();
      if (draft && draft.content !== content) {
        storedDraft = draft;
        draftRestorePrompt = true;
      } else {
        lastSavedContent = content;
      }
    }

    // Cleanup audio on unmount
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement = null;
      }
    };
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
  class="editor-container"
  class:dragging={isDragging}
  class:zen-mode={isZenMode}
  class:campfire-mode={campfireSession.active}
  aria-label="Markdown editor with live preview"
  ondragenter={handleDragEnter}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <!-- Drag overlay -->
  {#if isDragging}
    <div class="drag-overlay">
      <div class="drag-overlay-content">
        <span class="drag-icon">+</span>
        <span class="drag-text">Drop image to upload</span>
      </div>
    </div>
  {/if}

  <!-- Upload status -->
  {#if isUploading || uploadError}
    <div class="upload-status" class:error={uploadError}>
      {#if isUploading}
        <span class="upload-spinner"></span>
        <span>{uploadProgress}</span>
      {:else if uploadError}
        <span class="upload-error-icon">!</span>
        <span>{uploadError}</span>
      {/if}
    </div>
  {/if}

  <!-- Draft restore prompt -->
  {#if draftRestorePrompt && storedDraft}
    <div class="draft-prompt">
      <div class="draft-prompt-content">
        <span class="draft-icon">~</span>
        <div class="draft-message">
          <strong>Unsaved draft found</strong>
          <span class="draft-time">
            Saved {new Date(storedDraft.savedAt).toLocaleString()}
          </span>
        </div>
        <div class="draft-actions">
          <button type="button" class="draft-btn restore" onclick={restoreDraft}>
            [<span class="key">r</span>estore]
          </button>
          <button type="button" class="draft-btn discard" onclick={discardDraft}>
            [<span class="key">d</span>iscard]
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => insertHeading(1)}
        title="Heading 1"
        disabled={readonly}
      >[h<span class="key">1</span>]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => insertHeading(2)}
        title="Heading 2"
        disabled={readonly}
      >[h<span class="key">2</span>]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => insertHeading(3)}
        title="Heading 3"
        disabled={readonly}
      >[h<span class="key">3</span>]</button>
    </div>

    <div class="toolbar-divider">|</div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => wrapSelection("**", "**")}
        title="Bold (Cmd+B)"
        disabled={readonly}
      >[<span class="key">b</span>old]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => wrapSelection("_", "_")}
        title="Italic (Cmd+I)"
        disabled={readonly}
      >[<span class="key">i</span>talic]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={() => wrapSelection("`", "`")}
        title="Inline Code"
        disabled={readonly}
      >[<span class="key">c</span>ode]</button>
    </div>

    <div class="toolbar-divider">|</div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        onclick={insertLink}
        title="Link"
        disabled={readonly}
      >[<span class="key">l</span>ink]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={insertImage}
        title="Image"
        disabled={readonly}
      >[i<span class="key">m</span>g]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={insertCodeBlock}
        title="Code Block"
        disabled={readonly}
      >[bloc<span class="key">k</span>]</button>
    </div>

    <div class="toolbar-divider">|</div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        onclick={insertList}
        title="List"
        disabled={readonly}
      >[lis<span class="key">t</span>]</button>
      <button
        type="button"
        class="toolbar-btn"
        onclick={insertQuote}
        title="Quote"
        disabled={readonly}
      >[<span class="key">q</span>uote]</button>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn toggle-btn"
        class:active={showPreview}
        onclick={() => (showPreview = !showPreview)}
        title="Toggle Preview"
      >{#if showPreview}[hide <span class="key">p</span>review]{:else}[show <span class="key">p</span>review]{/if}</button>
      <button
        type="button"
        class="toolbar-btn full-preview-btn"
        onclick={() => (showFullPreview = true)}
        title="Open Full Preview (site styling)"
      >[<span class="key">f</span>ull]</button>
    </div>
  </div>

  <!-- Editor Area -->
  <div class="editor-area" class:split={showPreview}>
    <!-- Editor Panel -->
    <div class="editor-panel">
      <div class="editor-wrapper">
        <div class="line-numbers" aria-hidden="true" bind:this={lineNumbersRef}>
          {#each lineNumbers as num}
            <span class:current={num === cursorLine}>{num}</span>
          {/each}
        </div>
        <textarea
          bind:this={textareaRef}
          bind:value={content}
          oninput={updateCursorPosition}
          onclick={updateCursorPosition}
          onkeyup={updateCursorPosition}
          onkeydown={handleKeydown}
          onscroll={handleScroll}
          onpaste={handlePaste}
          placeholder="Start writing your post... (Drag & drop or paste images)"
          spellcheck="true"
          disabled={readonly}
          class="editor-textarea"
        ></textarea>
      </div>
    </div>

    <!-- Preview Panel -->
    {#if showPreview}
      <div class="preview-panel">
        <div class="preview-header">
          <span class="preview-label">:: preview</span>
        </div>
        <div class="preview-content" bind:this={previewRef}>
          {#if previewHtml}
            {@html previewHtml}
          {:else}
            <p class="preview-placeholder">
              Your rendered markdown will appear here...
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <div class="status-bar">
    <div class="status-left">
      <span class="status-item">
        Ln {cursorLine}, Col {cursorCol}
      </span>
      <span class="status-divider">|</span>
      <span class="status-item">{lineCount} lines</span>
      <span class="status-divider">|</span>
      <span class="status-item">{wordCount} words</span>
      <span class="status-divider">|</span>
      <span class="status-item">{readingTime()}</span>
      {#if writingGoal.enabled}
        <span class="status-divider">|</span>
        <span class="status-goal">
          Goal: {goalProgress()}%
        </span>
      {/if}
      {#if campfireSession.active}
        <span class="status-divider">|</span>
        <span class="status-campfire">
          ~ {campfireElapsed()}
        </span>
      {/if}
    </div>
    <div class="status-right">
      <button
        type="button"
        class="status-sound-btn"
        class:playing={ambientSounds.enabled}
        onclick={toggleSoundPanel}
        title="Ambient sounds"
      >
        [{soundLibrary[ambientSounds.currentSound]?.name || "snd"}]{#if ambientSounds.enabled}<span class="sound-wave">~</span>{/if}
      </button>
      <span class="status-divider">|</span>
      {#if editorSettings.typewriterMode}
        <span class="status-mode">Typewriter</span>
        <span class="status-divider">|</span>
      {/if}
      {#if saving}
        <span class="status-saving">Saving...</span>
      {:else if draftKey && content !== lastSavedContent}
        <span class="status-draft">Draft saving...</span>
      {:else}
        <span class="status-item">Markdown</span>
      {/if}
    </div>
  </div>
</div>

<!-- Slash Commands Menu -->
{#if slashMenu.open}
  <div class="slash-menu">
    <div class="slash-menu-header">:: commands</div>
    {#each filteredSlashCommands as cmd, i}
      <button
        type="button"
        class="slash-menu-item"
        class:selected={i === slashMenu.selectedIndex}
        onclick={() => executeSlashCommand(i)}
      >
        <span class="slash-cmd-label">{cmd.label}</span>
      </button>
    {/each}
    {#if filteredSlashCommands.length === 0}
      <div class="slash-menu-empty">; no commands found</div>
    {/if}
  </div>
{/if}

<!-- Command Palette -->
{#if commandPalette.open}
  <div class="command-palette-overlay" onclick={() => commandPalette.open = false}>
    <div class="command-palette" onclick={(e) => e.stopPropagation()}>
      <input
        type="text"
        class="command-palette-input"
        placeholder="> type a command..."
        bind:value={commandPalette.query}
        onkeydown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            commandPalette.selectedIndex = (commandPalette.selectedIndex + 1) % filteredPaletteCommands.length;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            commandPalette.selectedIndex = (commandPalette.selectedIndex - 1 + filteredPaletteCommands.length) % filteredPaletteCommands.length;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            executePaletteCommand(commandPalette.selectedIndex);
          }
          if (e.key === "Escape") {
            commandPalette.open = false;
          }
        }}
      />
      <div class="command-palette-list">
        {#each filteredPaletteCommands as cmd, i}
          <button
            type="button"
            class="command-palette-item"
            class:selected={i === commandPalette.selectedIndex}
            onclick={() => executePaletteCommand(i)}
          >
            <span class="palette-cmd-label">{cmd.label}</span>
            {#if cmd.shortcut}
              <span class="palette-cmd-shortcut">{cmd.shortcut}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Campfire Session Controls (when active) -->
{#if campfireSession.active}
  <div class="campfire-controls">
    <div class="campfire-ember"></div>
    <div class="campfire-stats">
      <span class="campfire-time">{campfireElapsed()}</span>
      <span class="campfire-words">+{wordCount - campfireSession.startWordCount} words</span>
    </div>
    <button type="button" class="campfire-end" onclick={endCampfireSession}>
      [<span class="key">e</span>nd]
    </button>
  </div>
{/if}

<!-- Snippets Modal -->
<Dialog bind:open={snippetsModal.open}>
  <h3 slot="title">:: {snippetsModal.editingId ? "edit snippet" : "new snippet"}</h3>

  <div class="snippets-modal-body">
    <div class="snippets-form">
      <div class="snippet-field">
        <label for="snippet-name">Name</label>
        <Input
          id="snippet-name"
          type="text"
          bind:value={snippetsModal.name}
          placeholder="e.g., Blog signature"
        />
      </div>

      <div class="snippet-field">
        <label for="snippet-trigger">Trigger (optional)</label>
        <Input
          id="snippet-trigger"
          type="text"
          bind:value={snippetsModal.trigger}
          placeholder="e.g., sig"
        />
        <span class="field-hint">Type /trigger to quickly insert</span>
      </div>

          <div class="snippet-field">
            <label for="snippet-content">Content</label>
            <textarea
              id="snippet-content"
              bind:value={snippetsModal.content}
              placeholder="Enter your markdown snippet..."
              rows="6"
            ></textarea>
          </div>

      <div class="snippet-actions">
        {#if snippetsModal.editingId}
          <Button
            variant="danger"
            onclick={() => deleteSnippet(snippetsModal.editingId)}
          >
            [<span class="key">d</span>elete]
          </Button>
        {/if}
        <div class="snippet-actions-right">
          <Button variant="outline" onclick={closeSnippetsModal}>
            [<span class="key">c</span>ancel]
          </Button>
          <Button
            onclick={saveSnippet}
            disabled={!snippetsModal.name.trim() || !snippetsModal.content.trim()}
          >
            {#if snippetsModal.editingId}[<span class="key">u</span>pdate]{:else}[<span class="key">s</span>ave]{/if}
          </Button>
        </div>
      </div>
    </div>

    {#if snippets.length > 0 && !snippetsModal.editingId}
      <div class="snippets-list-divider">
        <span>:: your snippets</span>
      </div>
      <div class="snippets-list">
        {#each snippets as snippet}
          <button
            type="button"
            class="snippet-list-item"
            onclick={() => openSnippetsModal(snippet.id)}
          >
            <span class="snippet-name">{snippet.name}</span>
            {#if snippet.trigger}
              <span class="snippet-trigger">/{snippet.trigger}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</Dialog>

<!-- Ambient Sound Panel -->
{#if ambientSounds.showPanel}
  <div class="sound-panel">
    <div class="sound-panel-header">
      <span class="sound-panel-title">:: ambient sounds</span>
      <button
        type="button"
        class="sound-panel-close"
        onclick={() => ambientSounds.showPanel = false}
      >[x]</button>
    </div>

    <div class="sound-options">
      {#each Object.entries(soundLibrary) as [key, sound]}
        <button
          type="button"
          class="sound-option"
          class:active={ambientSounds.currentSound === key}
          class:playing={ambientSounds.enabled && ambientSounds.currentSound === key}
          onclick={() => selectSound(key)}
        >
          [<span class="key">{sound.key}</span>] {sound.name}
        </button>
      {/each}
    </div>

    <div class="sound-controls">
      <label class="volume-label">
        <span>vol:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={ambientSounds.volume}
          oninput={(e) => setVolume(parseFloat(e.target.value))}
          class="volume-slider"
        />
      </label>

      <button
        type="button"
        class="sound-play-btn"
        class:playing={ambientSounds.enabled}
        onclick={toggleAmbientSound}
      >
        {#if ambientSounds.enabled}[<span class="key">s</span>top]{:else}[<span class="key">p</span>lay]{/if}
      </button>
    </div>

    <div class="sound-note">
      <span>; add audio to /static/sounds/</span>
    </div>
  </div>
{/if}

<!-- Full Preview Modal -->
{#if showFullPreview}
  <div class="full-preview-modal" role="dialog" aria-modal="true">
    <div class="full-preview-backdrop" onclick={() => (showFullPreview = false)}></div>
    <div class="full-preview-container">
      <header class="full-preview-header">
        <h2>:: full preview</h2>
        <div class="full-preview-actions">
          <button
            type="button"
            class="full-preview-close"
            onclick={() => (showFullPreview = false)}
          >
            [<span class="key">c</span>lose]
          </button>
        </div>
      </header>
      <div class="full-preview-scroll">
        <article class="full-preview-article">
          <!-- Post Header -->
          {#if previewTitle || previewDate || previewTags.length > 0}
            <header class="content-header">
              {#if previewTitle}
                <h1>{previewTitle}</h1>
              {/if}
              {#if previewDate || previewTags.length > 0}
                <div class="post-meta">
                  {#if previewDate}
                    <time datetime={previewDate}>
                      {new Date(previewDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  {/if}
                  {#if previewTags.length > 0}
                    <div class="tags">
                      {#each previewTags as tag}
                        <span class="tag">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/if}
            </header>
          {/if}

          <!-- Rendered Content -->
          <div class="content-body">
            {#if previewHtml}
              {@html previewHtml}
            {:else}
              <p class="preview-placeholder">Start writing to see your content here...</p>
            {/if}
          </div>
        </article>
      </div>
    </div>
  </div>
{/if}

<style>
  .editor-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
    background: var(--editor-bg, var(--light-bg-primary));
    border: 1px solid var(--editor-border, var(--light-border-primary));
    border-radius: 8px;
    overflow: hidden;
    font-family: "JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace;
    position: relative;
  }
  .editor-container.dragging {
    border-color: var(--editor-accent, #8bc48b);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--editor-accent, #8bc48b) 30%, transparent);
  }
  /* Drag overlay */
  .drag-overlay {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--editor-bg, var(--light-bg-primary)) 95%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    border: 3px dashed var(--editor-accent, #8bc48b);
    border-radius: 8px;
  }
  .drag-overlay-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--editor-accent, #8bc48b);
  }
  .drag-icon {
    font-size: 3rem;
    font-weight: 300;
    width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--editor-accent, #8bc48b);
    border-radius: 50%;
  }
  .drag-text {
    font-size: 1.1rem;
    font-weight: 500;
  }
  /* Upload status */
  .upload-status {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    background: rgba(45, 74, 45, 0.95);
    border: 1px solid #4a7c4a;
    border-radius: 6px;
    color: #a8dca8;
    font-size: 0.9rem;
    z-index: 99;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  .upload-status.error {
    background: rgba(80, 40, 40, 0.95);
    border-color: #a85050;
    color: #ffb0b0;
  }
  .upload-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid #4a7c4a;
    border-top-color: #a8dca8;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  .upload-error-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #a85050;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: bold;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  /* Draft prompt */
  .draft-prompt {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(45, 60, 45, 0.98);
    border-bottom: 1px solid #4a7c4a;
    z-index: 98;
    padding: 0.5rem 0.75rem;
  }
  .draft-prompt-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
  }
  .draft-icon {
    font-size: 1.25rem;
    color: #8bc48b;
    font-weight: bold;
  }
  .draft-message {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: #d4d4d4;
    flex: 1;
  }
  .draft-message strong {
    color: #a8dca8;
  }
  .draft-time {
    font-size: 0.75rem;
    color: #7a9a7a;
  }
  .draft-actions {
    display: flex;
    gap: 0.5rem;
  }
  .draft-btn {
    padding: 0.25rem 0.5rem;
    border-radius: 0;
    font-size: 0.8rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
    background: transparent;
    border: none;
  }
  .draft-btn.restore {
    color: #8bc48b;
  }
  .draft-btn.restore:hover {
    color: #c8f0c8;
  }
  .draft-btn.discard {
    color: #9d9d9d;
  }
  .draft-btn.discard:hover {
    color: #d4d4d4;
  }
  /* Terminal Key Highlight */
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }
  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.4rem 0.75rem;
    background: var(--editor-bg-tertiary, var(--light-bg-primary));
    border-bottom: 1px solid var(--editor-border, var(--light-border-primary));
    flex-wrap: wrap;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }
  .toolbar-group {
    display: flex;
    gap: 0.1rem;
  }
  .toolbar-btn {
    padding: 0.2rem 0.35rem;
    background: transparent;
    border: none;
    border-radius: 0;
    color: var(--editor-accent-dim, #7a9a7a);
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: color 0.1s ease;
    white-space: nowrap;
  }
  .toolbar-btn:hover:not(:disabled) {
    color: var(--editor-accent-bright, #a8dca8);
    background: transparent;
  }
  .toolbar-btn:hover:not(:disabled) .key {
    color: var(--editor-accent-glow, #c8f0c8);
  }
  .toolbar-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .toolbar-btn.toggle-btn {
    color: var(--editor-accent, #8bc48b);
  }
  .toolbar-btn.toggle-btn:hover {
    color: var(--editor-accent-glow, #c8f0c8);
  }
  .toolbar-btn.toggle-btn.active {
    color: var(--editor-accent-bright, #a8dca8);
    text-shadow: 0 0 8px color-mix(in srgb, var(--editor-accent, #8bc48b) 50%, transparent);
  }
  .toolbar-btn.full-preview-btn {
    color: #7ab3ff;
  }
  .toolbar-btn.full-preview-btn:hover {
    color: #9ac5ff;
  }
  .toolbar-btn.full-preview-btn .key {
    color: #9ac5ff;
  }
  .toolbar-divider {
    color: #4a4a4a;
    margin: 0 0.25rem;
    font-size: 0.8rem;
  }
  .toolbar-spacer {
    flex: 1;
  }
  /* Editor Area */
  .editor-area {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .editor-area.split .editor-panel {
    width: 50%;
    border-right: 1px solid var(--light-border-primary);
  }
  .editor-area:not(.split) .editor-panel {
    width: 100%;
  }
  .editor-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .editor-wrapper {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  /* Line Numbers */
  .line-numbers {
    display: flex;
    flex-direction: column;
    padding: 1rem 0;
    background: var(--editor-bg-tertiary, var(--light-bg-primary));
    border-right: 1px solid var(--editor-border, var(--light-bg-tertiary));
    min-width: 3rem;
    text-align: right;
    user-select: none;
    overflow: hidden;
  }
  .line-numbers span {
    padding: 0 0.75rem;
    color: var(--editor-text-dim, #5a5a5a);
    font-size: 0.85rem;
    line-height: 1.6;
    height: 1.6em;
  }
  .line-numbers span.current {
    color: var(--editor-accent, #8bc48b);
    background: color-mix(in srgb, var(--editor-accent, #8bc48b) 10%, transparent);
  }
  /* Editor Textarea */
  .editor-textarea {
    flex: 1;
    padding: 1rem;
    background: var(--editor-bg, var(--light-bg-primary));
    border: none;
    color: var(--editor-text, #d4d4d4);
    font-family: inherit;
    font-size: 0.9rem;
    line-height: 1.6;
    resize: none;
    outline: none;
    overflow-y: auto;
  }
  .editor-textarea::placeholder {
    color: var(--editor-text-dim, #5a5a5a);
    font-style: italic;
  }
  .editor-textarea:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  /* Preview Panel */
  .preview-panel {
    width: 50%;
    display: flex;
    flex-direction: column;
    background: #252526;
    min-height: 0;
  }
  .preview-header {
    padding: 0.5rem 1rem;
    background: #2d2d2d;
    border-bottom: 1px solid var(--light-border-primary);
  }
  .preview-label {
    color: #8bc48b;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }
  .preview-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    color: #d4d4d4;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
    font-size: 0.95rem;
    line-height: 1.7;
  }
  .preview-placeholder {
    color: #5a5a5a;
    font-style: italic;
  }
  /* Preview content styles */
  .preview-content :global(h1),
  .preview-content :global(h2),
  .preview-content :global(h3),
  .preview-content :global(h4),
  .preview-content :global(h5),
  .preview-content :global(h6) {
    color: #8bc48b;
    margin-top: 1.5rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
  }
  .preview-content :global(h1) {
    font-size: 1.75rem;
    border-bottom: 1px solid var(--light-border-primary);
    padding-bottom: 0.5rem;
  }
  .preview-content :global(h2) {
    font-size: 1.5rem;
  }
  .preview-content :global(h3) {
    font-size: 1.25rem;
  }
  .preview-content :global(p) {
    margin: 0.75rem 0;
  }
  .preview-content :global(a) {
    color: #6cb36c;
    text-decoration: underline;
  }
  .preview-content :global(code) {
    background: var(--light-bg-primary);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    font-family: inherit;
    font-size: 0.9em;
    color: #ce9178;
  }
  .preview-content :global(pre) {
    background: var(--light-bg-primary);
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    border: 1px solid var(--light-bg-tertiary);
  }
  .preview-content :global(pre code) {
    background: none;
    padding: 0;
    color: #d4d4d4;
  }
  .preview-content :global(blockquote) {
    border-left: 3px solid #4a7c4a;
    margin: 1rem 0;
    padding-left: 1rem;
    color: #9d9d9d;
    font-style: italic;
  }
  .preview-content :global(ul),
  .preview-content :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }
  .preview-content :global(li) {
    margin: 0.25rem 0;
  }
  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid var(--light-border-primary);
    margin: 1.5rem 0;
  }
  .preview-content :global(img) {
    max-width: 100%;
    border-radius: 4px;
  }
  /* Status Bar */
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.75rem;
    background: var(--editor-status-bg, var(--light-border-secondary));
    border-top: 1px solid var(--editor-status-border, var(--light-border-secondary));
    font-size: 0.75rem;
    color: var(--editor-accent-bright, #a8dca8);
  }
  .status-left,
  .status-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .status-item {
    opacity: 0.9;
  }
  .status-divider {
    opacity: 0.4;
  }
  .status-saving {
    color: #f0c674;
    animation: pulse 1s ease-in-out infinite;
  }
  .status-draft {
    color: #7a9a7a;
    font-style: italic;
  }
  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  /* Responsive */
  @media (max-width: 768px) {
    .editor-area.split {
      flex-direction: column;
    }
    .editor-area.split .editor-panel {
      width: 100%;
      border-right: none;
      border-bottom: 1px solid var(--light-border-primary);
      height: 50%;
    }
    .editor-area.split .preview-panel {
      width: 100%;
      height: 50%;
    }
    .toolbar {
      padding: 0.5rem;
    }
    .toolbar-btn {
      padding: 0.3rem 0.5rem;
      font-size: 0.75rem;
    }
  }
  /* Full Preview Button */
  .full-preview-btn {
    background: #2d3a4d;
    color: #7ab3ff;
    border-color: #3d4a5d;
  }
  .full-preview-btn:hover {
    background: #3d4a5d;
    color: #9ac5ff;
  }
  /* Full Preview Modal */
  .full-preview-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .full-preview-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
  }
  .full-preview-container {
    position: relative;
    width: 90%;
    max-width: 900px;
    height: 90vh;
    background: var(--color-bg, var(--light-bg-primary));
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }
  :global(.dark) .full-preview-container {
    background: var(--color-bg-dark, #0d1117);
  }
  .full-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--color-bg-secondary, var(--light-bg-tertiary));
    border-bottom: 1px solid var(--color-border, var(--light-border-primary));
    flex-shrink: 0;
  }
  :global(.dark) .full-preview-header {
    background: var(--color-bg-secondary-dark, var(--light-bg-primary));
    border-color: var(--color-border-dark, var(--light-border-secondary));
  }
  .full-preview-header h2 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    color: #8bc48b;
  }
  :global(.dark) .full-preview-header h2 {
    color: #8bc48b;
  }
  .full-preview-close {
    padding: 0.3rem 0.5rem;
    background: transparent;
    color: #7a9a7a;
    border: none;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
  }
  .full-preview-close:hover {
    color: #a8dca8;
  }
  .full-preview-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
  }
  .full-preview-article {
    max-width: 800px;
    margin: 0 auto;
  }
  /* Post meta styling in full preview */
  .full-preview-article .post-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .full-preview-article time {
    color: var(--light-text-light);
    font-size: 1rem;
    transition: color 0.3s ease;
  }
  :global(.dark) .full-preview-article time {
    color: var(--color-text-subtle-dark, #666);
  }
  .full-preview-article .tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .full-preview-article .tag {
    padding: 0.25rem 0.75rem;
    background: var(--tag-bg, #2c5f2d);
    color: white;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 500;
  }
  /* Line numbers scroll sync */
  .line-numbers {
    overflow: hidden;
  }
  /* Status bar enhancements */
  .status-goal {
    color: var(--editor-accent, #8bc48b);
    font-weight: 500;
  }
  .status-campfire {
    color: #f0a060;
  }
  .status-mode {
    color: #7ab3ff;
    font-size: 0.75rem;
  }
  /* Zen Mode Styles */
  .editor-container.zen-mode {
    position: fixed;
    inset: 0;
    z-index: 9999;
    border-radius: 0;
    border: none;
  }
  .editor-container.zen-mode .toolbar {
    opacity: 0.3;
    transition: opacity 0.3s ease;
  }
  .editor-container.zen-mode .toolbar:hover {
    opacity: 1;
  }
  .editor-container.zen-mode .status-bar {
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }
  .editor-container.zen-mode .status-bar:hover {
    opacity: 1;
  }
  .editor-container.zen-mode .editor-area {
    height: calc(100vh - 80px);
  }
  /* Campfire Mode Styles */
  .editor-container.campfire-mode {
    border-color: #8b5a2b;
    box-shadow: 0 0 30px rgba(240, 160, 96, 0.15);
  }
  .campfire-controls {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1.25rem;
    background: rgba(40, 30, 20, 0.95);
    border: 1px solid #8b5a2b;
    border-radius: 8px;
    color: #f0d0a0;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  }
  .campfire-ember {
    width: 12px;
    height: 12px;
    background: linear-gradient(135deg, #ff6b35, #f0a060);
    border-radius: 50%;
    animation: ember-glow 2s ease-in-out infinite;
  }
  @keyframes ember-glow {
    0%, 100% {
      box-shadow: 0 0 8px #ff6b35, 0 0 16px rgba(240, 107, 53, 0.5);
    }
    50% {
      box-shadow: 0 0 12px #f0a060, 0 0 24px rgba(240, 160, 96, 0.6);
    }
  }
  .campfire-stats {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .campfire-time {
    font-size: 1.1rem;
    font-weight: 600;
    font-family: "JetBrains Mono", monospace;
  }
  .campfire-words {
    font-size: 0.75rem;
    color: #c0a080;
  }
  .campfire-end {
    padding: 0.3rem 0.5rem;
    background: transparent;
    border: none;
    color: #c0a080;
    font-size: 0.8rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
  }
  .campfire-end:hover {
    color: #f0d0a0;
  }
  /* Slash Commands Menu */
  .slash-menu {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: 220px;
    max-height: 300px;
    overflow-y: auto;
    background: #252526;
    border: 1px solid var(--light-border-primary);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 1001;
  }
  .slash-menu-header {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    color: #8bc48b;
    border-bottom: 1px solid var(--light-border-primary);
  }
  .slash-menu-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }
  .slash-menu-item:hover,
  .slash-menu-item.selected {
    background: var(--light-border-primary);
  }
  .slash-menu-item.selected {
    color: #8bc48b;
  }
  .slash-menu-empty {
    padding: 0.75rem;
    color: #7a9a7a;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.8rem;
    text-align: center;
  }
  /* Command Palette */
  .command-palette-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    z-index: 1002;
  }
  .command-palette {
    width: 100%;
    max-width: 500px;
    background: var(--light-bg-primary);
    border: 1px solid var(--light-border-primary);
    border-radius: 8px;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .command-palette-input {
    width: 100%;
    padding: 1rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--light-border-primary);
    color: #d4d4d4;
    font-size: 1rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    outline: none;
  }
  .command-palette-input::placeholder {
    color: #7a9a7a;
  }
  .command-palette-list {
    max-height: 300px;
    overflow-y: auto;
  }
  .command-palette-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: #d4d4d4;
    font-size: 0.9rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }
  .command-palette-item:hover,
  .command-palette-item.selected {
    background: var(--light-bg-tertiary);
  }
  .command-palette-item.selected {
    color: #8bc48b;
  }
  .palette-cmd-shortcut {
    font-size: 0.75rem;
    color: #6a6a6a;
    font-family: "JetBrains Mono", monospace;
  }
  /* Mode Transitions */
  .editor-container {
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .toolbar,
  .status-bar {
    transition: opacity 0.3s ease;
  }
  .campfire-controls {
    animation: fade-in 0.3s ease;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .slash-menu,
  .command-palette {
    animation: scale-in 0.15s ease;
  }
  @keyframes scale-in {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
  .command-palette {
    animation: slide-down 0.2s ease;
  }
  @keyframes slide-down {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Snippets Modal */
  .snippets-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1003;
    animation: fade-in 0.2s ease;
  }
  .snippets-modal {
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    background: var(--light-bg-primary);
    border: 1px solid var(--light-border-primary);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
    animation: scale-in 0.2s ease;
  }
  .snippets-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    background: #252526;
    border-bottom: 1px solid var(--light-border-primary);
  }
  .snippets-modal-header h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 500;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    color: #8bc48b;
  }
  .snippets-modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #7a9a7a;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
  }
  .snippets-modal-close:hover {
    color: #a8dca8;
  }
  .snippets-modal-body {
    padding: 1.25rem;
    overflow-y: auto;
  }
  .snippets-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .snippet-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .snippet-field label {
    font-size: 0.85rem;
    font-weight: 500;
    color: #a8dca8;
  }
  .snippet-field input,
  .snippet-field textarea {
    padding: 0.6rem 0.75rem;
    background: #252526;
    border: 1px solid var(--light-border-primary);
    border-radius: 6px;
    color: #d4d4d4;
    font-family: inherit;
    font-size: 0.9rem;
    transition: border-color 0.2s ease;
  }
  .snippet-field input:focus,
  .snippet-field textarea:focus {
    outline: none;
    border-color: #4a7c4a;
  }
  .snippet-field textarea {
    resize: vertical;
    min-height: 100px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    line-height: 1.5;
  }
  .field-hint {
    font-size: 0.75rem;
    color: #6a6a6a;
    font-style: italic;
  }
  .snippet-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--light-bg-tertiary);
  }
  .snippet-actions-right {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }
  .snippet-btn {
    padding: 0.3rem 0.5rem;
    border-radius: 0;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
    background: transparent;
    border: none;
  }
  .snippet-btn.save {
    color: #8bc48b;
  }
  .snippet-btn.save:hover:not(:disabled) {
    color: #c8f0c8;
  }
  .snippet-btn.save:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .snippet-btn.cancel {
    color: #9d9d9d;
  }
  .snippet-btn.cancel:hover {
    color: #d4d4d4;
  }
  .snippet-btn.delete {
    color: #e08080;
  }
  .snippet-btn.delete:hover {
    color: #ff9090;
  }
  .snippets-list-divider {
    display: flex;
    align-items: center;
    margin: 1.25rem 0 0.75rem;
    color: #8bc48b;
    font-size: 0.8rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }
  .snippets-list-divider::before,
  .snippets-list-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--light-border-primary);
  }
  .snippets-list-divider span {
    padding: 0 0.75rem;
  }
  .snippets-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .snippet-list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: #252526;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #d4d4d4;
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .snippet-list-item:hover {
    background: var(--light-bg-tertiary);
    border-color: var(--light-border-primary);
  }
  .snippet-name {
    font-weight: 500;
  }
  .snippet-trigger {
    font-size: 0.75rem;
    color: #7ab3ff;
    font-family: "JetBrains Mono", monospace;
    background: #1a2a3a;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
  }
  /* Status Bar Sound Button */
  .status-sound-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.15rem 0.4rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #7a9a7a;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }
  .status-sound-btn:hover {
    background: rgba(139, 196, 139, 0.1);
    color: #a8dca8;
  }
  .status-sound-btn.playing {
    color: #8bc48b;
  }
  .sound-wave {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #8bc48b;
    animation: sound-pulse 1.5s ease-in-out infinite;
  }
  @keyframes sound-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(0.8);
    }
    50% {
      opacity: 1;
      transform: scale(1);
    }
  }
  /* Sound Panel */
  .sound-panel {
    position: fixed;
    bottom: 3.5rem;
    right: 1rem;
    width: 280px;
    background: var(--light-bg-primary);
    border: 1px solid var(--light-border-primary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 1001;
    animation: slide-up 0.2s ease;
  }
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .sound-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--light-border-primary);
  }
  .sound-panel-title {
    font-size: 0.85rem;
    font-weight: 500;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    color: #8bc48b;
  }
  .sound-panel-close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #7a9a7a;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
  }
  .sound-panel-close:hover {
    color: #a8dca8;
  }
  .sound-options {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    padding: 1rem;
  }
  .sound-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.25rem;
    background: #252526;
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sound-option:hover {
    background: var(--light-bg-tertiary);
    border-color: var(--light-border-primary);
  }
  .sound-option.active {
    background: var(--light-border-secondary);
    border-color: #4a7c4a;
  }
  .sound-option.playing {
    border-color: #8bc48b;
    box-shadow: 0 0 8px rgba(139, 196, 139, 0.3);
  }
  .sound-icon {
    font-size: 1.25rem;
  }
  .sound-name {
    font-size: 0.65rem;
    color: #9d9d9d;
    text-align: center;
  }
  .sound-option.active .sound-name {
    color: #a8dca8;
  }
  .sound-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 1rem 1rem;
  }
  .volume-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .volume-label span {
    font-size: 0.75rem;
    color: #7a9a7a;
  }
  .volume-slider {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: var(--light-border-primary);
    border-radius: 2px;
    cursor: pointer;
  }
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #8bc48b;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.15s ease;
  }
  .volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  .volume-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #8bc48b;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
  .sound-play-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.3rem 0.5rem;
    background: transparent;
    border: none;
    color: #7a9a7a;
    font-size: 0.8rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    cursor: pointer;
    transition: color 0.1s ease;
  }
  .sound-play-btn:hover {
    color: #a8dca8;
  }
  .sound-play-btn.playing {
    color: #8bc48b;
  }
  .sound-play-btn.playing:hover {
    color: #c8f0c8;
  }
  .sound-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #252526;
    border-top: 1px solid var(--light-border-primary);
    border-radius: 0 0 12px 12px;
    font-size: 0.7rem;
    color: #6a6a6a;
  }
  .sound-note-icon {
    font-size: 0.85rem;
  }
  .sound-note code {
    background: var(--light-bg-primary);
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.65rem;
  }
</style>
