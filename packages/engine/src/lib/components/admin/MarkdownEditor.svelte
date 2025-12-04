<script>
  /**
   * MarkdownEditor - A feature-rich markdown editor with live preview
   *
   * Sub-components are located in ./editor/ folder for maintainability.
   * Import individual components if you need custom implementations.
   */
  import { marked } from "marked";
  import { onMount, tick } from "svelte";
  import { sanitizeMarkdown } from "$lib/utils/sanitize.js";
  import "$lib/styles/content.css";

  // Sub-components
  import {
    themes,
    soundLibrary,
    applyTheme,
    loadTheme as loadThemeFromStorage,
    saveTheme,
    THEME_STORAGE_KEY,
    SOUNDS_STORAGE_KEY,
    SNIPPETS_STORAGE_KEY,
  } from "./editor/EditorThemes.js";
  import EditorToolbar from "./editor/EditorToolbar.svelte";
  import EditorStatusBar from "./editor/EditorStatusBar.svelte";
  import SlashCommandMenu from "./editor/SlashCommandMenu.svelte";
  import CommandPalette from "./editor/CommandPalette.svelte";
  import AmbientSoundsPanel from "./editor/AmbientSoundsPanel.svelte";
  import SnippetsModal from "./editor/SnippetsModal.svelte";
  import FullPreviewModal from "./editor/FullPreviewModal.svelte";
  import CampfireControls from "./editor/CampfireControls.svelte";

  // Props
  let {
    content = $bindable(""),
    onSave = () => {},
    saving = false,
    readonly = false,
    draftKey = null,
    onDraftRestored = () => {},
    previewTitle = "",
    previewDate = "",
    previewTags = [],
  } = $props();

  // Refs
  let textareaRef = $state(null);
  let previewRef = $state(null);
  let lineNumbersRef = $state(null);

  // Editor state
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
  const AUTO_SAVE_DELAY = 2000;

  // Modal states
  let showFullPreview = $state(false);
  let snippetsModalOpen = $state(false);
  let commandPaletteOpen = $state(false);

  // Editor settings
  let editorSettings = $state({
    typewriterMode: false,
    zenMode: false,
    showLineNumbers: true,
    wordWrap: true,
  });

  // Zen mode
  let isZenMode = $state(false);

  // Campfire session
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

  // Slash commands
  let slashMenu = $state({
    open: false,
    query: "",
    selectedIndex: 0,
  });

  // Snippets
  let snippets = $state([]);

  // Ambient sounds
  let ambientSounds = $state({
    enabled: false,
    currentSound: "forest",
    volume: 0.3,
    showPanel: false,
  });
  let audioElement = $state(null);

  // Theme
  let currentTheme = $state("grove");

  // Computed values
  let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
  let charCount = $derived(content.length);
  let lineCount = $derived(content.split("\n").length);
  let previewHtml = $derived(content ? sanitizeMarkdown(marked.parse(content)) : "");

  let readingTime = $derived(() => {
    const minutes = Math.ceil(wordCount / 200);
    return minutes < 1 ? "< 1 min" : `~${minutes} min read`;
  });

  let goalProgress = $derived(() => {
    if (!writingGoal.enabled) return 0;
    const wordsWritten = wordCount - writingGoal.sessionWords;
    return Math.min(100, Math.round((wordsWritten / writingGoal.targetWords) * 100));
  });

  let campfireElapsed = $derived(() => {
    if (!campfireSession.active || !campfireSession.startTime) return "0:00";
    const elapsed = Math.floor((Date.now() - campfireSession.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  // Anchors for linking
  let availableAnchors = $derived.by(() => {
    const anchors = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      anchors.push(match[0].trim());
    }
    const anchorRegex = /<!--\s*anchor:([\w-]+)\s*-->/g;
    while ((match = anchorRegex.exec(content)) !== null) {
      anchors.push(`anchor:${match[1]}`);
    }
    return anchors;
  });

  export function getAvailableAnchors() {
    return availableAnchors;
  }

  export function insertAnchor(name) {
    insertAtCursor(`<!-- anchor:${name} -->\n`);
  }

  // Update line numbers
  $effect(() => {
    const lines = content.split("\n").length;
    lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);
  });

  // Cursor tracking
  function updateCursorPosition() {
    if (!textareaRef) return;
    const pos = textareaRef.selectionStart;
    const textBefore = content.substring(0, pos);
    const lines = textBefore.split("\n");
    cursorLine = lines.length;
    cursorCol = lines[lines.length - 1].length + 1;
  }

  // Keyboard handling
  function handleKeydown(e) {
    if (e.key === "Escape") {
      if (slashMenu.open) { slashMenu.open = false; return; }
      if (commandPaletteOpen) { commandPaletteOpen = false; return; }
      if (isZenMode) { isZenMode = false; return; }
    }

    // Slash commands
    if (e.key === "/" && !slashMenu.open) {
      const pos = textareaRef.selectionStart;
      const textBefore = content.substring(0, pos);
      if (pos === 0 || /\s$/.test(textBefore)) {
        setTimeout(() => openSlashMenu(), 0);
      }
    }

    if (slashMenu.open && (e.key === " " || e.key === "Enter")) {
      if (e.key === "Enter") {
        e.preventDefault();
        executeSlashCommand(slashMenu.selectedIndex);
      }
      slashMenu.open = false;
    }

    if (slashMenu.open) {
      const cmdCount = filteredSlashCommands.length;
      if (e.key === "ArrowDown") { e.preventDefault(); slashMenu.selectedIndex = (slashMenu.selectedIndex + 1) % cmdCount; }
      if (e.key === "ArrowUp") { e.preventDefault(); slashMenu.selectedIndex = (slashMenu.selectedIndex - 1 + cmdCount) % cmdCount; }
    }

    // Command palette: Cmd+K
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commandPaletteOpen = !commandPaletteOpen;
    }

    // Zen mode: Cmd+Shift+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      toggleZenMode();
    }

    // Tab for indent
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      content = content.substring(0, start) + "  " + content.substring(end);
      setTimeout(() => { textareaRef.selectionStart = textareaRef.selectionEnd = start + 2; }, 0);
    }

    // Cmd+S to save
    if (e.key === "s" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSave(); }
    // Cmd+B for bold
    if (e.key === "b" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); wrapSelection("**", "**"); }
    // Cmd+I for italic
    if (e.key === "i" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); wrapSelection("_", "_"); }
  }

  function handleGlobalKeydown(e) {
    if (e.key === "Escape") {
      if (ambientSounds.showPanel) { ambientSounds.showPanel = false; e.preventDefault(); return; }
      if (snippetsModalOpen) { snippetsModalOpen = false; e.preventDefault(); return; }
      if (showFullPreview) { showFullPreview = false; e.preventDefault(); }
    }
  }

  // Slash commands
  const baseSlashCommands = [
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
    { id: "newSnippet", label: "Create New Snippet...", insert: "", isAction: true, action: () => { snippetsModalOpen = true; } },
  ];

  let allSlashCommands = $derived(() => {
    const snippetCommands = snippets.map(s => ({
      id: s.id,
      label: `> ${s.name}`,
      insert: s.content,
      isSnippet: true,
    }));
    return [...baseSlashCommands, ...snippetCommands];
  });

  let filteredSlashCommands = $derived(
    allSlashCommands().filter(cmd => cmd.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
  );

  function openSlashMenu() {
    slashMenu.open = true;
    slashMenu.query = "";
    slashMenu.selectedIndex = 0;
  }

  function executeSlashCommand(index) {
    const cmd = filteredSlashCommands[index];
    if (!cmd) return;

    if (cmd.isAction && cmd.action) {
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

  // Command palette
  let paletteCommands = $derived(() => {
    const base = [
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
      { id: "snippets", label: "Manage Snippets", shortcut: "", action: () => { snippetsModalOpen = true; } },
      { id: "sounds", label: "Toggle Ambient Sounds", shortcut: "", action: () => toggleAmbientSound() },
      { id: "soundPanel", label: "Sound Settings", shortcut: "", action: () => { ambientSounds.showPanel = !ambientSounds.showPanel; } },
    ];
    const themeCommands = Object.entries(themes).map(([key, theme]) => ({
      id: `theme-${key}`,
      label: `Theme: ${theme.label} (${theme.desc})`,
      shortcut: currentTheme === key ? "●" : "",
      action: () => setTheme(key),
    }));
    return [...base, ...themeCommands];
  });

  function handlePaletteExecute(cmd) {
    if (cmd?.action) cmd.action();
  }

  // Zen mode
  function toggleZenMode() {
    isZenMode = !isZenMode;
    if (isZenMode) editorSettings.typewriterMode = true;
  }

  // Campfire session
  function startCampfireSession() {
    campfireSession.active = true;
    campfireSession.startTime = Date.now();
    campfireSession.startWordCount = wordCount;
  }

  function endCampfireSession() {
    campfireSession.active = false;
    campfireSession.startTime = null;
  }

  // Writing goal
  function promptWritingGoal() {
    const target = prompt("Set your word goal for this session:", "500");
    if (target && !isNaN(parseInt(target))) {
      writingGoal.enabled = true;
      writingGoal.targetWords = parseInt(target);
      writingGoal.sessionWords = wordCount;
    }
  }

  // Snippet management
  function loadSnippets() {
    try {
      const stored = localStorage.getItem(SNIPPETS_STORAGE_KEY);
      if (stored) snippets = JSON.parse(stored);
    } catch (e) { console.warn("Failed to load snippets:", e); }
  }

  function saveSnippetsToStorage() {
    try { localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets)); }
    catch (e) { console.warn("Failed to save snippets:", e); }
  }

  function handleSaveSnippet(snippet) {
    if (snippet.id) {
      snippets = snippets.map(s => s.id === snippet.id ? { ...s, ...snippet } : s);
    } else {
      snippets = [...snippets, { ...snippet, id: `snippet-${Date.now()}`, createdAt: new Date().toISOString() }];
    }
    saveSnippetsToStorage();
  }

  function handleDeleteSnippet(id) {
    snippets = snippets.filter(s => s.id !== id);
    saveSnippetsToStorage();
  }

  // Sound management
  function loadSoundSettings() {
    try {
      const stored = localStorage.getItem(SOUNDS_STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        ambientSounds.currentSound = settings.currentSound || "forest";
        ambientSounds.volume = settings.volume ?? 0.3;
      }
    } catch (e) { console.warn("Failed to load sound settings:", e); }
  }

  function saveSoundSettings() {
    try {
      localStorage.setItem(SOUNDS_STORAGE_KEY, JSON.stringify({
        currentSound: ambientSounds.currentSound,
        volume: ambientSounds.volume,
      }));
    } catch (e) { console.warn("Failed to save sound settings:", e); }
  }

  function toggleAmbientSound() {
    if (ambientSounds.enabled) stopSound();
    else playSound(ambientSounds.currentSound);
  }

  function playSound(soundKey) {
    const sound = soundLibrary[soundKey];
    if (!sound) return;

    if (audioElement) { audioElement.pause(); audioElement = null; }

    audioElement = new Audio(sound.url);
    audioElement.loop = true;
    audioElement.volume = ambientSounds.volume;
    audioElement.onerror = () => { console.warn(`Sound file not found: ${sound.url}`); ambientSounds.enabled = false; };

    audioElement.play().then(() => {
      ambientSounds.enabled = true;
      ambientSounds.currentSound = soundKey;
      saveSoundSettings();
    }).catch((e) => { console.warn("Failed to play sound:", e); ambientSounds.enabled = false; });
  }

  function stopSound() {
    if (audioElement) { audioElement.pause(); audioElement = null; }
    ambientSounds.enabled = false;
  }

  function setVolume(newVolume) {
    ambientSounds.volume = newVolume;
    if (audioElement) audioElement.volume = newVolume;
    saveSoundSettings();
  }

  // Theme management
  function loadTheme() {
    currentTheme = loadThemeFromStorage();
    applyTheme(currentTheme);
  }

  function setTheme(themeName) {
    if (!themes[themeName]) return;
    currentTheme = themeName;
    applyTheme(themeName);
    saveTheme(themeName);
  }

  // Text manipulation
  function wrapSelection(before, after) {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = content.substring(start, end);
    content = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setTimeout(() => {
      textareaRef.selectionStart = start + before.length;
      textareaRef.selectionEnd = end + before.length;
      textareaRef.focus();
    }, 0);
  }

  function insertAtCursor(text) {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    content = content.substring(0, start) + text + content.substring(start);
    setTimeout(() => {
      textareaRef.selectionStart = textareaRef.selectionEnd = start + text.length;
      textareaRef.focus();
    }, 0);
  }

  function insertHeading(level) { insertAtCursor("#".repeat(level) + " "); }
  function insertLink() { wrapSelection("[", "](url)"); }
  function insertImage() { insertAtCursor("![alt text](image-url)"); }
  function insertCodeBlock() {
    const start = textareaRef.selectionStart;
    const selectedText = content.substring(start, textareaRef.selectionEnd);
    const codeBlock = "```\n" + (selectedText || "code here") + "\n```";
    content = content.substring(0, start) + codeBlock + content.substring(textareaRef.selectionEnd);
  }
  function insertList() { insertAtCursor("- "); }
  function insertQuote() { insertAtCursor("> "); }

  // Scroll sync
  function syncLineNumbersScroll() {
    if (lineNumbersRef && textareaRef) lineNumbersRef.scrollTop = textareaRef.scrollTop;
  }

  function handleScroll() {
    syncLineNumbersScroll();
    if (textareaRef && previewRef && showPreview) {
      const scrollRatio = textareaRef.scrollTop / (textareaRef.scrollHeight - textareaRef.clientHeight);
      previewRef.scrollTop = scrollRatio * (previewRef.scrollHeight - previewRef.clientHeight);
    }
  }

  // Typewriter scrolling
  function applyTypewriterScroll() {
    if (!textareaRef || !editorSettings.typewriterMode) return;
    const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 24;
    const viewportHeight = textareaRef.clientHeight;
    const centerOffset = viewportHeight / 2;
    const targetScroll = (cursorLine - 1) * lineHeight - centerOffset + lineHeight / 2;
    textareaRef.scrollTop = Math.max(0, targetScroll);
  }

  $effect(() => {
    if (editorSettings.typewriterMode && cursorLine) applyTypewriterScroll();
  });

  // Image upload
  function handleDragEnter(e) {
    e.preventDefault();
    if (readonly) return;
    if (e.dataTransfer?.types?.includes("Files")) isDragging = true;
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
    if (!e.currentTarget.contains(e.relatedTarget)) isDragging = false;
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

    for (const file of imageFiles) await uploadImage(file);
  }

  async function uploadImage(file) {
    isUploading = true;
    uploadProgress = `Uploading ${file.name}...`;
    uploadError = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog");

      const response = await fetch("/api/images/upload", { method: "POST", body: formData });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "Upload failed");

      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      insertAtCursor(`![${altText}](${result.url})\n`);
      uploadProgress = "";
    } catch (err) {
      uploadError = err.message;
      setTimeout(() => (uploadError = null), 5000);
    } finally {
      isUploading = false;
      uploadProgress = "";
    }
  }

  function handlePaste(e) {
    if (readonly) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        const timestamp = Date.now();
        const extension = file.type.split("/")[1] || "png";
        const renamedFile = new File([file], `pasted-${timestamp}.${extension}`, { type: file.type });
        uploadImage(renamedFile);
      }
    }
  }

  // Draft management
  $effect(() => {
    if (!draftKey || readonly) return;
    if (draftSaveTimer) clearTimeout(draftSaveTimer);
    if (content === lastSavedContent) return;

    draftSaveTimer = setTimeout(() => saveDraft(), AUTO_SAVE_DELAY);
    return () => { if (draftSaveTimer) clearTimeout(draftSaveTimer); };
  });

  function saveDraft() {
    if (!draftKey || readonly) return;
    try {
      localStorage.setItem(`draft:${draftKey}`, JSON.stringify({ content, savedAt: new Date().toISOString() }));
      lastSavedContent = content;
      hasDraft = true;
    } catch (e) { console.warn("Failed to save draft:", e); }
  }

  function loadDraft() {
    if (!draftKey) return null;
    try {
      const stored = localStorage.getItem(`draft:${draftKey}`);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.warn("Failed to load draft:", e); }
    return null;
  }

  export function clearDraft() {
    if (!draftKey) return;
    try {
      localStorage.removeItem(`draft:${draftKey}`);
      hasDraft = false;
      storedDraft = null;
      draftRestorePrompt = false;
    } catch (e) { console.warn("Failed to clear draft:", e); }
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

    if (draftKey) {
      const draft = loadDraft();
      if (draft && draft.content !== content) {
        storedDraft = draft;
        draftRestorePrompt = true;
      } else {
        lastSavedContent = content;
      }
    }

    return () => {
      if (audioElement) { audioElement.pause(); audioElement = null; }
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
          <span class="draft-time">Saved {new Date(storedDraft.savedAt).toLocaleString()}</span>
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
  <EditorToolbar
    {readonly}
    bind:showPreview
    onInsertHeading={insertHeading}
    onWrapSelection={wrapSelection}
    onInsertLink={insertLink}
    onInsertImage={insertImage}
    onInsertCodeBlock={insertCodeBlock}
    onInsertList={insertList}
    onInsertQuote={insertQuote}
    onOpenFullPreview={() => showFullPreview = true}
  />

  <!-- Editor Area -->
  <div class="editor-area" class:split={showPreview}>
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

    {#if showPreview}
      <div class="preview-panel">
        <div class="preview-header">
          <span class="preview-label">:: preview</span>
        </div>
        <div class="preview-content" bind:this={previewRef}>
          {#if previewHtml}
            {@html previewHtml}
          {:else}
            <p class="preview-placeholder">Your rendered markdown will appear here...</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Status Bar -->
  <EditorStatusBar
    {cursorLine}
    {cursorCol}
    {lineCount}
    {wordCount}
    readingTime={readingTime()}
    {saving}
    hasDraft={draftKey && content !== lastSavedContent}
    typewriterMode={editorSettings.typewriterMode}
    writingGoalEnabled={writingGoal.enabled}
    goalProgress={goalProgress()}
    campfireActive={campfireSession.active}
    campfireElapsed={campfireElapsed()}
    soundsEnabled={ambientSounds.enabled}
    currentSound={ambientSounds.currentSound}
    onToggleSoundPanel={() => ambientSounds.showPanel = !ambientSounds.showPanel}
  />
</div>

<!-- Slash Commands Menu -->
<SlashCommandMenu
  bind:open={slashMenu.open}
  commands={filteredSlashCommands}
  bind:selectedIndex={slashMenu.selectedIndex}
  onExecute={executeSlashCommand}
/>

<!-- Command Palette -->
<CommandPalette
  bind:open={commandPaletteOpen}
  commands={paletteCommands()}
  onExecute={handlePaletteExecute}
/>

<!-- Campfire Controls -->
<CampfireControls
  active={campfireSession.active}
  elapsed={campfireElapsed()}
  wordsWritten={wordCount - campfireSession.startWordCount}
  onEnd={endCampfireSession}
/>

<!-- Snippets Modal -->
<SnippetsModal
  bind:open={snippetsModalOpen}
  {snippets}
  onSave={handleSaveSnippet}
  onDelete={handleDeleteSnippet}
/>

<!-- Ambient Sounds Panel -->
<AmbientSoundsPanel
  bind:open={ambientSounds.showPanel}
  bind:enabled={ambientSounds.enabled}
  bind:currentSound={ambientSounds.currentSound}
  bind:volume={ambientSounds.volume}
  onPlaySound={playSound}
  onStopSound={stopSound}
  onSetVolume={setVolume}
/>

<!-- Full Preview Modal -->
<FullPreviewModal
  bind:open={showFullPreview}
  {previewHtml}
  title={previewTitle}
  date={previewDate}
  tags={previewTags}
/>

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

  .editor-container.zen-mode {
    position: fixed;
    inset: 0;
    z-index: 9999;
    border-radius: 0;
    border: none;
  }

  .editor-container.zen-mode :global(.toolbar) {
    opacity: 0.3;
    transition: opacity 0.3s ease;
  }

  .editor-container.zen-mode :global(.toolbar):hover {
    opacity: 1;
  }

  .editor-container.campfire-mode {
    border-color: #8b5a2b;
    box-shadow: 0 0 30px rgba(240, 160, 96, 0.15);
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
    to { transform: rotate(360deg); }
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
    font-family: inherit;
    cursor: pointer;
    transition: color 0.1s ease;
    background: transparent;
    border: none;
  }

  .draft-btn.restore { color: #8bc48b; }
  .draft-btn.restore:hover { color: #c8f0c8; }
  .draft-btn.discard { color: #9d9d9d; }
  .draft-btn.discard:hover { color: #d4d4d4; }

  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
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
  }

  .preview-content {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    color: #d4d4d4;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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

  .preview-content :global(h2) { font-size: 1.5rem; }
  .preview-content :global(h3) { font-size: 1.25rem; }
  .preview-content :global(p) { margin: 0.75rem 0; }
  .preview-content :global(a) { color: #6cb36c; text-decoration: underline; }

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

  .preview-content :global(li) { margin: 0.25rem 0; }

  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid var(--light-border-primary);
    margin: 1.5rem 0;
  }

  .preview-content :global(img) {
    max-width: 100%;
    border-radius: 4px;
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
  }
</style>
