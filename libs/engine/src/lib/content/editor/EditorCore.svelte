<script lang="ts">
	import Logo from "$lib/ui/components/ui/Logo.svelte";
	import CurioAutocomplete from "../../components/admin/CurioAutocomplete.svelte";

	interface Props {
		content?: string;
		editorMode: "write" | "split" | "preview";
		readonly: boolean;
		previewHtml: string;
		lineNumbers: number[];
		cursorLine: number;
		configuredCurios: { slug: string; name: string; enabled: boolean }[];
		textareaRef: HTMLTextAreaElement | null;
		previewRef: HTMLElement | null;
		lineNumbersRef: HTMLElement | null;
		onInput: () => void;
		onClick: () => void;
		onKeyup: () => void;
		onKeydown: (e: KeyboardEvent) => void;
		onScroll: () => void;
		onPaste: (e: ClipboardEvent) => void;
		// Curio autocomplete
		showCurioAutocomplete: boolean;
		curioQuery: string;
		curioAutocompletePos: { top: number; left: number };
		curioAutocompleteRef: { handleKey: (e: KeyboardEvent) => boolean } | null;
		onCurioSelect: (directiveText: string, cursorOffset: number, id: string) => void;
		onCurioClose: () => void;
	}

	let {
		content = $bindable(""),
		editorMode,
		readonly,
		previewHtml,
		lineNumbers,
		cursorLine,
		configuredCurios,
		textareaRef = $bindable(null),
		previewRef = $bindable(null),
		lineNumbersRef = $bindable(null),
		onInput,
		onClick,
		onKeyup,
		onKeydown,
		onScroll,
		onPaste,
		showCurioAutocomplete,
		curioQuery,
		curioAutocompletePos,
		curioAutocompleteRef = $bindable(null),
		onCurioSelect,
		onCurioClose,
	}: Props = $props();
</script>

<!-- Editor Area -->
<div
	class="editor-area"
	class:split={editorMode === "split"}
	class:preview-only={editorMode === "preview"}
>
	<!-- Editor Panel (hidden via CSS in preview mode to preserve scroll position & cursor) -->
	<div class="editor-panel" class:editor-panel-hidden={editorMode === "preview"}>
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
				oninput={onInput}
				onclick={onClick}
				onkeyup={onKeyup}
				onkeydown={onKeydown}
				onscroll={onScroll}
				onpaste={onPaste}
				placeholder="Start writing your bloom... (Drag & drop or paste images)"
				spellcheck="true"
				disabled={readonly}
				class="editor-textarea"
			></textarea>
		</div>
	</div>

	<!-- Preview Panel (shown in split and preview modes) -->
	{#if editorMode === "split" || editorMode === "preview"}
		<div class="preview-panel" class:full-width={editorMode === "preview"}>
			<div class="preview-header">
				<span class="preview-label"
					>:: {editorMode === "preview" ? "preview (read-only)" : "live preview"}</span
				>
				<Logo class="preview-logo" />
			</div>
			<div class="preview-content" bind:this={previewRef}>
				{#if previewHtml}
					{#key previewHtml}
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized highlighted code -->
						<div class="rendered-content">{@html previewHtml}</div>
					{/key}
				{:else}
					<p class="preview-placeholder">
						{editorMode === "preview"
							? "No content to preview..."
							: "Start typing to see your rendered markdown..."}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Curio Autocomplete (rendered at editor-container level to avoid overflow:hidden clipping) -->
{#if showCurioAutocomplete}
	<CurioAutocomplete
		bind:this={curioAutocompleteRef}
		query={curioQuery}
		{configuredCurios}
		position={curioAutocompletePos}
		onselect={onCurioSelect}
		onclose={onCurioClose}
	/>
{/if}

<style>
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
	.editor-area.preview-only {
		background: var(--editor-bg, #1e1e1e); /* accent-ok — editor theme token fallback */
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
	.editor-panel-hidden {
		display: none;
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
		color: var(--editor-accent, #8bc48b); /* accent-ok — editor theme token fallback */
		background: color-mix(in srgb, var(--editor-accent, #8bc48b) 10%, transparent); /* accent-ok — editor theme token fallback */
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
		background: var(--color-surface);
		min-height: 0;
	}
	.preview-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background: var(--color-surface-elevated);
		border-bottom: 1px solid var(--light-border-primary);
	}
	.preview-label {
		color: var(--grove-accent);
		font-size: 0.85rem;
		font-family: "JetBrains Mono", "Fira Code", monospace;
	}
	:global(.preview-logo) {
		width: 18px;
		height: 18px;
		color: var(--editor-accent, #8bc48b); /* accent-ok — editor theme token fallback */
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
		color: var(--color-foreground);
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
		font-size: 0.95rem;
		line-height: 1.7;
	}
	.preview-placeholder {
		color: var(--color-foreground-faint);
		font-style: italic;
	}
	.preview-content :global(h1),
	.preview-content :global(h2),
	.preview-content :global(h3),
	.preview-content :global(h4),
	.preview-content :global(h5),
	.preview-content :global(h6) {
		color: var(--grove-accent);
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
		color: var(--grove-accent-dark);
		text-decoration: underline;
	}
	.preview-content :global(code) {
		background: var(--light-bg-primary);
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		font-family: inherit;
		font-size: 0.9em;
		color: var(--color-accent-text);
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
		color: var(--color-foreground);
	}
	.preview-content :global(blockquote) {
		border-left: 3px solid var(--grove-accent-dark);
		margin: 1rem 0;
		padding-left: 1rem;
		color: var(--color-foreground-muted);
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
	@media (max-width: 600px) {
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
</style>
