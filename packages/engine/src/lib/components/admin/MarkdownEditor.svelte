<script>
  import { marked } from "marked";
  import { onMount, tick } from "svelte";
  import { sanitizeMarkdown } from "$lib/utils/sanitize";
  import "$lib/styles/content.css";
  import { Button, Input, Logo } from '$lib/ui';
  import Dialog from "$lib/ui/components/ui/Dialog.svelte";
  import FloatingToolbar from "./FloatingToolbar.svelte";

  // Import composables (simplified - removed command palette and slash commands)
  import {
    useAmbientSounds,
    soundLibrary,
    useEditorTheme,
    themes,
    useSnippets,
    useDraftManager,
    useWritingSession,
  } from "./composables/index.js";

  /**
   * @typedef {Object} StoredDraft
   * @property {string} content
   * @property {number} savedAt
   * @property {number} [wordCount]
   */

  // Props
  let {
    content = $bindable(""),
    onSave = () => {},
    saving = false,
    readonly = false,
    draftKey = /** @type {string | null} */ (null),
    onDraftRestored = /** @type {(draft: StoredDraft) => void} */ (() => {}),
    previewTitle = "",
    previewDate = "",
    previewTags = /** @type {string[]} */ ([]),
  } = $props();

  // Core refs and state
  /** @type {HTMLTextAreaElement | null} */
  let textareaRef = $state(null);
  /** @type {HTMLElement | null} */
  let previewRef = $state(null);
  /** @type {HTMLElement | null} */
  let lineNumbersRef = $state(null);
  let showPreview = $state(false);  // Default to false for Medium-style focused writing
  let cursorLine = $state(1);
  let cursorCol = $state(1);
  let isUpdating = $state(false);
  let isProgrammaticUpdate = $state(false);  // Flag to skip oninput during toolbar operations

  // Image upload state
  let isDragging = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state("");
  /** @type {string | null} */
  let uploadError = $state(null);

  // Full preview mode
  let showFullPreview = $state(false);

  // Editor settings
  let editorSettings = $state({
    typewriterMode: false,
    zenMode: false,
    showLineNumbers: true,
    wordWrap: true,
  });

  // Zen mode
  let isZenMode = $state(false);

  // Initialize composables
  const ambientSounds = useAmbientSounds();
  const editorTheme = useEditorTheme();
  const snippetsManager = useSnippets();

  const writingSession = useWritingSession({
    getWordCount: () => wordCount,
  });

  // svelte-ignore state_referenced_locally - draftKey, readonly, onDraftRestored don't change during lifecycle
  const draftManager = useDraftManager({
    draftKey,
    getContent: () => content,
    setContent: (/** @type {string} */ c) => (content = c),
    onDraftRestored,
    readonly,
  });

  // Note: Slash commands and command palette removed for simplified Medium-style UX

  // Computed values
  let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
  let charCount = $derived(content.length);
  let lineCount = $derived(content.split("\n").length);
  let previewHtml = $derived(content ? sanitizeMarkdown(/** @type {string} */ (marked.parse(content, { async: false }))) : "");

  let readingTime = $derived.by(() => {
    const minutes = Math.ceil(wordCount / 200);
    return minutes < 1 ? "< 1 min" : `~${minutes} min read`;
  });

  let goalProgress = $derived.by(() => writingSession.getGoalProgress(wordCount));

  let campfireElapsed = $derived.by(() => writingSession.getCampfireElapsed());

  let lineNumbers = $derived.by(() => {
    const count = content.split("\n").length;
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  // Extract available anchors from content
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


  // Public exports
  export function getAvailableAnchors() {
    return availableAnchors;
  }

  /** @param {string} name */
  export function insertAnchor(name) {
    insertAtCursor(`<!-- anchor:${name} -->\n`);
  }

  export function clearDraft() {
    draftManager.clearDraft();
  }

  export function getDraftStatus() {
    return draftManager.getStatus();
  }

  // Cursor position tracking
  function updateCursorPosition() {
    if (!textareaRef || isProgrammaticUpdate) return;  // Skip during programmatic updates
    const pos = textareaRef.selectionStart;
    const textBefore = content.substring(0, pos);
    const lines = textBefore.split("\n");
    cursorLine = lines.length;
    cursorCol = lines[lines.length - 1].length + 1;
  }

  // Keyboard handlers (simplified - removed slash commands and command palette)
  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    // Escape key handling - exit zen mode
    if (e.key === "Escape") {
      if (isZenMode) {
        isZenMode = false;
        return;
      }
    }

    // Zen mode: Cmd+Shift+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      toggleZenMode();
    }

    // Tab for indentation
    if (e.key === "Tab" && textareaRef) {
      e.preventDefault();
      const start = textareaRef.selectionStart;
      const end = textareaRef.selectionEnd;
      content = content.substring(0, start) + "  " + content.substring(end);
      setTimeout(() => {
        if (textareaRef) {
          textareaRef.selectionStart = textareaRef.selectionEnd = start + 2;
        }
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

  /** @param {KeyboardEvent} e */
  function handleGlobalKeydown(e) {
    if (e.key === "Escape") {
      if (ambientSounds.showPanel) {
        ambientSounds.closePanel();
        e.preventDefault();
        return;
      }
      if (snippetsManager.modal.open) {
        snippetsManager.closeModal();
        e.preventDefault();
        return;
      }
      if (showFullPreview) {
        showFullPreview = false;
        e.preventDefault();
      }
    }
  }

  // Zen mode toggle
  function toggleZenMode() {
    isZenMode = !isZenMode;
    if (isZenMode) {
      editorSettings.typewriterMode = true;
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

  function syncLineNumbersScroll() {
    if (lineNumbersRef && textareaRef) {
      lineNumbersRef.scrollTop = textareaRef.scrollTop;
    }
  }

  // Text manipulation helpers
  /**
   * @param {string} before
   * @param {string} after
   */
  async function wrapSelection(before, after) {
    if (!textareaRef || isUpdating) return;
    isUpdating = true;
    isProgrammaticUpdate = true;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = content.substring(start, end);
    content = content.substring(0, start) + before + selectedText + after + content.substring(end);

    await tick();  // Wait for Svelte to update DOM

    textareaRef.selectionStart = start + before.length;
    textareaRef.selectionEnd = end + before.length;
    textareaRef.focus();

    isProgrammaticUpdate = false;
    isUpdating = false;
  }

  /** @param {string} text */
  async function insertAtCursor(text) {
    if (!textareaRef || isUpdating) return;
    isUpdating = true;
    isProgrammaticUpdate = true;

    const start = textareaRef.selectionStart;
    content = content.substring(0, start) + text + content.substring(start);

    await tick();  // Wait for Svelte to update DOM

    textareaRef.selectionStart = textareaRef.selectionEnd = start + text.length;
    textareaRef.focus();

    isProgrammaticUpdate = false;
    isUpdating = false;
  }

  // Toolbar actions
  /** @param {number} level */
  function insertHeading(level) {
    insertAtCursor("#".repeat(level) + " ");
  }

  function insertLink() {
    wrapSelection("[", "](url)");
  }

  function insertImage() {
    insertAtCursor("![alt text](image-url)");
  }

  async function insertCodeBlock() {
    if (!textareaRef || isUpdating) return;
    isUpdating = true;
    isProgrammaticUpdate = true;

    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = content.substring(start, end);
    const codeBlock = "```\n" + (selectedText || "code here") + "\n```";
    content = content.substring(0, start) + codeBlock + content.substring(end);

    await tick();  // Wait for Svelte to update DOM

    textareaRef.selectionStart = textareaRef.selectionEnd = start + codeBlock.length;
    textareaRef.focus();

    isProgrammaticUpdate = false;
    isUpdating = false;
  }

  function insertList() {
    insertAtCursor("- ");
  }

  function insertQuote() {
    insertAtCursor("> ");
  }

  // Scroll sync
  function handleScroll() {
    syncLineNumbersScroll();
    if (textareaRef && previewRef && showPreview) {
      const scrollRatio = textareaRef.scrollTop / (textareaRef.scrollHeight - textareaRef.clientHeight);
      previewRef.scrollTop = scrollRatio * (previewRef.scrollHeight - previewRef.clientHeight);
    }
  }

  // Apply typewriter scroll when cursor moves
  $effect(() => {
    if (editorSettings.typewriterMode && cursorLine) {
      applyTypewriterScroll();
    }
  });

  // Auto-save draft effect
  $effect(() => {
    if (draftKey && !readonly) {
      draftManager.scheduleSave(content);
    }
  });

  // Drag and drop handlers
  /** @param {DragEvent} e */
  function handleDragEnter(e) {
    e.preventDefault();
    if (readonly) return;
    if (e.dataTransfer?.types?.includes("Files")) {
      isDragging = true;
    }
  }

  /** @param {DragEvent} e */
  function handleDragOver(e) {
    e.preventDefault();
    if (readonly) return;
    if (e.dataTransfer?.types?.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      isDragging = true;
    }
  }

  /** @param {DragEvent} e */
  function handleDragLeave(e) {
    e.preventDefault();
    const target = /** @type {HTMLElement} */ (e.currentTarget);
    if (!target.contains(/** @type {Node | null} */ (e.relatedTarget))) {
      isDragging = false;
    }
  }

  /** @param {DragEvent} e */
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

    for (const file of imageFiles) {
      await uploadImage(file);
    }
  }

  /** @param {File} file */
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

      const altText = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      const imageMarkdown = `![${altText}](${result.url})\n`;
      insertAtCursor(imageMarkdown);

      uploadProgress = "";
    } catch (err) {
      uploadError = err instanceof Error ? err.message : String(err);
      setTimeout(() => (uploadError = null), 5000);
    } finally {
      isUploading = false;
      uploadProgress = "";
    }
  }

  /** @param {ClipboardEvent} e */
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
        const renamedFile = new File([file], `pasted-${timestamp}.${extension}`, {
          type: file.type,
        });
        uploadImage(renamedFile);
      }
    }
  }

  onMount(() => {
    updateCursorPosition();
    snippetsManager.load();
    ambientSounds.loadSettings();
    editorTheme.loadTheme();
    draftManager.init(content);

    return () => {
      ambientSounds.cleanup();
      draftManager.cleanup();
    };
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
  class="editor-container"
  class:dragging={isDragging}
  class:zen-mode={isZenMode}
  class:campfire-mode={writingSession.isCampfireActive}
  aria-label="Markdown editor with live preview"
  role="application"
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
  {#if draftManager.draftRestorePrompt && draftManager.storedDraft}
    <div class="draft-prompt">
      <div class="draft-prompt-content">
        <span class="draft-icon">~</span>
        <div class="draft-message">
          <strong>Unsaved draft found</strong>
          <span class="draft-time">
            Saved {new Date(draftManager.storedDraft.savedAt).toLocaleString()}
          </span>
        </div>
        <div class="draft-actions">
          <button type="button" class="draft-btn restore" onclick={() => draftManager.restoreDraft()}>
            [<span class="key">r</span>estore]
          </button>
          <button type="button" class="draft-btn discard" onclick={() => draftManager.discardDraft()}>
            [<span class="key">d</span>iscard]
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Minimal Toolbar (Medium-style - formatting via floating toolbar on selection) -->
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="toolbar-hint">Select text to format</span>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-btn toggle-btn"
        class:active={showPreview}
        onclick={() => (showPreview = !showPreview)}
        title="Toggle Preview"
      >
        {#if showPreview}[hide <span class="key">p</span>review]{:else}[show <span class="key">p</span>review]{/if}
      </button>
      <button
        type="button"
        class="toolbar-btn full-preview-btn"
        onclick={() => (showFullPreview = true)}
        title="Open Full Preview (site styling)"
      >
        [<span class="key">f</span>ull]
      </button>
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
          aria-label="Markdown editor content"
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
          <Logo class="preview-logo" />
        </div>
        <div class="preview-content" bind:this={previewRef}>
          {#if previewHtml}
            {#key previewHtml}
              <div>{@html previewHtml}</div>
            {/key}
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
      <span class="status-item">Ln {cursorLine}, Col {cursorCol}</span>
      <span class="status-divider">|</span>
      <span class="status-item">{lineCount} lines</span>
      <span class="status-divider">|</span>
      <span class="status-item">{wordCount} words</span>
      <span class="status-divider">|</span>
      <span class="status-item">{readingTime}</span>
      {#if writingSession.isGoalEnabled}
        <span class="status-divider">|</span>
        <span class="status-goal">Goal: {goalProgress}%</span>
      {/if}
      {#if writingSession.isCampfireActive}
        <span class="status-divider">|</span>
        <span class="status-campfire">~ {campfireElapsed}</span>
      {/if}
    </div>
    <div class="status-right">
      <button
        type="button"
        class="status-sound-btn"
        class:playing={ambientSounds.enabled}
        onclick={() => ambientSounds.togglePanel()}
        title="Ambient sounds"
      >
        [{soundLibrary[/** @type {keyof typeof soundLibrary} */ (ambientSounds.currentSound)]?.name || "snd"}]{#if ambientSounds.enabled}<span class="sound-wave">~</span>{/if}
      </button>
      <span class="status-divider">|</span>
      {#if editorSettings.typewriterMode}
        <span class="status-mode">Typewriter</span>
        <span class="status-divider">|</span>
      {/if}
      {#if saving}
        <span class="status-saving">Saving...</span>
      {:else if draftKey && draftManager.hasUnsavedChanges(content)}
        <span class="status-draft">Draft saving...</span>
      {:else}
        <span class="status-item">Markdown</span>
      {/if}
    </div>
  </div>
</div>

<!-- Floating Toolbar for text formatting (Medium-style) -->
<FloatingToolbar
  {textareaRef}
  bind:content={content}
  {readonly}
  onContentChange={(c) => content = c}
/>

<!-- Campfire Session Controls -->
{#if writingSession.isCampfireActive}
  <div class="campfire-controls">
    <div class="campfire-ember"></div>
    <div class="campfire-stats">
      <span class="campfire-time">{campfireElapsed}</span>
      <span class="campfire-words">+{writingSession.getCampfireWords(wordCount)} words</span>
    </div>
    <button type="button" class="campfire-end" onclick={() => writingSession.endCampfire()}>
      [<span class="key">e</span>nd]
    </button>
  </div>
{/if}

<!-- Snippets Modal -->
<Dialog
  bind:open={snippetsManager.modal.open}
  title={`:: ${snippetsManager.modal.editingId ? "edit snippet" : "new snippet"}`}
>
  <div class="snippets-modal-body">
    <div class="snippets-form">
      <div class="snippet-field">
        <label for="snippet-name">Name</label>
        <Input
          id="snippet-name"
          type="text"
          bind:value={snippetsManager.modal.name}
          placeholder="e.g., Blog signature"
        />
      </div>

      <div class="snippet-field">
        <label for="snippet-trigger">Trigger (optional)</label>
        <Input
          id="snippet-trigger"
          type="text"
          bind:value={snippetsManager.modal.trigger}
          placeholder="e.g., sig"
        />
        <span class="field-hint">Type /trigger to quickly insert</span>
      </div>

      <div class="snippet-field">
        <label for="snippet-content">Content</label>
        <textarea
          id="snippet-content"
          bind:value={snippetsManager.modal.content}
          placeholder="Enter your markdown snippet..."
          rows="6"
        ></textarea>
      </div>

      <div class="snippet-actions">
        {#if snippetsManager.modal.editingId}
          <Button variant="danger" onclick={() => {
            const id = snippetsManager.modal.editingId;
            if (id) snippetsManager.deleteSnippet(id);
          }}>
            [<span class="key">d</span>elete]
          </Button>
        {/if}
        <div class="snippet-actions-right">
          <Button variant="outline" onclick={() => snippetsManager.closeModal()}>
            [<span class="key">c</span>ancel]
          </Button>
          <Button
            onclick={() => snippetsManager.saveSnippet()}
            disabled={!snippetsManager.modal.name.trim() || !snippetsManager.modal.content.trim()}
          >
            {#if snippetsManager.modal.editingId}[<span class="key">u</span>pdate]{:else}[<span class="key">s</span>ave]{/if}
          </Button>
        </div>
      </div>
    </div>

    {#if snippetsManager.snippets.length > 0 && !snippetsManager.modal.editingId}
      <div class="snippets-list-divider">
        <span>:: your snippets</span>
      </div>
      <div class="snippets-list">
        {#each snippetsManager.snippets as snippet}
          <button
            type="button"
            class="snippet-list-item"
            onclick={() => snippetsManager.openModal(snippet.id)}
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
      <button type="button" class="sound-panel-close" onclick={() => ambientSounds.closePanel()}>
        [x]
      </button>
    </div>

    <div class="sound-options">
      {#each Object.entries(soundLibrary) as [key, sound]}
        <button
          type="button"
          class="sound-option"
          class:active={ambientSounds.currentSound === key}
          class:playing={ambientSounds.enabled && ambientSounds.currentSound === key}
          onclick={() => ambientSounds.selectSound(key)}
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
          oninput={(e) => {
            const target = /** @type {HTMLInputElement} */ (e.target);
            ambientSounds.setVolume(parseFloat(target.value));
          }}
          class="volume-slider"
        />
      </label>

      <button
        type="button"
        class="sound-play-btn"
        class:playing={ambientSounds.enabled}
        onclick={() => ambientSounds.toggle()}
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
  <div class="full-preview-modal" role="dialog" aria-modal="true" aria-label="Full article preview" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (showFullPreview = false)}>
    <button type="button" class="full-preview-backdrop" onclick={() => (showFullPreview = false)} aria-label="Close preview"></button>
    <div class="full-preview-container">
      <header class="full-preview-header">
        <h2>:: full preview</h2>
        <div class="full-preview-actions">
          <button type="button" class="full-preview-close" onclick={() => (showFullPreview = false)}>
            [<span class="key">c</span>lose]
          </button>
        </div>
      </header>
      <div class="full-preview-scroll">
        <article class="full-preview-article">
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

          <div class="content-body">
            {#if previewHtml}
              {#key previewHtml}
                <div>{@html previewHtml}</div>
              {/key}
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
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
  }
  .editor-container.dragging {
    border-color: var(--editor-accent, #8bc48b);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--editor-accent, #8bc48b) 30%, transparent);
  }
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
  .key {
    color: var(--editor-accent, #8bc48b);
    font-weight: bold;
    text-decoration: underline;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    padding: 0.4rem 0.75rem;
    background: var(--editor-bg-tertiary, var(--light-bg-primary));
    border-bottom: 1px solid var(--editor-border, var(--light-border-primary));
    flex-wrap: wrap;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    transition: opacity 0.3s ease;
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
  /* svelte-ignore css-unused-selector */
  .toolbar-divider {
    color: #4a4a4a;
    margin: 0 0.25rem;
    font-size: 0.8rem;
  }
  .toolbar-spacer {
    flex: 1;
  }
  .toolbar-left {
    display: flex;
    align-items: center;
  }
  .toolbar-hint {
    color: var(--editor-text-dim, #5a5a5a);
    font-size: 0.75rem;
    font-style: italic;
  }
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
  .preview-panel {
    width: 50%;
    display: flex;
    flex-direction: column;
    background: #252526;
    min-height: 0;
  }
  .preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    background: #2d2d2d;
    border-bottom: 1px solid var(--light-border-primary);
  }
  .preview-label {
    color: #8bc48b;
    font-size: 0.85rem;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }
  :global(.preview-logo) {
    width: 18px;
    height: 18px;
    color: var(--editor-accent, #8bc48b);
    opacity: 0.6;
    transition: opacity 0.2s ease;
  }
  :global(.preview-logo:hover) {
    opacity: 1;
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
  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.35rem 0.75rem;
    background: var(--editor-status-bg, var(--light-border-secondary));
    border-top: 1px solid var(--editor-status-border, var(--light-border-secondary));
    font-size: 0.75rem;
    color: var(--editor-accent-bright, #a8dca8);
    transition: opacity 0.3s ease;
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
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
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
  .editor-container.zen-mode {
    position: fixed;
    inset: 0;
    z-index: 9999;
    border-radius: 0;
    border: none;
  }
  .editor-container.zen-mode .toolbar {
    opacity: 0.3;
  }
  .editor-container.zen-mode .toolbar:hover {
    opacity: 1;
  }
  .editor-container.zen-mode .status-bar {
    opacity: 0.5;
  }
  .editor-container.zen-mode .status-bar:hover {
    opacity: 1;
  }
  .editor-container.zen-mode .editor-area {
    height: calc(100vh - 80px);
  }
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
    animation: fade-in 0.3s ease;
  }
  .campfire-ember {
    width: 12px;
    height: 12px;
    background: linear-gradient(135deg, #ff6b35, #f0a060);
    border-radius: 50%;
    animation: ember-glow 2s ease-in-out infinite;
  }
  @keyframes ember-glow {
    0%, 100% { box-shadow: 0 0 8px #ff6b35, 0 0 16px rgba(240, 107, 53, 0.5); }
    50% { box-shadow: 0 0 12px #f0a060, 0 0 24px rgba(240, 160, 96, 0.6); }
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
  /* Slash menu and command palette styles removed - using FloatingToolbar instead */
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
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
  .snippet-field textarea {
    padding: 0.6rem 0.75rem;
    background: #252526;
    border: 1px solid var(--light-border-primary);
    border-radius: 6px;
    color: #d4d4d4;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    resize: vertical;
    min-height: 100px;
    transition: border-color 0.2s ease;
  }
  .snippet-field textarea:focus {
    outline: none;
    border-color: #4a7c4a;
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
    0%, 100% { opacity: 0.4; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1); }
  }
  .sound-panel {
    position: fixed;
    bottom: 3.5rem;
    right: 1rem;
    width: 280px;
    background: var(--light-bg-primary);
    border: 1px solid var(--light-border-primary);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    z-index: 1003; /* above modals and gutters */
    animation: slide-up 0.2s ease;
    overflow: hidden;
  }
  @keyframes slide-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
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
    font-size: 0.65rem;
    color: #9d9d9d;
  }
  .sound-option:hover {
    background: var(--light-bg-tertiary);
    border-color: var(--light-border-primary);
  }
  .sound-option.active {
    background: var(--light-border-secondary);
    border-color: #4a7c4a;
    color: #a8dca8;
  }
  .sound-option.playing {
    border-color: #8bc48b;
    box-shadow: 0 0 8px rgba(139, 196, 139, 0.3);
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
    border: none;
    padding: 0;
    cursor: pointer;
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
</style>
