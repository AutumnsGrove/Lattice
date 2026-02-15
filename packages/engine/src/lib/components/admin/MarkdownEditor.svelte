<script>
  import MarkdownIt from "markdown-it";
  import { tick } from "svelte";

  // Local instance for admin editor preview
  const editorMd = new MarkdownIt({ html: false, linkify: true });
  import { extractHeaders } from "$lib/utils/markdown";
  import { groveDirectivePlugin } from "$lib/utils/markdown-directives";
  editorMd.use(groveDirectivePlugin);
  import "$lib/styles/content.css";
  import { Button, Input, Logo } from '$lib/ui';
  import Dialog from "$lib/ui/components/ui/Dialog.svelte";
  import { toast } from "$lib/ui/components/ui/toast";
  import { apiRequest } from "$lib/utils/api";
  import { getActionableUploadError, isConvertibleFormat } from "$lib/utils/upload-validation";
  import { convertHeicToJpeg } from "$lib/utils/imageProcessor";
  import ContentWithGutter from "$lib/components/custom/ContentWithGutter.svelte";
  import { Eye, EyeOff, Maximize2, PenLine, Columns2, BookOpen, Focus, Minimize2, Flame, Mic, Bold, Italic, Code, Link, Heading1, Heading2, Heading3, Check, Images } from "lucide-svelte";
  import FiresideChat from "./FiresideChat.svelte";
  import PhotoPicker from "./PhotoPicker.svelte";
  import VoiceInput from "./VoiceInput.svelte";
  import { browser } from "$app/environment";

  // Import composables (simplified - removed command palette, slash commands, ambient sounds, snippets, and writing sessions)
  import {
    useEditorTheme,
    useDraftManager,
  } from "./composables";

  /**
   * @typedef {Object} StoredDraft
   * @property {string} content
   * @property {number} savedAt
   * @property {number} [wordCount]
   */

  /**
   * @typedef {Object} GutterItemProp
   * @property {string} type
   * @property {string} [anchor]
   * @property {string} [content]
   * @property {string} [url]
   * @property {string} [file]
   * @property {string} [caption]
   * @property {Array<{url: string, alt?: string, caption?: string}>} [images]
   */

  /**
   * @typedef {Object.<string, boolean>} GraftsRecord
   * Graft flags for this tenant - component reads what it needs.
   * Known flags: fireside_mode (AI-assisted prompts), scribe_mode (voice-to-text)
   */

  // Props
  let {
    content = $bindable(""),
    onSave = () => {},
    saving = false,
    readonly = false,
    draftKey = /** @type {string | null} */ (null),
    onDraftRestored = /** @type {(draft: StoredDraft) => void} */ (() => {}),
    previewTitle = $bindable(""),
    previewDate = "",
    previewTags = /** @type {string[]} */ ([]),
    gutterItems = /** @type {GutterItemProp[]} */ ([]),
    firesideAssisted = $bindable(false),
    /** All grafts for this tenant - component reads what it needs */
    grafts = /** @type {GraftsRecord} */ ({}),
  } = $props();

  // Derived graft flags - add new ones here as they're created
  const firesideEnabled = $derived(grafts?.fireside_mode ?? false);
  const scribeEnabled = $derived(grafts?.scribe_mode ?? false);
  const uploadsEnabled = $derived(grafts?.image_uploads ?? true);

  // Core refs and state
  /** @type {HTMLTextAreaElement | null} */
  let textareaRef = $state(null);
  /** @type {HTMLElement | null} */
  let previewRef = $state(null);
  /** @type {HTMLElement | null} */
  let lineNumbersRef = $state(null);

  // Editor mode: "write" (source only), "split" (source + preview), "preview" (preview only)
  // Initialize from localStorage synchronously to avoid flash of wrong mode
  /** @type {"write" | "split" | "preview"} */
  let editorMode = $state((() => {
    if (browser) {
      const saved = localStorage.getItem("editor-mode");
      if (saved === "write" || saved === "split" || saved === "preview") {
        return saved;
      }
    }
    return "write";  // Default to source/raw mode for focused writing
  })());

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
  /** @type {File | null} */
  let lastFailedFile = $state(null);

  // Full preview mode
  let showFullPreview = $state(false);

  // Photo picker
  let showPhotoPicker = $state(false);

  // Editor settings
  let editorSettings = $state({
    typewriterMode: false,
    zenMode: false,
    showLineNumbers: true,
    wordWrap: true,
  });

  // Zen mode
  let isZenMode = $state(false);

  // Fireside mode (conversational writing)
  let isFiresideMode = $state(false);

  // Voice mode (Scribe transcription)
  /** @type {"raw" | "draft"} */
  let voiceMode = $state(/** @type {"raw" | "draft"} */ ("raw"));
  let voiceError = $state(/** @type {string | null} */ (null));

  // Initialize composables
  const editorTheme = useEditorTheme();

  // svelte-ignore state_referenced_locally - draftKey, readonly, onDraftRestored don't change during lifecycle
  const draftManager = useDraftManager({
    draftKey,
    getContent: () => content,
    setContent: (/** @type {string} */ c) => (content = c),
    onDraftRestored,
    readonly,
  });

  // Note: Slash commands and command palette removed for simplified Medium-style UX

  // Debounced preview HTML - avoid expensive markdown rendering on every keystroke
  // Cache the last rendered HTML to prevent jank during typing
  let debouncedContent = $state(content);
  // NOT $state - these are cleanup handles, not reactive state
  // Using $state here causes infinite loops (effect writes to state it reads)
  /** @type {ReturnType<typeof setTimeout> | null} */
  let debounceTimer = null;
  let isMounted = true;

  // Update debounced content after 150ms of no typing
  $effect(() => {
    // Reset mounted flag — cleanup sets it to false before each re-run,
    // so we must restore it here. It only stays false after final unmount.
    isMounted = true;

    // Clear any existing timer
    if (debounceTimer) clearTimeout(debounceTimer);

    // Capture current content for the closure
    const currentContent = content;

    debounceTimer = setTimeout(() => {
      // Only update if component is still mounted (prevents race condition)
      if (isMounted) {
        debouncedContent = currentContent;
      }
    }, 150);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      isMounted = false;  // Mark as unmounted on cleanup
    };
  });

  // Computed values
  let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
  let charCount = $derived(content.length);
  let lineCount = $derived(content.split("\n").length);
  // Use debounced content for expensive operations (markdown rendering)
  // Note: editorMd has html:false so output is already safe — no sanitization needed for admin preview
  let previewHtml = $derived(debouncedContent ? editorMd.render(debouncedContent) : "");
  let previewHeaders = $derived(debouncedContent ? extractHeaders(debouncedContent) : []);

  let readingTime = $derived.by(() => {
    const minutes = Math.ceil(wordCount / 200);
    return minutes < 1 ? "< 1 min" : `~${minutes} min read`;
  });

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

    // Mode switching: Cmd/Ctrl + 1/2/3
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      if (e.key === "1") {
        e.preventDefault();
        setEditorMode("write");
      } else if (e.key === "2") {
        e.preventDefault();
        setEditorMode("split");
      } else if (e.key === "3") {
        e.preventDefault();
        setEditorMode("preview");
      }
    }

    // Cmd/Ctrl + P to cycle modes (when not in preview-only)
    if (e.key === "p" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      e.preventDefault();
      cycleEditorMode();
    }

    // Cmd/Ctrl + Shift + F for Fireside mode (only if graft enabled)
    if (e.key === "f" && (e.metaKey || e.ctrlKey) && e.shiftKey && firesideEnabled) {
      e.preventDefault();
      toggleFiresideMode();
    }
  }

  /** @param {KeyboardEvent} e */
  function handleGlobalKeydown(e) {
    if (e.key === "Escape") {
      // Close photo picker first (highest priority - it has its own handler too)
      if (showPhotoPicker) {
        showPhotoPicker = false;
        e.preventDefault();
        return;
      }
      // Exit Fireside mode first (highest priority)
      if (isFiresideMode) {
        isFiresideMode = false;
        e.preventDefault();
        return;
      }
      // Exit zen mode second
      if (isZenMode) {
        isZenMode = false;
        e.preventDefault();
        return;
      }
      // Then check for full preview
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

  // Fireside mode toggle
  function toggleFiresideMode() {
    // Can't use Fireside if there's already content (it's for starting fresh)
    if (!isFiresideMode && content.trim()) {
      // Could show a warning here, but for now just don't toggle
      return;
    }
    isFiresideMode = !isFiresideMode;
  }

  /**
   * Handle accepting a draft from Fireside mode
   * @param {{ title: string, content: string, marker: string }} draft
   */
  function handleFiresideDraft(draft) {
    // Set the content (with the marker appended)
    content = draft.content + "\n\n" + draft.marker;

    // Set the title if the prop is bindable
    if (draft.title) {
      previewTitle = draft.title;
    }

    // Mark as fireside-assisted
    firesideAssisted = true;

    // Exit Fireside mode
    isFiresideMode = false;

    // Focus the textarea after a tick
    tick().then(() => {
      textareaRef?.focus();
    });
  }

  // Handle closing Fireside without a draft
  function handleFiresideClose() {
    isFiresideMode = false;
  }

  /**
   * Handle transcription result from VoiceInput.
   * Inserts transcribed text at cursor position.
   * @param {{ text: string, gutterContent?: Array<{type: string, content: string, anchor?: string}>, rawTranscript?: string }} result
   */
  function handleTranscription(result) {
    voiceError = null;

    if (!textareaRef) return;

    const { text, gutterContent } = result;

    // Get cursor position
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;

    // Insert text at cursor
    const before = content.substring(0, start);
    const after = content.substring(end);

    // Add space before/after if needed
    const needsSpaceBefore = before.length > 0 && !/\s$/.test(before);
    const needsSpaceAfter = after.length > 0 && !/^\s/.test(after);

    const insertText =
      (needsSpaceBefore ? " " : "") +
      text +
      (needsSpaceAfter ? " " : "");

    content = before + insertText + after;

    // Move cursor to end of inserted text
    tick().then(() => {
      if (textareaRef) {
        const newPos = start + insertText.length;
        textareaRef.setSelectionRange(newPos, newPos);
        textareaRef.focus();
      }
    });

    // TODO: Handle gutterContent when Vine integration is ready
    // For now, gutterContent is available but not yet merged with gutterItems prop
    if (gutterContent && gutterContent.length > 0) {
      console.log("[MarkdownEditor] Draft mode produced Vines:", gutterContent);
    }
  }

  /**
   * Handle voice input error.
   * @param {{ message: string }} error
   */
  function handleVoiceError(error) {
    voiceError = error.message;

    // Clear error after 5 seconds
    setTimeout(() => {
      voiceError = null;
    }, 5000);
  }

  // Editor mode switching
  /** @param {"write" | "split" | "preview"} mode */
  function setEditorMode(mode) {
    editorMode = mode;
    if (browser) {
      localStorage.setItem("editor-mode", mode);
    }
    // Focus textarea when switching to write or split mode
    if (mode !== "preview" && textareaRef) {
      setTimeout(() => textareaRef?.focus(), 50);
    }
  }

  function cycleEditorMode() {
    const modes = /** @type {const} */ (["write", "split", "preview"]);
    const currentIndex = modes.indexOf(editorMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setEditorMode(modes[nextIndex]);
  }

  // Note: Editor mode is now initialized synchronously at declaration time
  // using an IIFE that reads from localStorage. This prevents the flash of
  // wrong mode that occurred when loadEditorMode() was called in $effect.

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

  /** @param {string[]} urls */
  function handlePhotoInsert(urls) {
    showPhotoPicker = false;
    if (urls.length === 0) return;
    if (urls.length === 1) {
      insertAtCursor(`![Photo](${urls[0]})\n`);
    } else {
      insertAtCursor(`::gallery[${urls.join(", ")}]::\n`);
    }
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
    // Sync scroll with preview when in split or preview mode
    if (textareaRef && previewRef && editorMode !== "write") {
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

  // Full preview modal focus management
  /** @type {HTMLElement | null} */
  let previouslyFocusedBeforePreview = null;
  /** @type {HTMLDivElement | null} */
  let fullPreviewModalRef = $state(null);

  $effect(() => {
    if (showFullPreview) {
      // Store the currently focused element to restore on close
      const activeEl = document.activeElement;
      if (activeEl instanceof HTMLElement) {
        previouslyFocusedBeforePreview = activeEl;
      }
      // Focus the modal for keyboard accessibility
      setTimeout(() => {
        fullPreviewModalRef?.focus();
      }, 50);
    } else if (previouslyFocusedBeforePreview) {
      // Restore focus when modal closes
      previouslyFocusedBeforePreview.focus();
      previouslyFocusedBeforePreview = null;
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
    // Pre-check: is the feature enabled via grafts?
    if (!uploadsEnabled) {
      toast.warning("Your grove needs a little time to sprout before photo uploads are available. You can paste external image URLs using the link button instead!");
      return;
    }

    isUploading = true;
    uploadProgress = `Uploading ${file.name}...`;
    uploadError = null;
    lastFailedFile = null;

    try {
      // Convert HEIC/HEIF to JPEG before uploading
      if (isConvertibleFormat(file)) {
        uploadProgress = `Converting ${file.name}...`;
        file = await convertHeicToJpeg(file);
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blog");

      const result = await apiRequest("/api/images/upload", {
        method: "POST",
        body: formData,
      });

      const altText = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim() || "Image";
      const imageMarkdown = `![${altText}](${result.url})\n`;
      insertAtCursor(imageMarkdown);

      toast.success(`Uploaded ${file.name}`);
      uploadProgress = "";
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      uploadError = getActionableUploadError(rawMessage);
      lastFailedFile = file;
      toast.error(uploadError);
      setTimeout(() => (uploadError = null), 8000);
    } finally {
      isUploading = false;
      uploadProgress = "";
    }
  }

  function retryUpload() {
    if (lastFailedFile) {
      const file = lastFailedFile;
      lastFailedFile = null;
      uploadError = null;
      uploadImage(file);
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

  // Initialize editor on mount
  $effect(() => {
    updateCursorPosition();
    editorTheme.loadTheme();
    draftManager.init(content);
    // Note: editorMode is now initialized synchronously at declaration time
    // to avoid flash of wrong mode on initial render

    return () => {
      draftManager.cleanup();
    };
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
  class="editor-container"
  class:dragging={isDragging}
  class:zen-mode={isZenMode}
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
        {#if lastFailedFile}
          <button type="button" class="retry-btn" onclick={retryUpload}>[retry]</button>
        {/if}
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

  <!-- Mode-based Toolbar (hidden in Fireside mode) -->
  {#if !isFiresideMode}
  <div class="toolbar">
    <div class="toolbar-left">
      {#if editorMode !== "preview"}
        <!-- Formatting buttons -->
        <div class="toolbar-group formatting-group">
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => wrapSelection("**", "**")}
            disabled={readonly}
            title="Bold (⌘B)"
            aria-label="Bold"
          >
            <Bold class="toolbar-icon" />
          </button>
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => wrapSelection("_", "_")}
            disabled={readonly}
            title="Italic (⌘I)"
            aria-label="Italic"
          >
            <Italic class="toolbar-icon" />
          </button>
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => wrapSelection("`", "`")}
            disabled={readonly}
            title="Inline code"
            aria-label="Code"
          >
            <Code class="toolbar-icon" />
          </button>
        </div>

        <div class="toolbar-divider-line"></div>

        <div class="toolbar-group formatting-group">
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => insertLink()}
            disabled={readonly}
            title="Insert link"
            aria-label="Link"
          >
            <Link class="toolbar-icon" />
          </button>
        </div>

        <div class="toolbar-divider-line"></div>
        <div class="toolbar-group formatting-group">
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => showPhotoPicker = true}
            disabled={readonly}
            title="Insert photo from gallery"
            aria-label="Insert photo from gallery"
          >
            <Images class="toolbar-icon" />
          </button>
        </div>

        <div class="toolbar-divider-line"></div>

        <div class="toolbar-group formatting-group">
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => insertHeading(1)}
            disabled={readonly}
            title="Heading 1"
            aria-label="Heading 1"
          >
            <Heading1 class="toolbar-icon" />
          </button>
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => insertHeading(2)}
            disabled={readonly}
            title="Heading 2"
            aria-label="Heading 2"
          >
            <Heading2 class="toolbar-icon" />
          </button>
          <button
            type="button"
            class="toolbar-icon-btn fmt-btn"
            onclick={() => insertHeading(3)}
            disabled={readonly}
            title="Heading 3"
            aria-label="Heading 3"
          >
            <Heading3 class="toolbar-icon" />
          </button>
        </div>

        <div class="toolbar-divider-line"></div>
      {/if}

      {#if firesideEnabled && !content.trim()}
        <button
          type="button"
          class="fireside-btn"
          onclick={toggleFiresideMode}
          title="Fireside Mode (⌘⇧F) - Start with a conversation"
          aria-label="Enter Fireside mode for conversational writing"
        >
          <Flame class="toolbar-icon fireside-icon" />
          <span>Fireside</span>
        </button>
        <span class="toolbar-divider">|</span>
      {/if}
      <!-- Voice Input (Scribe) - gated by scribe_mode graft -->
      {#if scribeEnabled && editorMode !== "preview"}
        <div class="voice-wrapper" title="Voice Input (⌘⇧U) - Hold to record, release to transcribe">
          <VoiceInput
            mode={voiceMode}
            onTranscription={handleTranscription}
            onError={handleVoiceError}
            disabled={readonly}
          />
          {#if voiceError}
            <span class="voice-error">{voiceError}</span>
          {/if}
        </div>
      {/if}
      {#if editorMode === "preview"}
        <span class="toolbar-hint">Preview mode (read-only)</span>
      {/if}
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group mode-group">
      <button
        type="button"
        class="toolbar-icon-btn mode-btn"
        class:active={editorMode === "write"}
        onclick={() => setEditorMode("write")}
        title="Source Mode (⌘1)"
        aria-label="Source mode - editor only"
      >
        <PenLine class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-icon-btn mode-btn"
        class:active={editorMode === "split"}
        onclick={() => setEditorMode("split")}
        title="Split Mode (⌘2)"
        aria-label="Split mode - editor and preview"
      >
        <Columns2 class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-icon-btn mode-btn"
        class:active={editorMode === "preview"}
        onclick={() => setEditorMode("preview")}
        title="Preview Mode (⌘3)"
        aria-label="Preview mode - preview only"
      >
        <BookOpen class="toolbar-icon" />
      </button>
    </div>

    <div class="toolbar-divider-line"></div>

    <div class="toolbar-group">
      <button
        type="button"
        class="toolbar-icon-btn full-btn"
        onclick={() => (showFullPreview = true)}
        title="Full Preview with Styling"
        aria-label="Open full preview with blog styling"
      >
        <Maximize2 class="toolbar-icon" />
      </button>
      <button
        type="button"
        class="toolbar-icon-btn zen-btn"
        class:active={isZenMode}
        onclick={toggleZenMode}
        title={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (⌘⇧↵)"}
        aria-label={isZenMode ? "Exit zen mode" : "Enter zen mode for focused writing"}
      >
        {#if isZenMode}
          <Minimize2 class="toolbar-icon" />
        {:else}
          <Focus class="toolbar-icon" />
        {/if}
      </button>
    </div>
  </div>
  {/if}

  <!-- Fireside Mode (replaces editor) -->
  {#if isFiresideMode}
    <div class="fireside-area">
      <FiresideChat
        onDraft={handleFiresideDraft}
        onClose={handleFiresideClose}
      />
    </div>
  {:else}
    <!-- Editor Area -->
    <div class="editor-area" class:split={editorMode === "split"} class:preview-only={editorMode === "preview"}>
      <!-- Editor Panel (hidden in preview mode) -->
      {#if editorMode !== "preview"}
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
              placeholder="Start writing your bloom... (Drag & drop or paste images)"
              spellcheck="true"
              disabled={readonly}
              class="editor-textarea"
            ></textarea>
          </div>
        </div>
      {/if}

      <!-- Preview Panel (shown in split and preview modes) -->
      {#if editorMode === "split" || editorMode === "preview"}
        <div class="preview-panel" class:full-width={editorMode === "preview"}>
          <div class="preview-header">
            <span class="preview-label">:: {editorMode === "preview" ? "preview (read-only)" : "live preview"}</span>
            <Logo class="preview-logo" />
          </div>
          <div class="preview-content" bind:this={previewRef}>
            {#if previewHtml}
              {#key previewHtml}
                <div class="rendered-content">{@html previewHtml}</div>
              {/key}
            {:else}
              <p class="preview-placeholder">
                {editorMode === "preview" ? "No content to preview..." : "Start typing to see your rendered markdown..."}
              </p>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Status Bar (hidden in Fireside mode) -->
  {#if !isFiresideMode}
  <div class="status-bar">
    <div class="status-left">
      <span class="status-item">Ln {cursorLine}, Col {cursorCol}</span>
      <span class="status-divider">|</span>
      <span class="status-item">{lineCount} lines</span>
      <span class="status-divider">|</span>
      <span class="status-item">{wordCount} words</span>
      <span class="status-divider">|</span>
      <span class="status-item">{readingTime}</span>
    </div>
    <div class="status-right">
      <span class="status-mode-indicator" title="Editor mode (⌘1/2/3)">
        {editorMode === "write" ? "Source" : editorMode === "split" ? "Split" : "Preview"}
      </span>
      {#if saving}
        <span class="status-divider">|</span>
        <span class="status-saving">Saving...</span>
      {:else if draftKey && draftManager.saveStatus === "saving"}
        <span class="status-divider">|</span>
        <span class="status-draft-saving">Saving draft...</span>
      {:else if draftKey && draftManager.saveStatus === "saved"}
        <span class="status-divider">|</span>
        <span class="status-draft-saved">Draft saved <Check size={12} class="inline-block" /></span>
      {:else if draftKey && draftManager.hasUnsavedChanges(content)}
        <span class="status-divider">|</span>
        <span class="status-draft-unsaved">Unsaved</span>
      {/if}
    </div>
  </div>
  {/if}
</div>


<!-- Photo Picker -->
{#if showPhotoPicker}
  <PhotoPicker onInsert={handlePhotoInsert} onClose={() => showPhotoPicker = false} galleryEnabled={uploadsEnabled} />
{/if}

<!-- Full Preview Modal -->
{#if showFullPreview}
  <div bind:this={fullPreviewModalRef} class="full-preview-modal" role="dialog" aria-modal="true" aria-label="Full article preview" tabindex="-1" onkeydown={(e) => e.key === 'Escape' && (showFullPreview = false)}>
    <button type="button" class="full-preview-backdrop" onclick={() => (showFullPreview = false)} aria-label="Close preview"></button>
    <div class="full-preview-container" class:has-vines={gutterItems.length > 0}>
      <header class="full-preview-header">
        <h2>:: full preview {#if gutterItems.length > 0}<span class="vine-count">({gutterItems.length} vine{gutterItems.length !== 1 ? 's' : ''})</span>{/if}</h2>
        <div class="full-preview-actions">
          <button type="button" class="full-preview-close" onclick={() => (showFullPreview = false)}>
            [<span class="key">c</span>lose]
          </button>
        </div>
      </header>
      <div class="full-preview-scroll">
        {#if gutterItems.length > 0}
          <!-- Use ContentWithGutter when we have vines -->
          <ContentWithGutter
            content={previewHtml}
            gutterContent={gutterItems}
            headers={previewHeaders}
            showTableOfContents={previewHeaders.length > 0}
          >
            {#if previewTitle || previewDate || previewTags.length > 0}
              <header class="content-header">
                {#if previewTitle}
                  <h1 class="full-preview-title">{previewTitle}</h1>
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
          </ContentWithGutter>
        {:else}
          <!-- Simple preview without vines -->
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
        {/if}
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
  .retry-btn {
    background: transparent;
    border: none;
    color: #ffb0b0;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.1rem 0.3rem;
    transition: color 0.15s ease;
  }
  .retry-btn:hover {
    color: #ffd0d0;
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
    gap: 0.25rem;
  }
  /* Icon-based toolbar buttons */
  .toolbar-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: var(--editor-accent-dim, #7a9a7a);
    cursor: pointer;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .toolbar-icon-btn:hover {
    color: var(--editor-accent-bright, #a8dca8);
    background: color-mix(in srgb, var(--editor-accent, #8bc48b) 10%, transparent);
  }
  .toolbar-icon-btn.active {
    color: var(--editor-accent, #8bc48b);
    background: color-mix(in srgb, var(--editor-accent, #8bc48b) 15%, transparent);
  }
  .toolbar-icon-btn.full-btn {
    color: #7ab3ff;
  }
  .toolbar-icon-btn.full-btn:hover {
    color: #9ac5ff;
    background: color-mix(in srgb, #7ab3ff 10%, transparent);
  }
  .toolbar-icon-btn.zen-btn {
    color: #d4a5ff;
  }
  .toolbar-icon-btn.zen-btn:hover {
    color: #e4c5ff;
    background: color-mix(in srgb, #d4a5ff 10%, transparent);
  }
  .toolbar-icon-btn.zen-btn.active {
    color: #e4c5ff;
    background: color-mix(in srgb, #d4a5ff 20%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, #d4a5ff 30%, transparent);
  }
  :global(.toolbar-icon) {
    width: 1rem;
    height: 1rem;
  }
  /* Fireside button - warm orange/amber styling */
  .fireside-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.3rem 0.6rem;
    background: linear-gradient(135deg, rgba(255, 140, 50, 0.15) 0%, rgba(255, 100, 30, 0.1) 100%);
    border: 1px solid rgba(255, 140, 50, 0.3);
    border-radius: 6px;
    color: #ff9d5c;
    font-family: inherit;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .fireside-btn:hover {
    background: linear-gradient(135deg, rgba(255, 140, 50, 0.25) 0%, rgba(255, 100, 30, 0.2) 100%);
    border-color: rgba(255, 140, 50, 0.5);
    color: #ffb88c;
  }
  :global(.fireside-icon) {
    width: 0.875rem;
    height: 0.875rem;
    color: #ff8c32;
  }
  .fireside-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  /* svelte-ignore css-unused-selector */
  .toolbar-divider {
    color: #4a4a4a;
    margin: 0 0.25rem;
    font-size: 0.8rem;
  }
  .voice-wrapper {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .voice-error {
    color: var(--grove-error, #ef4444);
    font-size: 0.75rem;
    white-space: nowrap;
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
  /* Formatting button group */
  .formatting-group {
    background: var(--editor-bg-secondary, #252526);
    border-radius: 6px;
    padding: 2px;
    gap: 0.15rem;
  }
  .toolbar-icon-btn.fmt-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  /* Mode toggle group */
  .mode-group {
    background: var(--editor-bg-secondary, #252526);
    border-radius: 6px;
    padding: 2px;
  }
  .mode-btn.active {
    background: var(--editor-accent, #8bc48b) !important;
    color: var(--editor-bg, #1e1e1e) !important;
  }
  .toolbar-divider-line {
    width: 1px;
    height: 1.25rem;
    background: var(--editor-border, #3a3a3a);
    margin: 0 0.5rem;
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
  /* Preview-only mode */
  .editor-area.preview-only {
    background: var(--editor-bg, #1e1e1e);
  }
  .editor-area.preview-only .preview-panel {
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
  }
  .preview-panel.full-width {
    border-left: none;
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
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
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
    overflow: hidden;
  }
  .status-left {
    flex: 1;
    min-width: 0;
  }
  .status-right {
    flex-shrink: 0;
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
  .status-draft-saving {
    color: #7a9a7a;
    font-style: italic;
  }
  .status-draft-saved {
    color: var(--editor-accent, #8bc48b);
    font-weight: 500;
  }
  .status-draft-unsaved {
    color: #e0a050;
    font-style: italic;
  }
  .status-mode-indicator {
    color: var(--editor-accent, #8bc48b);
    font-weight: 500;
    cursor: default;
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
    .toolbar-hint {
      display: none;
    }
    .status-bar {
      font-size: 0.7rem;
      gap: 0.25rem;
    }
    .status-left,
    .status-right {
      gap: 0.25rem;
    }
    /* Hide less important status items on mobile */
    .status-left .status-item:nth-child(n+4) {
      display: none;
    }
  }
  @media (max-width: 600px) {
    .toolbar {
      padding: 0.35rem 0.5rem;
      gap: 0.1rem;
    }
    .toolbar-divider-line {
      margin: 0 0.25rem;
    }
    .toolbar-icon-btn {
      padding: 0.35rem;
    }
    .formatting-group {
      padding: 1px;
      gap: 0.1rem;
    }
    .line-numbers {
      min-width: 2.25rem;
    }
    .line-numbers span {
      padding: 0 0.4rem;
      font-size: 0.75rem;
    }
    .editor-textarea {
      padding: 0.75rem;
      font-size: 0.85rem;
    }
  }
  @media (max-width: 480px) {
    .status-left .status-item:nth-child(n+3),
    .status-left .status-divider:nth-child(n+3) {
      display: none;
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
    transition: max-width 0.3s ease;
  }
  /* Wider container when vines are present */
  .full-preview-container.has-vines {
    max-width: 1400px;
  }
  .vine-count {
    font-weight: 400;
    color: #7a9a7a;
    font-size: 0.75rem;
    margin-left: 0.5rem;
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
