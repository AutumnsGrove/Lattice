<script lang="ts">
	// FontUploader.svelte
	// Custom font upload component (Evergreen tier)

	import type { CustomFont, ValidationResult } from "../types.js";

	interface Props {
		tenantId: string;
		existingFonts?: CustomFont[];
		maxFonts?: number;
		maxSize?: number;
		onUpload?: (font: CustomFont) => void;
		onDelete?: (fontId: string) => void;
		onError?: (error: string) => void;
	}

	let {
		tenantId,
		existingFonts = [],
		maxFonts = 10,
		maxSize = 512000,
		onUpload,
		onDelete,
		onError,
	}: Props = $props();

	// WOFF2 magic bytes signature: 'wOF2' (0x774F4632)
	const WOFF2_SIGNATURE = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);

	// Local state
	let isDragging = $state(false);
	let isValidating = $state(false);
	let selectedFile = $state<File | null>(null);
	let validationResult = $state<ValidationResult | null>(null);
	let previewFontFamily = $state<string | null>(null);
	let fileInput: HTMLInputElement;

	// Derived state
	let fontCount = $derived(existingFonts.length);
	let canUpload = $derived(fontCount < maxFonts);
	let maxSizeKB = $derived((maxSize / 1024).toFixed(0));
	let hasErrors = $derived(validationResult !== null && !validationResult.valid);
	let isValid = $derived(validationResult !== null && validationResult.valid);

	/**
	 * Validate WOFF2 magic bytes
	 */
	async function validateWoff2MagicBytes(file: File): Promise<ValidationResult> {
		return new Promise((resolve) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				const arrayBuffer = e.target?.result as ArrayBuffer;
				if (!arrayBuffer) {
					resolve({ valid: false, error: "Failed to read file" });
					return;
				}

				// Check file size
				if (arrayBuffer.byteLength > maxSize) {
					resolve({
						valid: false,
						error: `File exceeds maximum size of ${maxSizeKB}KB (current: ${(arrayBuffer.byteLength / 1024).toFixed(1)}KB)`,
					});
					return;
				}

				// Check minimum size (WOFF2 header is at least 48 bytes)
				if (arrayBuffer.byteLength < 48) {
					resolve({ valid: false, error: "File is too small to be a valid WOFF2 font" });
					return;
				}

				// Check magic bytes
				const header = new Uint8Array(arrayBuffer.slice(0, 4));
				const isWoff2 = header.every((byte, i) => byte === WOFF2_SIGNATURE[i]);

				if (!isWoff2) {
					resolve({
						valid: false,
						error: "Invalid WOFF2 file format. Only WOFF2 fonts are supported.",
					});
					return;
				}

				resolve({ valid: true });
			};

			reader.onerror = () => {
				resolve({ valid: false, error: "Failed to read file" });
			};

			reader.readAsArrayBuffer(file);
		});
	}

	/**
	 * Handle file selection
	 */
	async function handleFileSelect(file: File) {
		// Check font limit
		if (!canUpload) {
			validationResult = {
				valid: false,
				error: `Maximum of ${maxFonts} fonts allowed per account`,
			};
			onError?.(validationResult.error);
			return;
		}

		// Check file extension
		if (!file.name.toLowerCase().endsWith(".woff2")) {
			validationResult = {
				valid: false,
				error: "Only .woff2 files are supported",
			};
			onError?.(validationResult.error);
			return;
		}

		selectedFile = file;
		isValidating = true;
		validationResult = null;
		previewFontFamily = null;

		// Validate file
		const result = await validateWoff2MagicBytes(file);
		validationResult = result;
		isValidating = false;

		if (result.valid) {
			// Create preview font face
			createFontPreview(file);
		} else {
			onError?.(result.error || "Validation failed");
		}
	}

	/**
	 * Create font preview by loading the font
	 */
	function createFontPreview(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const arrayBuffer = e.target?.result as ArrayBuffer;
			if (!arrayBuffer) return;

			// Create a unique font family name for preview
			const fontFamily = `preview-${file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-")}`;
			previewFontFamily = fontFamily;

			// Create blob URL for the font
			const blob = new Blob([arrayBuffer], { type: "font/woff2" });
			const url = URL.createObjectURL(blob);

			// Create @font-face rule
			const style = document.createElement("style");
			style.textContent = `
				@font-face {
					font-family: '${fontFamily}';
					src: url('${url}') format('woff2');
					font-display: swap;
				}
			`;
			document.head.appendChild(style);

			// Clean up blob URL after font loads
			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 5000);
		};
		reader.readAsArrayBuffer(file);
	}

	/**
	 * Handle drag events
	 */
	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	/**
	 * Handle file input change
	 */
	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	/**
	 * Trigger file input click
	 */
	function openFileDialog() {
		fileInput?.click();
	}

	/**
	 * Upload the validated font
	 */
	function uploadFont() {
		if (!selectedFile || !isValid) return;

		// Extract font name from filename
		const fileName = selectedFile.name.replace(/\.woff2$/i, "");
		const sanitizedName = fileName.replace(/[^a-zA-Z0-9\s-]/g, "").trim();

		// Create CustomFont object
		const customFont: CustomFont = {
			id: crypto.randomUUID(),
			tenantId,
			name: fileName,
			family: sanitizedName || "Custom Font",
			category: "sans-serif", // Default category - could be made selectable
			woff2Path: "", // Will be set by backend after R2 upload
			fileSize: selectedFile.size,
		};

		onUpload?.(customFont);

		// Reset state
		selectedFile = null;
		validationResult = null;
		previewFontFamily = null;
		if (fileInput) fileInput.value = "";
	}

	/**
	 * Clear selected file
	 */
	function clearSelection() {
		selectedFile = null;
		validationResult = null;
		previewFontFamily = null;
		if (fileInput) fileInput.value = "";
	}

	/**
	 * Handle delete font
	 */
	function handleDelete(fontId: string) {
		onDelete?.(fontId);
	}

	/**
	 * Format file size
	 */
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="font-uploader">
	<div class="uploader-header">
		<h3 class="uploader-title">Custom Fonts</h3>
		<div class="font-count">
			<span class="count-value" class:at-limit={!canUpload}>{fontCount}</span>
			<span class="count-separator">/</span>
			<span class="count-max">{maxFonts}</span>
		</div>
	</div>

	<div class="uploader-info">
		<p class="info-text">
			Upload custom WOFF2 fonts to use in your theme. Maximum {maxSizeKB}KB per file, up to
			{maxFonts} fonts total.
		</p>
	</div>

	<!-- Upload Zone -->
	{#if canUpload}
		<div
			class="upload-zone"
			class:dragging={isDragging}
			class:has-file={selectedFile !== null}
			ondragenter={handleDragEnter}
			ondragleave={handleDragLeave}
			ondragover={handleDragOver}
			ondrop={handleDrop}
			role="button"
			tabindex="0"
			aria-label="Upload font file"
			onclick={openFileDialog}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					openFileDialog();
				}
			}}
		>
			<input
				bind:this={fileInput}
				type="file"
				accept=".woff2"
				onchange={handleInputChange}
				class="file-input"
				aria-label="Font file input"
			/>

			<div class="upload-content">
				{#if isValidating}
					<div class="upload-icon validating">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 12a9 9 0 1 1-6.219-8.56" />
						</svg>
					</div>
					<p class="upload-text">Validating font file...</p>
				{:else if selectedFile}
					<div class="upload-icon" class:success={isValid} class:error={hasErrors}>
						{#if isValid}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
								<polyline points="22 4 12 14.01 9 11.01" />
							</svg>
						{:else}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="48"
								height="48"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="12" cy="12" r="10" />
								<line x1="15" y1="9" x2="9" y2="15" />
								<line x1="9" y1="9" x2="15" y2="15" />
							</svg>
						{/if}
					</div>
					<p class="upload-text">
						{selectedFile.name}
						<span class="file-size">({formatFileSize(selectedFile.size)})</span>
					</p>
				{:else}
					<div class="upload-icon">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
					</div>
					<p class="upload-text">Drop a WOFF2 font file here or click to browse</p>
					<p class="upload-hint">Maximum size: {maxSizeKB}KB</p>
				{/if}
			</div>
		</div>
	{:else}
		<div class="upload-zone disabled">
			<div class="upload-content">
				<div class="upload-icon disabled">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
					</svg>
				</div>
				<p class="upload-text">Font limit reached</p>
				<p class="upload-hint">Delete existing fonts to upload new ones</p>
			</div>
		</div>
	{/if}

	<!-- Validation Results -->
	{#if validationResult && !validationResult.valid}
		<div class="validation-section error" role="alert">
			<div class="validation-title">Validation Error</div>
			<p class="validation-message">{validationResult.error}</p>
		</div>
	{/if}

	{#if validationResult && validationResult.valid && validationResult.warnings && validationResult.warnings.length > 0}
		<div class="validation-section warning" role="status">
			<div class="validation-title">Warnings</div>
			<ul class="validation-list">
				{#each validationResult.warnings as warning}
					<li>{warning}</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if isValid && selectedFile}
		<div class="validation-section success" role="status">
			<div class="validation-title">Font validated successfully</div>

			<!-- Font Preview -->
			{#if previewFontFamily}
				<div class="font-preview">
					<p class="preview-label">Preview:</p>
					<p class="preview-text" style="font-family: '{previewFontFamily}', sans-serif;">
						The quick brown fox jumps over the lazy dog
					</p>
					<p class="preview-text-small" style="font-family: '{previewFontFamily}', sans-serif;">
						ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
					</p>
				</div>
			{/if}

			<div class="upload-actions">
				<button type="button" class="action-button primary" onclick={uploadFont}>
					Upload Font
				</button>
				<button type="button" class="action-button secondary" onclick={clearSelection}>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<!-- Existing Fonts List -->
	{#if existingFonts.length > 0}
		<div class="existing-fonts">
			<h4 class="section-title">Uploaded Fonts</h4>
			<ul class="fonts-list" role="list">
				{#each existingFonts as font (font.id)}
					<li class="font-item">
						<div class="font-info">
							<div class="font-name">{font.name}</div>
							<div class="font-meta">
								<span class="font-family">{font.family}</span>
								<span class="font-separator">•</span>
								<span class="font-size">{formatFileSize(font.fileSize)}</span>
								<span class="font-separator">•</span>
								<span class="font-category">{font.category}</span>
							</div>
						</div>
						<button
							type="button"
							class="delete-button"
							onclick={() => handleDelete(font.id)}
							aria-label="Delete {font.name}"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<polyline points="3 6 5 6 21 6" />
								<path
									d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
								/>
								<line x1="10" y1="11" x2="10" y2="17" />
								<line x1="14" y1="11" x2="14" y2="17" />
							</svg>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.font-uploader {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	/* Header */
	.uploader-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.uploader-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.font-count {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 1rem;
	}

	.count-value {
		font-weight: 700;
		color: var(--color-accent, #16a34a);
	}

	.count-value.at-limit {
		color: #dc2626;
	}

	.count-separator {
		color: var(--color-foreground-muted, #666);
	}

	.count-max {
		color: var(--color-foreground-muted, #666);
		font-weight: 500;
	}

	/* Info */
	.uploader-info {
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border-left: 3px solid var(--color-accent, #16a34a);
		border-radius: 0.25rem;
	}

	.info-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.5;
	}

	/* Upload Zone */
	.upload-zone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 12rem;
		padding: 2rem;
		background: var(--color-surface, #fff);
		border: 2px dashed var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.upload-zone:not(.disabled):hover {
		border-color: var(--color-accent, #16a34a);
		background: var(--color-background, #fefdfb);
	}

	.upload-zone:not(.disabled):focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.upload-zone.dragging {
		border-color: var(--color-accent, #16a34a);
		background: color-mix(in srgb, var(--color-accent, #16a34a) 5%, var(--color-surface, #fff));
		border-style: solid;
	}

	.upload-zone.has-file {
		border-style: solid;
	}

	.upload-zone.disabled {
		cursor: not-allowed;
		opacity: 0.6;
		background: var(--color-background, #fefdfb);
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.upload-icon {
		color: var(--color-foreground-muted, #666);
	}

	.upload-icon.validating {
		color: var(--color-accent, #16a34a);
		animation: spin 1s linear infinite;
	}

	.upload-icon.success {
		color: #16a34a;
	}

	.upload-icon.error {
		color: #dc2626;
	}

	.upload-icon.disabled {
		color: var(--color-border, #e5e5e5);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.upload-text {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
	}

	.file-size {
		color: var(--color-foreground-muted, #666);
		font-weight: 400;
		font-size: 0.875rem;
	}

	.upload-hint {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Validation Sections */
	.validation-section {
		padding: 0.75rem;
		border-radius: 0.375rem;
		border-left: 3px solid;
	}

	.validation-section.error {
		background: #fee2e2;
		border-color: #dc2626;
	}

	.validation-section.warning {
		background: #ffedd5;
		border-color: #ea580c;
	}

	.validation-section.success {
		background: #dcfce7;
		border-color: #16a34a;
	}

	.validation-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.validation-section.error .validation-title {
		color: #991b1b;
	}

	.validation-section.warning .validation-title {
		color: #9a3412;
	}

	.validation-section.success .validation-title {
		color: #166534;
	}

	.validation-message {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.validation-section.error .validation-message {
		color: #991b1b;
	}

	.validation-list {
		margin: 0;
		padding-left: 1.25rem;
		list-style: disc;
	}

	.validation-list li {
		font-size: 0.875rem;
		line-height: 1.5;
		color: #9a3412;
		margin-bottom: 0.25rem;
	}

	.validation-list li:last-child {
		margin-bottom: 0;
	}

	/* Font Preview */
	.font-preview {
		margin-top: 0.75rem;
		padding: 1rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
	}

	.preview-label {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #166534;
	}

	.preview-text {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-foreground, #111);
	}

	.preview-text-small {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-foreground-muted, #666);
	}

	/* Actions */
	.upload-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.action-button {
		padding: 0.625rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid;
	}

	.action-button.primary {
		background: var(--color-accent, #16a34a);
		border-color: var(--color-accent, #16a34a);
		color: white;
	}

	.action-button.primary:hover {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 90%, black);
		border-color: color-mix(in srgb, var(--color-accent, #16a34a) 90%, black);
	}

	.action-button.primary:focus {
		outline: none;
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.action-button.secondary {
		background: var(--color-surface, #fff);
		border-color: var(--color-border, #e5e5e5);
		color: var(--color-foreground, #111);
	}

	.action-button.secondary:hover {
		background: var(--color-background, #fefdfb);
		border-color: var(--color-foreground-muted, #666);
	}

	.action-button.secondary:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	/* Existing Fonts */
	.existing-fonts {
		margin-top: 0.5rem;
	}

	.section-title {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.fonts-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.font-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.font-item:hover {
		border-color: var(--color-foreground-muted, #666);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.font-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.font-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.font-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
	}

	.font-family {
		font-family: var(--font-mono, ui-monospace, monospace);
	}

	.font-separator {
		color: var(--color-border, #e5e5e5);
	}

	.delete-button {
		padding: 0.5rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-button:hover {
		background: #fee2e2;
		border-color: #fecaca;
		color: #dc2626;
	}

	.delete-button:focus {
		outline: none;
		border-color: #dc2626;
		box-shadow: 0 0 0 2px color-mix(in srgb, #dc2626 20%, transparent);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.font-uploader {
			gap: 0.875rem;
		}

		.upload-zone {
			min-height: 10rem;
			padding: 1.5rem;
		}

		.upload-icon svg {
			width: 40px;
			height: 40px;
		}

		.upload-text {
			font-size: 0.9375rem;
		}

		.upload-actions {
			flex-direction: column;
		}

		.action-button {
			width: 100%;
		}

		.font-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.delete-button {
			align-self: flex-end;
		}
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.upload-zone {
			background: var(--color-surface, #1a1a1a);
		}

		.upload-zone:not(.disabled):hover {
			background: var(--color-background, #0a0a0a);
		}

		.font-preview {
			background: var(--color-background, #0a0a0a);
		}

		.font-item {
			background: var(--color-surface, #1a1a1a);
		}

		.delete-button:hover {
			background: color-mix(in srgb, #dc2626 15%, transparent);
		}
	}
</style>
