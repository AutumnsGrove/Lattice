<script lang="ts">
	import MarkdownIt from "markdown-it";
	import { suppressHeadingPlugin, SUPPRESS_MARKER } from "$lib/content/markdown/suppress";
	import { tick, untrack } from "svelte";

	// Local instance for admin editor preview
	const editorMd = new MarkdownIt({ html: false, linkify: true });
	import { extractHeaders } from "$lib/content/markdown/markdown";
	import {
		groveDirectivePlugin,
		serializeGallery,
		type GalleryItem,
	} from "@autumnsgrove/grove-markdown/directives";
	editorMd.use(groveDirectivePlugin);
	editorMd.use(suppressHeadingPlugin);
	import "$lib/styles/content.css";
	import { toast } from "$lib/ui/components/ui/toast";
	import PhotoPicker from "../../components/admin/PhotoPicker.svelte";
	import GalleryBuilder from "../../components/admin/GalleryBuilder.svelte";
	import { findGalleryBlock } from "./gallery-block";
	import { browser } from "$app/environment";
	import { useEditorTheme, useDraftManager, type StoredDraft } from "./composables";
	import FormattingToolbar from "./FormattingToolbar.svelte";
	import EditorCore from "./EditorCore.svelte";
	import FullPreviewModal from "./FullPreviewModal.svelte";
	import type { MarkdownEditorProps } from "./markdown-editor.types.js";
	import { useImageUpload } from "./useImageUpload.svelte.js";

	interface Props extends MarkdownEditorProps {}

	// Props
	let {
		content = $bindable(""),
		onSave = () => {},
		saving = false,
		readonly = false,
		draftKey = null,
		onDraftRestored = () => {},
		previewTitle = $bindable(""),
		previewDate = "",
		previewTags = [],
		gutterItems = [],
		flags = {},
		configuredCurios = [],
		serverDraftSlug = null,
	}: Props = $props();

	// Derived flags
	const uploadsEnabled = $derived(flags?.image_uploads ?? true);

	// Core refs and state
	let textareaRef: HTMLTextAreaElement | null = $state(null);
	let previewRef: HTMLElement | null = $state(null);
	let lineNumbersRef: HTMLElement | null = $state(null);

	// Editor mode
	let editorMode: "write" | "split" | "preview" = $state(
		(() => {
			if (browser) {
				const saved = localStorage.getItem("editor-mode");
				if (saved === "write" || saved === "split" || saved === "preview") {
					return saved;
				}
			}
			return "write";
		})(),
	);

	let cursorLine = $state(1);
	let cursorCol = $state(1);
	let isUpdating = $state(false);
	let isProgrammaticUpdate = $state(false);

	// Full preview mode
	let showFullPreview = $state(false);

	// Photo picker
	let showPhotoPicker = $state(false);

	// Gallery builder (null while closed). `range` is the existing gallery being
	// edited; when it is null the finished gallery is inserted at `insertAt`.
	let galleryBuilder = $state<{
		items: GalleryItem[];
		range: { from: number; to: number } | null;
		insertAt: number;
		startWithPicker: boolean;
	} | null>(null);

	// Curio autocomplete state
	let showCurioAutocomplete = $state(false);
	let curioQuery = $state("");
	let curioAutocompletePos = $state({ top: 0, left: 0 });
	let curioTriggerStart = $state(0);
	let curioAutocompleteRef: { handleKey: (e: KeyboardEvent) => boolean } | null = $state(null);

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
	const editorTheme = useEditorTheme();

	// svelte-ignore state_referenced_locally
	const draftManager = useDraftManager({
		draftKey,
		getContent: () => content,
		setContent: (c: string) => (content = c),
		onDraftRestored,
		readonly,
		getMetadata: () => ({ title: previewTitle }),
		serverSlug: serverDraftSlug,
	});

	// Debounced preview HTML
	let debouncedContent = $state(content);
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let isMounted: boolean = true;

	$effect(() => {
		isMounted = true;
		if (debounceTimer) clearTimeout(debounceTimer);
		const currentContent = content;
		debounceTimer = setTimeout(() => {
			if (isMounted) {
				debouncedContent = currentContent;
			}
		}, 150);
		return () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			isMounted = false;
		};
	});

	// Computed values
	let wordCount = $derived(content.trim() ? content.trim().split(/\s+/).length : 0);
	let charCount = $derived(content.length);
	let lineCount = $derived(content.split("\n").length);
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
		const anchors: string[] = [];
		const headingRegex = /^(#{1,6})\s+(.+)$/gm;
		let match;
		while ((match = headingRegex.exec(content)) !== null) {
			// Skip headings the author marked with ::suppress::. They still
			// render as visual headings but intentionally don't appear in
			// the TOC, and it would be confusing to offer them as anchor
			// targets in the vine picker either.
			if (match[0].includes(SUPPRESS_MARKER)) continue;
			anchors.push(match[0].trim());
		}
		const anchorRegex = /<!--\s*anchor:([\w-]+)\s*-->/g;
		while ((match = anchorRegex.exec(content)) !== null) {
			anchors.push(`anchor:${match[1]}`);
		}
		return anchors;
	});

	// Extract top-level paragraph previews for the gutter anchor picker.
	// Uses the rendered preview so counting matches findAnchorElement's
	// runtime rule (`:scope > p` — direct child paragraphs only, 1-indexed).
	// Paragraphs inside blockquotes, lists, etc. are excluded on both sides.
	let availableParagraphs = $derived.by(() => {
		if (typeof DOMParser === "undefined" || !previewHtml) return [];
		const doc = new DOMParser().parseFromString(previewHtml, "text/html");
		const paragraphs = doc.body.querySelectorAll(":scope > p");
		return Array.from(paragraphs).map((p, i) => ({
			index: i + 1,
			preview: (p.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
		}));
	});

	// Public exports (API must not change)
	export function getAvailableAnchors() {
		return availableAnchors;
	}

	export function getAvailableParagraphs() {
		return availableParagraphs;
	}

	export function insertAnchor(name: string) {
		insertAtCursor(`<!-- anchor:${name} -->\n`);
	}

	export function clearDraft() {
		draftManager.clearDraft();
	}

	export function flushDraft() {
		draftManager.flushSave();
	}

	export function getDraftStatus() {
		return draftManager.getStatus();
	}

	// Cursor position tracking
	function updateCursorPosition() {
		if (!textareaRef || isProgrammaticUpdate) return;
		const pos = textareaRef.selectionStart;
		const textBefore = content.substring(0, pos);
		const lines = textBefore.split("\n");
		cursorLine = lines.length;
		cursorCol = lines[lines.length - 1].length + 1;
	}

	// Curio autocomplete
	function checkCurioTrigger() {
		if (!textareaRef || isProgrammaticUpdate) return;
		const pos = textareaRef.selectionStart;
		const textBefore = content.substring(0, pos);

		const lastTrigger = textBefore.lastIndexOf("::");
		if (lastTrigger === -1) {
			if (showCurioAutocomplete) showCurioAutocomplete = false;
			return;
		}

		const afterTrigger = textBefore.substring(lastTrigger + 2);

		if (afterTrigger.includes("::")) {
			if (showCurioAutocomplete) showCurioAutocomplete = false;
			return;
		}

		if (afterTrigger && !/^\w*$/.test(afterTrigger)) {
			if (showCurioAutocomplete) showCurioAutocomplete = false;
			return;
		}

		if (lastTrigger > 0) {
			const charBefore = textBefore[lastTrigger - 1];
			if (charBefore !== "\n" && charBefore !== " " && charBefore !== "\t") {
				if (showCurioAutocomplete) showCurioAutocomplete = false;
				return;
			}
		}

		curioTriggerStart = lastTrigger;
		curioQuery = afterTrigger;

		if (textareaRef) {
			const textareaRect = textareaRef.getBoundingClientRect();
			const editorContainer = textareaRef.closest(".editor-container");
			const containerRect = editorContainer?.getBoundingClientRect() || textareaRect;

			const lineHeight = parseFloat(getComputedStyle(textareaRef).lineHeight) || 24;
			const textareaPadding = 16;

			const linesBeforeCursor = textBefore.split("\n");
			const currentLine = linesBeforeCursor.length;
			const currentCol = linesBeforeCursor[linesBeforeCursor.length - 1].length;

			const top =
				textareaRect.top - containerRect.top + currentLine * lineHeight - textareaRef.scrollTop + 4;

			const textareaLeftInContainer = textareaRect.left - containerRect.left;
			const charWidth = 8;
			const cursorLeft = textareaLeftInContainer + textareaPadding + currentCol * charWidth;
			const maxLeft = containerRect.width - 260;
			const left = Math.max(
				textareaLeftInContainer + textareaPadding,
				Math.min(cursorLeft, maxLeft),
			);

			curioAutocompletePos = { top, left };
		}

		showCurioAutocomplete = true;
	}

	async function handleCurioSelect(directiveText: string, cursorOffset: number, id: string) {
		if (!textareaRef) return;
		isUpdating = true;
		isProgrammaticUpdate = true;

		if (id === "gallery") {
			// Galleries are built, not typed: drop the "::gallery" text that opened the
			// menu and open the builder, which starts at the photo picker.
			const pos = textareaRef.selectionStart;
			content = content.substring(0, curioTriggerStart) + content.substring(pos);
			showCurioAutocomplete = false;
			await tick();
			isProgrammaticUpdate = false;
			isUpdating = false;
			galleryBuilder = {
				items: [],
				range: null,
				insertAt: curioTriggerStart,
				startWithPicker: true,
			};
			return;
		}

		const pos = textareaRef.selectionStart;
		const before = content.substring(0, curioTriggerStart);
		const after = content.substring(pos);
		content = before + directiveText + after;

		showCurioAutocomplete = false;

		await tick();

		const newCursorPos = curioTriggerStart + cursorOffset;
		textareaRef.selectionStart = textareaRef.selectionEnd = newCursorPos;
		textareaRef.focus();

		isProgrammaticUpdate = false;
		isUpdating = false;
	}

	function closeCurioAutocomplete() {
		showCurioAutocomplete = false;
	}

	// Keyboard handlers
	function handleKeydown(e: KeyboardEvent) {
		if (showCurioAutocomplete && curioAutocompleteRef) {
			const handled = curioAutocompleteRef.handleKey(e);
			if (handled) {
				e.preventDefault();
				return;
			}
		}

		if (e.key === "Escape") {
			if (showCurioAutocomplete) {
				showCurioAutocomplete = false;
				e.preventDefault();
				return;
			}
			if (isZenMode) {
				isZenMode = false;
				return;
			}
		}

		if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
			e.preventDefault();
			toggleZenMode();
		}

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

		if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			onSave();
		}

		if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			wrapSelection("**", "**");
		}

		if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			wrapSelection("_", "_");
		}

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

		if (e.key === "p" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
			e.preventDefault();
			cycleEditorMode();
		}
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			if (showCurioAutocomplete) {
				showCurioAutocomplete = false;
				e.preventDefault();
				return;
			}
			if (showPhotoPicker) {
				showPhotoPicker = false;
				e.preventDefault();
				return;
			}
			if (isZenMode) {
				isZenMode = false;
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

	// Editor mode switching
	function setEditorMode(mode: "write" | "split" | "preview") {
		editorMode = mode;
		if (browser) {
			localStorage.setItem("editor-mode", mode);
		}
		if (mode !== "preview" && textareaRef) {
			setTimeout(() => textareaRef?.focus({ preventScroll: true }), 50);
		}
	}

	function cycleEditorMode() {
		const modes = ["write", "split", "preview"] as const;
		const currentIndex = modes.indexOf(editorMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		setEditorMode(modes[nextIndex]);
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
	async function wrapSelection(before: string, after: string) {
		if (!textareaRef || isUpdating) return;
		isUpdating = true;
		isProgrammaticUpdate = true;

		const start = textareaRef.selectionStart;
		const end = textareaRef.selectionEnd;
		const selectedText = content.substring(start, end);
		content = content.substring(0, start) + before + selectedText + after + content.substring(end);

		await tick();

		textareaRef.selectionStart = start + before.length;
		textareaRef.selectionEnd = end + before.length;
		textareaRef.focus();

		isProgrammaticUpdate = false;
		isUpdating = false;
	}

	async function insertAtCursor(text: string) {
		if (!textareaRef || isUpdating) return;
		isUpdating = true;
		isProgrammaticUpdate = true;

		const start = textareaRef.selectionStart;
		content = content.substring(0, start) + text + content.substring(start);

		await tick();

		textareaRef.selectionStart = textareaRef.selectionEnd = start + text.length;
		textareaRef.focus();

		isProgrammaticUpdate = false;
		isUpdating = false;
	}

	/** Replace content[from, to) with text, leaving the cursor just after it. */
	async function replaceRange(from: number, to: number, text: string) {
		if (!textareaRef || isUpdating) return;
		isUpdating = true;
		isProgrammaticUpdate = true;

		content = content.substring(0, from) + text + content.substring(to);

		await tick();

		textareaRef.selectionStart = textareaRef.selectionEnd = from + text.length;
		textareaRef.focus();

		isProgrammaticUpdate = false;
		isUpdating = false;
	}

	// Toolbar actions
	function insertHeading(level: number) {
		insertAtCursor("#".repeat(level) + " ");
	}

	function insertLink() {
		wrapSelection("[", "](url)");
	}

	function insertFootnote() {
		// Count existing footnotes to auto-increment the number
		const footnoteMatches = content.match(/\[\^(\d+)\]/g) || [];
		const existingNumbers = footnoteMatches.map((m) => parseInt(m.match(/\d+/)?.[0] || "0"));
		const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

		// Insert the reference at cursor
		insertAtCursor(`[^${nextNumber}]`);

		// Append the definition at the end of the document
		const definition = `\n\n[^${nextNumber}]: `;
		content = content + definition;
	}

	// Image upload composable
	const imageUpload = useImageUpload({
		uploadsEnabled: () => uploadsEnabled,
		readonly: () => readonly,
		insertAtCursor,
	});

	function handlePhotoInsert(urls: string[]) {
		showPhotoPicker = false;
		if (urls.length === 0) return;
		if (urls.length === 1) {
			insertAtCursor(`![Photo](${urls[0]})\n`);
		} else {
			// Two or more become a gallery. The builder collects alt text and
			// captions and writes the directive, so nobody types its syntax.
			galleryBuilder = {
				items: urls.map((url) => ({ url, alt: "", caption: "" })),
				range: null,
				insertAt: textareaRef?.selectionStart ?? content.length,
				startWithPicker: false,
			};
		}
	}

	/** The toolbar photo button: reopen the gallery the cursor is in, otherwise pick photos. */
	function handleShowPhotoPicker() {
		const found = textareaRef ? findGalleryBlock(content, textareaRef.selectionStart) : null;
		if (found) {
			galleryBuilder = {
				items: found.items,
				range: { from: found.from, to: found.to },
				insertAt: found.from,
				startWithPicker: false,
			};
			return;
		}
		showPhotoPicker = true;
	}

	async function saveGallery(items: GalleryItem[]) {
		const builder = galleryBuilder;
		galleryBuilder = null;
		if (!builder) return;

		const block = serializeGallery(items);
		if (builder.range) {
			await replaceRange(builder.range.from, builder.range.to, block);
			return;
		}

		// A new gallery starts on its own line
		const at = Math.min(builder.insertAt, content.length);
		const lead = at > 0 && content[at - 1] !== "\n" ? "\n" : "";
		await replaceRange(at, at, `${lead}${block}\n`);
	}

	// Scroll sync
	function handleScroll() {
		syncLineNumbersScroll();
		if (showCurioAutocomplete) showCurioAutocomplete = false;
		if (textareaRef && previewRef && editorMode !== "write") {
			const scrollRatio =
				textareaRef.scrollTop / (textareaRef.scrollHeight - textareaRef.clientHeight);
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
	// Skipped while an unresolved restore prompt is showing — otherwise typing
	// before clicking [restore]/[discard] silently overwrites the one
	// recoverable copy with in-progress content nobody's confirmed yet.
	$effect(() => {
		if (draftKey && !readonly && !draftManager.draftRestorePrompt) {
			draftManager.scheduleSave(content);
		}
	});

	// Draft lifecycle
	function handleBeforeUnload() {
		draftManager.flushSave();
	}

	function handleVisibilityChange() {
		if (document.visibilityState === "hidden") {
			draftManager.flushSave();
		}
	}

	// Initialize editor on mount
	$effect(() => {
		editorTheme.loadTheme();
		draftManager.init(untrack(() => content));

		window.addEventListener("beforeunload", handleBeforeUnload);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			draftManager.cleanup();
		};
	});
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div
	class="editor-container"
	class:dragging={imageUpload.isDragging}
	class:zen-mode={isZenMode}
	aria-label="Markdown editor with live preview"
	role="application"
	ondragenter={imageUpload.handleDragEnter}
	ondragover={imageUpload.handleDragOver}
	ondragleave={imageUpload.handleDragLeave}
	ondrop={imageUpload.handleDrop}
>
	<!-- Drag overlay -->
	{#if imageUpload.isDragging}
		<div class="drag-overlay">
			<div class="drag-overlay-content">
				<span class="drag-icon">+</span>
				<span class="drag-text">Drop image to upload</span>
			</div>
		</div>
	{/if}

	<!-- Upload status -->
	{#if imageUpload.isUploading || imageUpload.uploadError}
		<div class="upload-status" class:error={imageUpload.uploadError}>
			{#if imageUpload.isUploading}
				<span class="upload-spinner"></span>
				<span>{imageUpload.uploadProgress}</span>
			{:else if imageUpload.uploadError}
				<span class="upload-error-icon">!</span>
				<span>{imageUpload.uploadError}</span>
				{#if imageUpload.lastFailedFile}
					<button type="button" class="retry-btn" onclick={imageUpload.retryUpload}>[retry]</button>
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
					<button
						type="button"
						class="draft-btn restore"
						onclick={() => draftManager.restoreDraft()}
					>
						[<span class="key">r</span>estore]
					</button>
					<button
						type="button"
						class="draft-btn discard"
						onclick={() => draftManager.discardDraft()}
					>
						[<span class="key">d</span>iscard]
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Formatting Toolbar + Status Bar -->
	<FormattingToolbar
		{editorMode}
		readonly={readonly || draftManager.draftRestorePrompt}
		{isZenMode}
		{saving}
		{draftKey}
		draftSaveStatus={draftManager.saveStatus}
		draftHasUnsavedChanges={draftManager.hasUnsavedChanges(content)}
		{serverDraftSlug}
		serverSyncStatus={draftManager.serverSyncStatus}
		{cursorLine}
		{cursorCol}
		{lineCount}
		{wordCount}
		{readingTime}
		onWrapSelection={wrapSelection}
		onInsertLink={insertLink}
		onInsertFootnote={insertFootnote}
		onInsertHeading={insertHeading}
		onShowPhotoPicker={handleShowPhotoPicker}
		onSetEditorMode={setEditorMode}
		onShowFullPreview={() => (showFullPreview = true)}
		onToggleZenMode={toggleZenMode}
	/>

	<!-- Editor Core (textarea, line numbers, preview panels, curio autocomplete) -->
	<EditorCore
		bind:content
		{editorMode}
		readonly={readonly || draftManager.draftRestorePrompt}
		{previewHtml}
		{lineNumbers}
		{cursorLine}
		{configuredCurios}
		bind:textareaRef
		bind:previewRef
		bind:lineNumbersRef
		bind:curioAutocompleteRef
		onInput={() => {
			updateCursorPosition();
			checkCurioTrigger();
		}}
		onClick={() => {
			updateCursorPosition();
			if (showCurioAutocomplete) checkCurioTrigger();
		}}
		onKeyup={updateCursorPosition}
		onKeydown={handleKeydown}
		onScroll={handleScroll}
		onPaste={imageUpload.handlePaste}
		{showCurioAutocomplete}
		{curioQuery}
		{curioAutocompletePos}
		onCurioSelect={handleCurioSelect}
		onCurioClose={closeCurioAutocomplete}
	/>
</div>

<!-- Photo Picker -->
{#if showPhotoPicker}
	<PhotoPicker
		onInsert={handlePhotoInsert}
		onClose={() => (showPhotoPicker = false)}
		galleryEnabled={uploadsEnabled}
	/>
{/if}

<!-- Gallery Builder -->
{#if galleryBuilder}
	<GalleryBuilder
		items={galleryBuilder.items}
		mode={galleryBuilder.range ? "edit" : "new"}
		photoLibraryEnabled={uploadsEnabled}
		startWithPicker={galleryBuilder.startWithPicker}
		onSave={saveGallery}
		onClose={() => (galleryBuilder = null)}
	/>
{/if}

<!-- Full Preview Modal -->
<FullPreviewModal
	show={showFullPreview}
	{previewHtml}
	{previewTitle}
	{previewDate}
	{previewTags}
	{previewHeaders}
	{gutterItems}
	onClose={() => (showFullPreview = false)}
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
		transition:
			border-color 0.3s ease,
			box-shadow 0.3s ease;
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
		background: var(--grove-accent-80);
		border: 1px solid var(--grove-accent-dark);
		border-radius: 6px;
		color: var(--grove-accent-light);
		font-size: 0.9rem;
		z-index: 99;
		box-shadow: var(--shadow-md);
	}
	.upload-status.error {
		background: var(--color-error-bg);
		border-color: var(--color-error-border);
		color: var(--color-error-text);
	}
	.upload-spinner {
		width: 18px;
		height: 18px;
		border: 2px solid var(--grove-accent-dark);
		border-top-color: var(--grove-accent-light);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.upload-error-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		background: var(--color-error);
		color: white;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: bold;
	}
	.retry-btn {
		background: transparent;
		border: none;
		color: var(--color-error-text);
		font-family: "JetBrains Mono", "Fira Code", monospace;
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0.1rem 0.3rem;
		transition: color 0.15s ease;
	}
	.retry-btn:hover {
		color: var(--color-error-text);
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.draft-prompt {
		background: var(--grove-accent-80);
		border-bottom: 1px solid var(--grove-accent-dark);
		padding: 0.5rem 0.75rem;
		flex-shrink: 0;
	}
	.draft-prompt-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.85rem;
	}
	.draft-icon {
		font-size: 1.25rem;
		color: var(--grove-accent);
		font-weight: bold;
	}
	.draft-message {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		color: var(--color-foreground);
		flex: 1;
	}
	.draft-message strong {
		color: var(--grove-accent-light);
	}
	.draft-time {
		font-size: 0.75rem;
		color: var(--color-foreground-subtle);
	}
	.draft-actions {
		display: flex;
		gap: 0.5rem;
	}
	.draft-btn {
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		min-width: 44px;
		border-radius: 0;
		font-size: 0.85rem;
		font-family: "JetBrains Mono", "Fira Code", monospace;
		cursor: pointer;
		transition: color 0.1s ease;
		background: transparent;
		border: none;
		-webkit-tap-highlight-color: rgba(139, 196, 139, 0.2);
		touch-action: manipulation;
	}
	.draft-btn.restore {
		color: var(--grove-accent);
	}
	.draft-btn.restore:hover {
		color: var(--grove-accent-light);
	}
	.draft-btn.discard {
		color: var(--color-foreground-muted);
	}
	.draft-btn.discard:hover {
		color: var(--color-foreground);
	}
	.key {
		color: var(--editor-accent, #8bc48b);
		font-weight: bold;
		text-decoration: underline;
	}
	.editor-container.zen-mode {
		position: fixed;
		inset: 0;
		z-index: 9999;
		border-radius: 0;
		border: none;
	}
	/* Zen mode toolbar/status bar fade — these target child components' root elements */
	.editor-container.zen-mode :global(.toolbar) {
		opacity: 0.3;
	}
	.editor-container.zen-mode :global(.toolbar:hover) {
		opacity: 1;
	}
	.editor-container.zen-mode :global(.status-bar) {
		opacity: 0.5;
	}
	.editor-container.zen-mode :global(.status-bar:hover) {
		opacity: 1;
	}
	.editor-container.zen-mode :global(.editor-area) {
		height: calc(100vh - 80px);
	}
</style>
