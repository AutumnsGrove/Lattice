<script>
	import { Button, GlassCard, Glass, Waystone } from "$lib/ui";
	import Dialog from "$lib/ui/components/ui/Dialog.svelte";
	import { toast } from "$lib/ui/components/ui/toast";
	import {
		api,
		apiRequest,
		processImage,
		supportsJxlEncoding,
		calculateFileHash,
		generateDatePath,
		formatBytes,
		compressionRatio,
		formatName,
	} from "$lib/utils";
	import {
		UPLOAD_ACCEPT_ATTR,
		ALLOWED_IMAGE_TYPES,
		ALLOWED_EXTENSIONS,
		ALLOWED_TYPES_DISPLAY,
		validateImageFile,
		isConvertibleFormat,
		getUploadStrategy,
		getActionableUploadError,
		normalizeFileForUpload,
	} from "$lib/utils/upload-validation";

	/** @type {{ data: { jxl: { jxlEnabled: boolean; jxlRolloutPercentage: number; jxlKillSwitchActive: boolean }; grafts?: Record<string, boolean> } }} */
	let { data } = $props();

	// Feature flag for image uploads (cascaded from Arbor layout grafts)
	const uploadsEnabled = $derived(data.grafts?.image_uploads ?? true);

	// Feature flags from server (reactive to data changes)
	const jxlFeatureEnabled = $derived(data.jxl?.jxlEnabled ?? false);
	const jxlKillSwitchActive = $derived(data.jxl?.jxlKillSwitchActive ?? false);

	// Upload options (defaults with AI analysis enabled)
	let quality = $state(80);
	/** @type {'auto' | 'jxl' | 'webp' | 'original'} */
	// Default to 'auto' if JXL feature is enabled, otherwise 'webp'
	let imageFormat = $state(/** @type {'auto' | 'jxl' | 'webp' | 'original'} */ ("webp"));
	let fullResolution = $state(false);
	let jxlSupported = $state(false);
	let useAiAnalysis = $state(true);
	let showAdvanced = $state(false);

	// Set initial format based on feature flag (only on first render)
	let formatInitialized = false;
	$effect(() => {
		if (!formatInitialized && jxlFeatureEnabled) {
			imageFormat = "auto";
			formatInitialized = true;
		}
	});

	// Upload state
	let isDragging = $state(false);
	/** @type {any[]} */
	let uploads = $state([]);
	let uploading = $state(false);

	// Copy format preference - load from localStorage or default to 'url'
	const COPY_FORMAT_STORAGE_KEY = "grove-copy-format";
	let copyFormat = $state(
		(typeof localStorage !== "undefined" && localStorage.getItem(COPY_FORMAT_STORAGE_KEY)) || "url",
	);

	// Persist copy format preference to localStorage when it changes
	$effect(() => {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(COPY_FORMAT_STORAGE_KEY, copyFormat);
		}
	});

	// Gallery state
	/** @type {any[]} */
	let galleryImages = $state([]);
	let galleryLoading = $state(false);
	/** @type {string | null} */
	let galleryError = $state(null);
	/** @type {string | null} */
	let galleryCursor = $state(null);
	let galleryHasMore = $state(false);
	let galleryFilter = $state("");
	let gallerySortBy = $state("date-desc");

	// UI state
	/** @type {string | number | null} */
	let copiedItem = $state(null);
	let deleteModalOpen = $state(false);
	/** @type {any} */
	let imageToDelete = $state(null);
	let deleting = $state(false);

	// Multi-select state
	let selectionMode = $state(false);
	/** @type {Set<string>} */
	let selectedImages = $state(new Set());
	let bulkDeleteModalOpen = $state(false);
	let bulkDeleting = $state(false);

	// Initialize gallery and check JXL support on mount
	$effect(() => {
		loadGallery();
		(async () => {
			jxlSupported = await supportsJxlEncoding();
		})();
	});

	async function loadGallery(append = false) {
		galleryLoading = true;
		galleryError = null;

		try {
			const params = new URLSearchParams();
			if (galleryFilter) params.set("prefix", galleryFilter);
			if (append && galleryCursor) params.set("cursor", galleryCursor);
			params.set("limit", "30");
			params.set("sortBy", gallerySortBy);

			const data = await api.get(`/api/images/list?${params}`);

			// Filter to show only allowed image types in gallery
			const filteredImages = data.images.filter(
				/** @param {any} img */ (img) => {
					const key = img.key.toLowerCase();
					return ALLOWED_EXTENSIONS.some((ext) => key.endsWith(`.${ext}`));
				},
			);

			if (append) {
				galleryImages = [...galleryImages, ...filteredImages];
			} else {
				galleryImages = filteredImages;
			}
			galleryCursor = data.cursor;
			galleryHasMore = data.truncated;
		} catch (err) {
			galleryError = err instanceof Error ? err.message : "Failed to load gallery";
		} finally {
			galleryLoading = false;
		}
	}

	function filterGallery() {
		galleryCursor = null;
		loadGallery();
	}

	function changeSortOrder() {
		galleryCursor = null;
		loadGallery();
	}

	/** @param {string} key */
	function getFileName(key) {
		return key.split("/").pop();
	}

	/** @param {string} key */
	function getDateFromPath(key) {
		// Extract date from photos/YYYY/MM/DD/filename format
		const match = key.match(/photos\/(\d{4})\/(\d{2})\/(\d{2})/);
		if (match) {
			return `${match[1]}-${match[2]}-${match[3]}`;
		}
		return null;
	}

	/** @param {DragEvent} e */
	function handleDragOver(e) {
		e.preventDefault();
		isDragging = true;
	}

	/** @param {DragEvent} e */
	function handleDragLeave(e) {
		e.preventDefault();
		isDragging = false;
	}

	/** @param {DragEvent} e */
	function handleDrop(e) {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
		uploadFiles(files);
	}

	/** @param {Event} e */
	function handleFileSelect(e) {
		const target = /** @type {HTMLInputElement} */ (e.target);
		const files = target.files ? Array.from(target.files) : [];
		uploadFiles(files);
		target.value = "";
	}

	/** @param {File[]} files */
	async function uploadFiles(files) {
		// Normalize and validate each file against allowed types
		const validFiles = [];
		const rejectedFiles = [];

		for (let file of files) {
			// Normalize: detect actual format from magic bytes, fix MIME/extension mismatches
			try {
				const normalized = await normalizeFileForUpload(file);
				file = normalized.file;
				// If it's actually HEIF (e.g., iPad .jpeg that's really HEIC), treat as convertible
				if (normalized.needsHeicConversion) {
					validFiles.push(file);
					continue;
				}
			} catch {
				// Normalization failed — fall through to standard validation
			}

			// HEIC/HEIF files bypass standard validation — they'll be converted to JPEG
			if (isConvertibleFormat(file)) {
				validFiles.push(file);
				continue;
			}
			const error = validateImageFile(file);
			if (error) {
				rejectedFiles.push({ name: file.name, error });
			} else {
				validFiles.push(file);
			}
		}

		// Show errors for rejected files
		if (rejectedFiles.length > 0) {
			for (const { name, error } of rejectedFiles) {
				toast.error(`${name}: ${error}`);
			}
		}

		if (validFiles.length === 0) {
			if (rejectedFiles.length === 0) {
				toast.error(`Please select image files (${ALLOWED_TYPES_DISPLAY})`);
			}
			return;
		}

		const imageFiles = validFiles;

		uploading = true;

		// Process all files in parallel
		const uploadPromises = imageFiles.map((file) => uploadSingleFile(file));
		await Promise.all(uploadPromises);

		uploading = false;
		loadGallery();
	}

	/** @param {File} file */
	async function uploadSingleFile(file) {
		const uploadItem = {
			id: Date.now() + Math.random(),
			name: file.name,
			status: "processing",
			stage: "Calculating hash...",
			progress: 0,
			url: null,
			error: null,
			aiData: null,
			originalSize: file.size,
			processedSize: null,
			format: /** @type {string | null} */ (null),
			markdown: null,
			html: null,
			svelte: null,
			duplicate: false,
			originalFile: file,
		};

		uploads = [uploadItem, ...uploads];

		/** @param {any} updates */
		const updateUpload = (updates) => {
			uploads = uploads.map((u) => (u.id === uploadItem.id ? { ...u, ...updates } : u));
		};

		try {
			// Step 1: Determine upload strategy (handles TIFF/HEIC/RAW etc.)
			const strategy = getUploadStrategy(file);

			if (strategy.warning) {
				toast.info(strategy.warning);
			}

			// Step 2: Calculate hash for duplicate detection
			const hash = await calculateFileHash(file);
			updateUpload({
				progress: 10,
				stage: strategy.needsConversion
					? "Converting iPhone photo..."
					: strategy.skipProcessing
						? "Preparing upload..."
						: "Processing image...",
			});

			// Step 3: Process image (JXL/WebP conversion, quality, EXIF strip)
			// Skip processing for non-renderable formats (TIFF, HEIC, RAW) and GIFs
			let processedBlob = file;
			/** @type {any} */
			let processResult = {
				originalSize: file.size,
				processedSize: file.size,
				format: file.name.split(".").pop()?.toLowerCase() || "original",
				skipped: true,
				reason: strategy.reason || "Original format preserved",
			};

			if (!strategy.skipProcessing) {
				// Browser-renderable image - process normally
				processResult = await processImage(file, {
					quality,
					format: imageFormat,
					fullResolution,
				});
				processedBlob = processResult.blob;
			}

			updateUpload({
				progress: 30,
				stage: useAiAnalysis ? "Analyzing with AI..." : "Uploading...",
				processedSize: processResult.processedSize,
				format: processResult.format,
			});

			// Step 3: AI Analysis (if enabled)
			let aiData = null;
			if (useAiAnalysis) {
				try {
					const analyzeForm = new FormData();
					analyzeForm.append("file", file); // Use original for better AI analysis
					const aiResult = await apiRequest("/api/images/analyze", {
						method: "POST",
						body: analyzeForm,
					});
					aiData = aiResult;
					updateUpload({ progress: 60, stage: "Uploading...", aiData });
				} catch (aiErr) {
					console.warn("AI analysis failed:", aiErr);
					// Continue without AI data
				}
			}

			updateUpload({ progress: 70, stage: "Uploading to CDN..." });

			// Step 4: Upload to CDN
			const formData = new FormData();
			// Update filename extension to match the processed format (e.g., .jpeg → .webp)
			// Without this, the server rejects the upload because the extension doesn't match the MIME type
			let uploadName = file.name;
			if (processedBlob.type && processedBlob.type !== file.type) {
				/** @type {Record<string, string>} */
				const extForMime = {
					"image/webp": ".webp",
					"image/jxl": ".jxl",
					"image/gif": ".gif",
					"image/jpeg": ".jpg",
					"image/png": ".png",
					"image/avif": ".avif",
				};
				const newExt = extForMime[processedBlob.type];
				if (newExt) {
					const lastDot = uploadName.lastIndexOf(".");
					if (lastDot > 0) {
						uploadName = uploadName.substring(0, lastDot) + newExt;
					} else {
						uploadName = uploadName + newExt;
					}
				}
			}
			formData.append("file", new File([processedBlob], uploadName, { type: processedBlob.type }));
			formData.append("hash", hash);

			// Include format metadata for analytics
			if (processResult.format) {
				formData.append("imageFormat", processResult.format);
			}
			formData.append("originalSize", String(processResult.originalSize));
			formData.append("storedSize", String(processResult.processedSize));

			if (aiData) {
				formData.append("filename", aiData.filename);
				formData.append("altText", aiData.altText);
				formData.append("description", aiData.description);
			}

			const result = await apiRequest("/api/images/upload", {
				method: "POST",
				body: formData,
			});

			if (result.duplicate) {
				updateUpload({
					status: "duplicate",
					progress: 100,
					stage: "Duplicate found",
					url: result.url,
					duplicate: true,
					markdown: `![Image](${result.url})`,
					html: `<img src="${result.url}" alt="Image" />`,
					svelte: `<img src="${result.url}" alt="Image" />`,
				});
				toast.info("Duplicate image - using existing upload");
			} else {
				updateUpload({
					status: "success",
					progress: 100,
					stage: "Complete",
					url: result.url,
					markdown: result.markdown,
					html: result.html,
					svelte: result.svelte,
					aiData: aiData,
				});
			}
		} catch (err) {
			const rawMessage = err instanceof Error ? err.message : "Upload failed";
			const errorMessage = getActionableUploadError(rawMessage);

			// Show prominent toast notification for immediate visibility
			toast.error(errorMessage);

			updateUpload({
				status: "error",
				stage: "Failed",
				error: errorMessage,
			});
		}
	}

	/** @param {any} upload */
	function getCopyText(upload) {
		if (copyFormat === "url") return upload.url;
		if (copyFormat === "markdown") return upload.markdown;
		if (copyFormat === "html") return upload.html;
		return upload.url;
	}

	/** @param {any} image */
	function getCopyTextForGallery(image) {
		const url = image.url;
		const alt = image.customMetadata?.altText || "Image";
		if (copyFormat === "url") return url;
		if (copyFormat === "markdown") return `![${alt}](${url})`;
		if (copyFormat === "html") return `<img src="${url}" alt="${alt}" />`;
		return url;
	}

	/**
	 * @param {string} text
	 * @param {string | number | null} [itemId]
	 */
	async function copyToClipboard(text, itemId = null) {
		try {
			await navigator.clipboard.writeText(text);
			copiedItem = itemId;
			setTimeout(() => {
				if (copiedItem === itemId) copiedItem = null;
			}, 2000);
		} catch (err) {
			toast.error("Failed to copy to clipboard");
		}
	}

	function clearCompleted() {
		uploads = uploads.filter((u) => u.status === "processing");
	}

	/** @param {any} upload */
	async function retryUpload(upload) {
		if (!upload.originalFile) return;
		uploads = uploads.filter((u) => u.id !== upload.id);
		await uploadSingleFile(upload.originalFile);
	}

	/** @param {any} image */
	function confirmDelete(image) {
		imageToDelete = image;
		deleteModalOpen = true;
	}

	function cancelDelete() {
		deleteModalOpen = false;
		imageToDelete = null;
	}

	function toggleSelectionMode() {
		selectionMode = !selectionMode;
		if (!selectionMode) {
			selectedImages = new Set();
		}
	}

	/** @param {string} key */
	function toggleImageSelection(key) {
		const next = new Set(selectedImages);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedImages = next;
	}

	function selectAll() {
		if (selectedImages.size === galleryImages.length) {
			selectedImages = new Set();
		} else {
			selectedImages = new Set(galleryImages.map((/** @type {any} */ img) => img.key));
		}
	}

	function confirmBulkDelete() {
		if (selectedImages.size === 0) return;
		bulkDeleteModalOpen = true;
	}

	function cancelBulkDelete() {
		bulkDeleteModalOpen = false;
	}

	async function executeBulkDelete() {
		const keys = Array.from(selectedImages);
		if (keys.length === 0) return;

		bulkDeleting = true;

		try {
			const result = await api.post("/api/images/delete-batch", { keys });

			// Remove successfully deleted images from gallery
			const deletedKeys = new Set(result?.deleted ?? keys);
			galleryImages = galleryImages.filter((/** @type {any} */ img) => !deletedKeys.has(img.key));

			const failedCount = result?.failed?.length ?? 0;
			if (failedCount > 0) {
				toast.warning(`Deleted ${deletedKeys.size} images, ${failedCount} failed`);
			} else {
				toast.success(`Deleted ${deletedKeys.size} image${deletedKeys.size === 1 ? "" : "s"}`);
			}
		} catch (err) {
			toast.error("Bulk delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
		} finally {
			bulkDeleting = false;
			bulkDeleteModalOpen = false;
			selectedImages = new Set();
		}
	}

	async function executeDelete() {
		if (!imageToDelete) return;
		deleting = true;

		try {
			await api.delete("/api/images/delete", {
				body: JSON.stringify({ key: imageToDelete.key }),
			});
			galleryImages = galleryImages.filter((img) => img.key !== imageToDelete.key);
			toast.success("Image deleted");
		} catch (err) {
			toast.error("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"));
		} finally {
			deleting = false;
			deleteModalOpen = false;
			imageToDelete = null;
		}
	}
</script>

<div class="images-page">
	<header class="page-header">
		<div class="header-content">
			<h1>Images</h1>
			<p class="subtitle">Upload, organize, and manage your image library</p>
		</div>
		<div class="header-stats">
			<div class="stat">
				<span class="stat-value">{galleryImages.length}</span>
				<span class="stat-label">visible</span>
			</div>
		</div>
	</header>

	<!-- Upload Section -->
	<section class="upload-section">
		{#if !uploadsEnabled}
			<div class="uploads-disabled-banner">
				<span class="banner-icon">~</span>
				<div>
					<p>
						Your grove needs a little time to sprout before photo uploads are available. In the
						meantime, you can use external image links in your posts with markdown:
					</p>
					<code class="block mt-2 text-xs opacity-80"
						>![description](https://your-image-url.jpg)</code
					>
					<p class="mt-2 text-xs opacity-70">
						Free image hosting: <a
							href="https://imgbb.com"
							target="_blank"
							rel="noopener"
							class="underline">ImgBB</a
						>
						&middot;
						<a href="https://postimages.org" target="_blank" rel="noopener" class="underline"
							>Postimages</a
						>
						&middot;
						<a href="https://imgur.com" target="_blank" rel="noopener" class="underline">Imgur</a>
					</p>
				</div>
			</div>
		{/if}
		<Glass
			variant="tint"
			intensity="light"
			class="drop-zone {isDragging ? 'dragging' : ''} {uploading
				? 'uploading'
				: ''} {!uploadsEnabled ? 'disabled' : ''}"
			role="button"
			tabindex={0}
			aria-label="Drop zone for image uploads"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			onclick={() => document.getElementById("file-input")?.click()}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					document.getElementById("file-input")?.click();
				}
			}}
		>
			<input
				type="file"
				id="file-input"
				accept={UPLOAD_ACCEPT_ATTR}
				multiple
				onchange={handleFileSelect}
				hidden
			/>

			<div class="drop-content">
				{#if uploading}
					<div class="drop-icon uploading-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							<path d="M9 12l2 2 4-4" />
						</svg>
					</div>
					<p class="drop-text">Uploading...</p>
				{:else if isDragging}
					<div class="drop-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M12 5v14M5 12l7-7 7 7" />
						</svg>
					</div>
					<p class="drop-text">Drop images here</p>
				{:else}
					<div class="drop-icon">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<rect x="3" y="3" width="18" height="18" rx="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<path d="M21 15l-5-5L5 21" />
						</svg>
					</div>
					<p class="drop-text">Drop images here</p>
					<p class="drop-hint">or click to browse</p>
				{/if}
			</div>
		</Glass>

		<!-- Options Panel -->
		<GlassCard variant="default" class="options-panel">
			<div class="options-main">
				<label class="toggle-option primary">
					<input type="checkbox" bind:checked={useAiAnalysis} />
					<span class="toggle-slider"></span>
					<span class="toggle-label">
						<strong>AI Analysis</strong>
						<small>Smart naming, descriptions & alt text</small>
					</span>
				</label>

				<div class="format-selector">
					<label for="copyFormat">Copy as:</label>
					<select id="copyFormat" bind:value={copyFormat}>
						<option value="url">URL</option>
						<option value="markdown">Markdown</option>
						<option value="html">HTML</option>
					</select>
				</div>
			</div>

			<button class="advanced-toggle" onclick={() => (showAdvanced = !showAdvanced)}>
				<svg
					class="chevron"
					class:open={showAdvanced}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
				Advanced Options
			</button>

			{#if showAdvanced}
				<div class="options-advanced">
					<div class="quality-control">
						<label for="quality">
							Quality: <strong>{quality}%</strong>
						</label>
						<input type="range" id="quality" min="10" max="100" step="5" bind:value={quality} />
						<div class="quality-hints">
							<span>Smaller</span>
							<span>Larger</span>
						</div>
					</div>

					<div class="format-options">
						<div class="format-control">
							<label for="imageFormat">Output Format:</label>
							<select id="imageFormat" bind:value={imageFormat}>
								{#if jxlFeatureEnabled && !jxlKillSwitchActive}
									<option value="auto">Auto (JXL → WebP fallback)</option>
									<option value="jxl">JPEG XL only</option>
								{/if}
								<option value="webp">WebP only</option>
								<option value="original">Keep original</option>
							</select>
							{#if jxlFeatureEnabled && !jxlKillSwitchActive}
								{#if jxlSupported}
									<span class="format-badge supported">JXL supported</span>
								{:else}
									<span class="format-badge unsupported">JXL unavailable</span>
								{/if}
							{:else if jxlKillSwitchActive}
								<span class="format-badge unsupported">JXL disabled (emergency)</span>
							{/if}
						</div>

						<label class="toggle-option">
							<input type="checkbox" bind:checked={fullResolution} />
							<span class="toggle-slider"></span>
							<span class="toggle-label">Full Resolution (no resize)</span>
						</label>
					</div>

					<div class="options-info">
						<p>
							Images auto-organized to <code
								>photos/{new Date().getFullYear()}/{String(new Date().getMonth() + 1).padStart(
									2,
									"0",
								)}/{String(new Date().getDate()).padStart(2, "0")}/</code
							>
						</p>
						<p>EXIF GPS data automatically stripped for privacy</p>
						<p>Duplicates detected via SHA-256 hash</p>
					</div>
				</div>
			{/if}
		</GlassCard>
	</section>

	<!-- Active Uploads -->
	{#if uploads.length > 0}
		<section class="uploads-section">
			<div class="section-header">
				<h2>Uploads</h2>
				<Button variant="secondary" size="sm" onclick={clearCompleted}>Clear</Button>
			</div>

			<div class="uploads-list">
				{#each uploads as upload (upload.id)}
					<GlassCard
						variant="default"
						class="upload-card {upload.status === 'success' ? 'success' : ''} {upload.status ===
						'duplicate'
							? 'duplicate'
							: ''} {upload.status === 'error' ? 'error' : ''}"
					>
						<div class="upload-header">
							<span class="upload-name">{upload.name}</span>
							<span
								class="upload-badge"
								class:processing={upload.status === "processing"}
								class:success={upload.status === "success"}
								class:duplicate={upload.status === "duplicate"}
								class:error={upload.status === "error"}
							>
								{#if upload.status === "processing"}
									{upload.stage}
								{:else if upload.status === "success"}
									Uploaded
								{:else if upload.status === "duplicate"}
									Duplicate
								{:else}
									Failed
								{/if}
							</span>
						</div>

						{#if upload.status === "processing"}
							<div class="progress-bar">
								<div class="progress-fill" style="width: {upload.progress}%"></div>
							</div>
						{/if}

						{#if upload.status === "success" || upload.status === "duplicate"}
							<div class="upload-result">
								{#if upload.aiData}
									<div class="ai-metadata">
										<p class="ai-description">{upload.aiData.description}</p>
										<p class="ai-alt"><strong>Alt:</strong> {upload.aiData.altText}</p>
									</div>
								{/if}

								<div class="upload-stats">
									{#if upload.processedSize && upload.processedSize !== upload.originalSize}
										<span class="stat-pill">
											{formatBytes(upload.originalSize)} → {formatBytes(upload.processedSize)}
											<span class="compression"
												>{compressionRatio(upload.originalSize, upload.processedSize)}</span
											>
										</span>
									{/if}
									{#if upload.format && upload.format !== "original"}
										<span class="stat-pill format">{formatName(upload.format)}</span>
									{/if}
									{#if upload.duplicate}
										<span class="stat-pill duplicate">Reused existing</span>
									{/if}
								</div>

								<div class="upload-url">
									<code>{upload.url}</code>
								</div>

								<div class="upload-actions">
									<Button
										variant="primary"
										size="sm"
										onclick={() => copyToClipboard(getCopyText(upload), upload.id)}
									>
										{copiedItem === upload.id ? "Copied!" : `Copy ${copyFormat.toUpperCase()}`}
									</Button>
								</div>
							</div>
						{/if}

						{#if upload.status === "error"}
							<div class="upload-error-row">
								<p class="upload-error">
									{upload.error}
									<Waystone
										slug="image-upload-failures"
										label="Troubleshoot upload issues"
										inline
									/>
								</p>
								{#if upload.originalFile}
									<Button variant="secondary" size="sm" onclick={() => retryUpload(upload)}
										>Retry</Button
									>
								{/if}
							</div>
						{/if}
					</GlassCard>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Gallery Section -->
	<GlassCard variant="default" class="gallery-section">
		<div class="section-header">
			<div class="section-title">
				<h2>Gallery</h2>
				<span class="section-subtitle">All images in your Grove</span>
			</div>
			<div class="gallery-controls">
				<select bind:value={gallerySortBy} onchange={changeSortOrder}>
					<option value="date-desc">Newest</option>
					<option value="date-asc">Oldest</option>
					<option value="name-asc">A-Z</option>
					<option value="name-desc">Z-A</option>
					<option value="size-desc">Largest</option>
					<option value="size-asc">Smallest</option>
				</select>
				<div class="filter-group">
					<input
						type="text"
						placeholder="Filter by path..."
						bind:value={galleryFilter}
						onkeydown={(e) => e.key === "Enter" && filterGallery()}
					/>
					<Button variant="secondary" size="sm" onclick={filterGallery}>Filter</Button>
				</div>
				<Button variant="secondary" size="sm" onclick={() => loadGallery()}>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						style="width: 16px; height: 16px;"
					>
						<path
							d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
						/>
					</svg>
				</Button>
				<Button
					variant={selectionMode ? "primary" : "secondary"}
					size="sm"
					onclick={toggleSelectionMode}
				>
					{selectionMode ? "Cancel" : "Select"}
				</Button>
			</div>
		</div>

		{#if galleryError}
			<div class="gallery-error">{galleryError}</div>
		{/if}

		{#if galleryLoading && galleryImages.length === 0}
			<div class="gallery-loading">
				<div class="spinner"></div>
				<span>Loading images...</span>
			</div>
		{:else if galleryImages.length === 0}
			<div class="gallery-empty">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<path d="M21 15l-5-5L5 21" />
				</svg>
				<p>No images found</p>
			</div>
		{:else}
			{#if selectionMode}
				<div class="selection-bar">
					<div class="selection-bar-left">
						<button class="select-all-btn" onclick={selectAll}>
							{selectedImages.size === galleryImages.length ? "Deselect All" : "Select All"}
						</button>
						<span class="selection-count">
							{selectedImages.size} selected
						</span>
					</div>
					{#if selectedImages.size > 0}
						<Button variant="danger" size="sm" onclick={confirmBulkDelete}>
							Delete {selectedImages.size} image{selectedImages.size === 1 ? "" : "s"}
						</Button>
					{/if}
				</div>
			{/if}
			<div class="gallery-grid">
				{#each galleryImages as image (image.key)}
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div
						class="gallery-card {selectionMode && selectedImages.has(image.key) ? 'selected' : ''}"
						onclick={selectionMode ? () => toggleImageSelection(image.key) : undefined}
						role={selectionMode ? "checkbox" : undefined}
						aria-checked={selectionMode ? selectedImages.has(image.key) : undefined}
						tabindex={selectionMode ? 0 : undefined}
						onkeydown={selectionMode
							? (/** @type {KeyboardEvent} */ e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										toggleImageSelection(image.key);
									}
								}
							: undefined}
					>
						{#if selectionMode}
							<div class="selection-checkbox" class:checked={selectedImages.has(image.key)}>
								{#if selectedImages.has(image.key)}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
										<path d="M20 6L9 17l-5-5" />
									</svg>
								{/if}
							</div>
						{/if}
						<div class="gallery-image">
							<img src={image.url} alt={getFileName(image.key)} loading="lazy" />
						</div>
						<div class="gallery-info">
							<span class="gallery-name" title={image.key}>{getFileName(image.key)}</span>
							<div class="gallery-meta">
								<span>{formatBytes(image.size)}</span>
								{#if getDateFromPath(image.key)}
									<span>{getDateFromPath(image.key)}</span>
								{/if}
							</div>
						</div>
						{#if !selectionMode}
							<div class="gallery-actions">
								<button
									class="action-btn copy"
									onclick={() => copyToClipboard(getCopyTextForGallery(image), image.key)}
									title="Copy {copyFormat.toUpperCase()}"
								>
									{#if copiedItem === image.key}
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M20 6L9 17l-5-5" />
										</svg>
									{:else}
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<rect x="9" y="9" width="13" height="13" rx="2" />
											<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
										</svg>
									{/if}
								</button>
								<button
									class="action-btn delete"
									onclick={() => confirmDelete(image)}
									title="Delete"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path
											d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
										/>
									</svg>
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>

			{#if galleryHasMore}
				<div class="gallery-load-more">
					<Button variant="primary" onclick={() => loadGallery(true)} disabled={galleryLoading}>
						{galleryLoading ? "Loading..." : "Load More"}
					</Button>
				</div>
			{/if}
		{/if}
	</GlassCard>
</div>

<!-- Delete Modal -->
<Dialog bind:open={deleteModalOpen} title="Delete Image">
	{#if imageToDelete}
		<div class="delete-preview">
			<img
				src={imageToDelete.url}
				alt="Preview"
				onerror={(e) => {
					const el = /** @type {HTMLImageElement} */ (e.currentTarget);
					el.style.display = "none";
					el.nextElementSibling?.classList.remove("hidden");
				}}
			/>
			<div class="delete-preview-fallback hidden">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<path d="M21 15l-5-5L5 21" />
				</svg>
			</div>
		</div>
		<p class="delete-filename">{getFileName(imageToDelete.key)}</p>
	{/if}
	<p class="delete-warning">This action cannot be undone.</p>

	{#snippet footer()}
		<div class="modal-actions">
			<Button variant="secondary" onclick={cancelDelete} disabled={deleting}>Cancel</Button>
			<Button variant="danger" onclick={executeDelete} disabled={deleting}>
				{deleting ? "Deleting..." : "Delete"}
			</Button>
		</div>
	{/snippet}
</Dialog>

<!-- Bulk Delete Modal -->
<Dialog
	bind:open={bulkDeleteModalOpen}
	title="Delete {selectedImages.size} Image{selectedImages.size === 1 ? '' : 's'}"
>
	<div class="bulk-delete-content">
		<p class="bulk-delete-count">
			You are about to delete <strong>{selectedImages.size}</strong> image{selectedImages.size === 1
				? ""
				: "s"} from your grove.
		</p>
		{#if bulkDeleting}
			<p class="bulk-deleting-status">Deleting&hellip;</p>
		{/if}
	</div>
	<p class="delete-warning">This action cannot be undone.</p>

	{#snippet footer()}
		<div class="modal-actions">
			<Button variant="secondary" onclick={cancelBulkDelete} disabled={bulkDeleting}>Cancel</Button>
			<Button variant="danger" onclick={executeBulkDelete} disabled={bulkDeleting}>
				{bulkDeleting
					? "Deleting..."
					: `Delete ${selectedImages.size} Image${selectedImages.size === 1 ? "" : "s"}`}
			</Button>
		</div>
	{/snippet}
</Dialog>

<style>
	.images-page {
		max-width: 1000px;
	}

	/* Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.header-content h1 {
		margin: 0 0 0.25rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	.header-stats {
		display: flex;
		gap: 1rem;
	}

	.stat {
		text-align: center;
		padding: 0.5rem 1rem;
		background: var(--color-bg-secondary);
		border-radius: var(--border-radius-standard);
	}

	.stat-value {
		display: block;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Upload Section */
	.upload-section {
		margin-bottom: 2rem;
	}

	:global(.drop-zone) {
		border: 2px dashed var(--glass-border);
		border-radius: var(--border-radius-standard);
		padding: 3rem 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.dark .drop-zone) {
		border-color: var(--glass-border);
	}

	:global(.drop-zone:hover) {
		border-color: var(--color-primary);
	}

	:global(.drop-zone.dragging) {
		border-color: var(--accent-success);
		background: var(--status-success-bg);
		backdrop-filter: blur(12px);
		transform: scale(1.01);
	}

	:global(.drop-zone.uploading) {
		pointer-events: none;
		opacity: 0.8;
	}

	.drop-content {
		pointer-events: none;
	}

	.drop-icon {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		color: var(--color-text-muted);
	}

	.drop-icon.uploading-icon {
		animation: pulse 1.5s ease-in-out infinite;
		color: var(--color-primary);
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

	.drop-text {
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--color-text);
		margin: 0 0 0.25rem 0;
	}

	.drop-hint {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin: 0;
	}

	/* Options Panel */
	:global(.options-panel) {
		margin-top: 1rem;
		padding: 1rem;
	}

	.options-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.toggle-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.toggle-option.primary {
		background: var(--color-bg-tertiary, var(--mobile-menu-bg));
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius-small);
	}

	:global(.dark) .toggle-option.primary {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.toggle-option input {
		display: none;
	}

	.toggle-slider {
		width: 40px;
		height: 22px;
		background: var(--color-border);
		border-radius: 11px;
		position: relative;
		transition: background 0.2s;
		flex-shrink: 0;
	}

	.toggle-slider::after {
		content: "";
		position: absolute;
		width: 18px;
		height: 18px;
		background: white;
		border-radius: 50%;
		top: 2px;
		left: 2px;
		transition: transform 0.2s;
	}

	.toggle-option input:checked + .toggle-slider {
		background: var(--color-primary);
	}

	.toggle-option input:checked + .toggle-slider::after {
		transform: translateX(18px);
	}

	.toggle-label {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.toggle-label strong {
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.toggle-label small {
		color: var(--color-text-muted);
		font-size: 0.75rem;
	}

	.format-selector {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.format-selector label {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.format-selector select {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
	}

	:global(.dark) .format-selector select {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.advanced-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1rem;
		padding: 0.5rem 0;
		background: none;
		border: none;
		color: var(--color-text-muted);
		font-size: 0.85rem;
		cursor: pointer;
		width: 100%;
		justify-content: center;
	}

	.advanced-toggle:hover {
		color: var(--color-text);
	}

	.chevron {
		width: 16px;
		height: 16px;
		transition: transform 0.2s;
	}

	.chevron.open {
		transform: rotate(180deg);
	}

	.options-advanced {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	.quality-control {
		margin-bottom: 1rem;
	}

	.quality-control label {
		display: block;
		font-size: 0.85rem;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.quality-control input[type="range"] {
		width: 100%;
		height: 6px;
		border-radius: 3px;
		background: var(--color-border);
		appearance: none;
		cursor: pointer;
	}

	.quality-control input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--color-primary);
		cursor: pointer;
	}

	.quality-hints {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}

	.format-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.format-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.format-control label {
		font-size: 0.85rem;
		color: var(--color-text);
	}

	.format-control select {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
	}

	:global(.dark) .format-control select {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.format-badge {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: var(--border-radius-small);
		font-weight: 500;
	}

	.format-badge.supported {
		background: var(--status-success-bg);
		color: var(--accent-success);
	}

	.format-badge.unsupported {
		background: var(--status-warning-bg);
		color: var(--color-text-muted);
	}

	.options-info {
		background: var(--color-bg-tertiary, var(--mobile-menu-bg));
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius-small);
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	:global(.dark) .options-info {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.options-info p {
		margin: 0.25rem 0;
	}

	.options-info code {
		background: var(--color-bg-secondary);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-size: 0.75rem;
	}

	/* Uploads Section */
	.uploads-section {
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.section-title {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.section-subtitle {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.uploads-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	:global(.upload-card) {
		padding: 1rem;
		transition: border-color 0.2s;
	}

	:global(.upload-card.success) {
		border-color: var(--accent-success) !important;
	}

	:global(.upload-card.duplicate) {
		border-color: var(--color-primary) !important;
	}

	:global(.upload-card.error) {
		border-color: var(--accent-danger) !important;
	}

	.upload-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.upload-name {
		font-weight: 500;
		color: var(--color-text);
		font-size: 0.9rem;
	}

	.upload-badge {
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		border-radius: var(--border-radius-small);
		font-weight: 500;
	}

	.upload-badge.processing {
		background: var(--status-warning-bg);
		color: var(--color-text-muted);
	}

	.upload-badge.success {
		background: var(--status-success-bg);
		color: var(--accent-success);
	}

	.upload-badge.duplicate {
		background: var(--grove-overlay-10);
		color: var(--color-primary);
	}

	.upload-badge.error {
		background: var(--status-danger-bg);
		color: var(--accent-danger);
	}

	.progress-bar {
		height: 4px;
		background: var(--color-border);
		border-radius: 2px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.3s ease;
	}

	.upload-result {
		margin-top: 0.75rem;
	}

	.ai-metadata {
		background: var(--color-bg-tertiary, var(--mobile-menu-bg));
		padding: 0.75rem;
		border-radius: var(--border-radius-small);
		margin-bottom: 0.75rem;
		font-size: 0.85rem;
	}

	:global(.dark) .ai-metadata {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.ai-description {
		margin: 0 0 0.25rem 0;
		color: var(--color-text);
	}

	.ai-alt {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}

	.upload-stats {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.stat-pill {
		font-size: 0.75rem;
		padding: 0.2rem 0.5rem;
		background: var(--color-bg-tertiary, var(--mobile-menu-bg));
		border-radius: var(--border-radius-small);
		color: var(--color-text-muted);
	}

	:global(.dark) .stat-pill {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.stat-pill .compression {
		color: var(--accent-success);
		font-weight: 500;
		margin-left: 0.25rem;
	}

	.stat-pill.duplicate {
		color: var(--color-primary);
	}

	.stat-pill.format {
		background: var(--grove-overlay-10);
		color: var(--color-primary);
	}

	.upload-url {
		background: var(--mobile-menu-bg);
		padding: 0.5rem;
		border-radius: var(--border-radius-small);
		margin-bottom: 0.75rem;
		overflow-x: auto;
	}

	:global(.dark) .upload-url {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.upload-url code {
		font-size: 0.8rem;
		color: var(--color-text);
		word-break: break-all;
	}

	.upload-actions {
		display: flex;
		gap: 0.5rem;
	}

	.upload-error {
		margin: 0;
		color: var(--accent-danger);
		font-size: 0.85rem;
	}

	.upload-error-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.uploads-disabled-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: var(--status-warning-bg, rgba(255, 200, 50, 0.1));
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		color: var(--color-text-muted);
		font-size: 0.85rem;
		margin-bottom: 0.75rem;
	}

	.banner-icon {
		font-size: 1.25rem;
		font-weight: bold;
		color: var(--color-primary);
		flex-shrink: 0;
	}

	:global(.drop-zone.disabled) {
		opacity: 0.5;
		pointer-events: none;
		cursor: not-allowed;
	}

	/* Gallery Section */
	:global(.gallery-section) {
		padding: 1.5rem;
	}

	.gallery-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.gallery-controls select {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
	}

	:global(.dark) .gallery-controls select {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.filter-group {
		display: flex;
		gap: 0.5rem;
	}

	.filter-group input {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
		min-width: 150px;
	}

	:global(.dark) .filter-group input {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.gallery-error {
		background: var(--status-danger-bg);
		color: var(--accent-danger);
		padding: 1rem;
		border-radius: var(--border-radius-small);
		margin: 1rem 0;
	}

	.gallery-loading,
	.gallery-empty {
		text-align: center;
		color: var(--color-text-muted);
		padding: 3rem;
	}

	.gallery-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.gallery-empty svg {
		width: 48px;
		height: 48px;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.gallery-card {
		position: relative;
		background: var(--glass-bg-medium);
		backdrop-filter: blur(8px);
		border: 1px solid var(--glass-border);
		border-radius: var(--border-radius-standard);
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			background-color 0.2s;
	}

	:global(.dark) .gallery-card {
		background: var(--glass-bg-medium);
		border-color: var(--glass-border);
	}

	.gallery-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		background: var(--glass-bg);
	}

	:global(.dark) .gallery-card:hover {
		background: var(--glass-bg);
	}

	.gallery-image {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-secondary);
		overflow: hidden;
	}

	.gallery-image img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.gallery-info {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.gallery-name {
		display: block;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.gallery-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.gallery-actions {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		border: none;
		border-radius: var(--border-radius-small);
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	.action-btn.copy {
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
	}

	:global(.dark) .action-btn.copy {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.copy:hover {
		background: var(--color-primary);
		color: white;
	}

	.action-btn.delete {
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
	}

	:global(.dark) .action-btn.delete {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.delete:hover {
		background: var(--accent-danger);
		color: white;
	}

	.gallery-load-more {
		text-align: center;
		margin-top: 1.5rem;
	}

	/* Delete Modal */
	.delete-preview {
		display: flex;
		justify-content: center;
		background: var(--color-bg-secondary);
		border-radius: var(--border-radius-small);
		padding: 0.5rem;
		margin-bottom: 1rem;
		max-height: 150px;
		overflow: hidden;
	}

	.delete-preview img {
		max-width: 100%;
		max-height: 130px;
		object-fit: contain;
	}

	.delete-preview-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 80px;
		color: var(--color-text-muted);
		opacity: 0.5;
	}

	.delete-preview-fallback svg {
		width: 40px;
		height: 40px;
	}

	.delete-preview-fallback.hidden {
		display: none;
	}

	.delete-filename {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		word-break: break-all;
		margin: 0 0 1rem 0;
	}

	.delete-warning {
		color: var(--accent-danger);
		font-size: 0.85rem;
		font-weight: 500;
		margin: 0 0 1rem 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	/* Selection Mode */
	.selection-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		margin-top: 1rem;
		background: var(--glass-bg-medium);
		backdrop-filter: blur(8px);
		border: 1px solid var(--glass-border);
		border-radius: var(--border-radius-standard);
	}

	.selection-bar-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.select-all-btn {
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.35rem 0.75rem;
		border-radius: var(--border-radius-small);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.select-all-btn:hover {
		background: var(--color-bg-secondary);
	}

	.selection-count {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.gallery-card.selected {
		border-color: var(--color-primary);
		background: var(--grove-overlay-10, rgba(var(--color-primary-rgb, 76, 133, 87), 0.1));
		box-shadow: 0 0 0 2px var(--color-primary);
	}

	.gallery-card.selected .gallery-image {
		opacity: 0.85;
	}

	.selection-checkbox {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 2px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.selection-checkbox.checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.selection-checkbox svg {
		width: 14px;
		height: 14px;
		color: white;
	}

	/* Bulk Delete Modal */
	.bulk-delete-content {
		margin-bottom: 1rem;
	}

	.bulk-delete-count {
		font-size: 0.95rem;
		color: var(--color-text);
		margin: 0 0 1rem 0;
	}

	.bulk-deleting-status {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0.5rem 0 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}

		.options-main {
			flex-direction: column;
			align-items: stretch;
		}

		.gallery-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.filter-group {
			flex-direction: column;
		}

		.filter-group input {
			min-width: 0;
			width: 100%;
		}

		.gallery-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.75rem;
		}

		.selection-bar {
			flex-direction: column;
			gap: 0.75rem;
			text-align: center;
		}

		.selection-bar-left {
			justify-content: center;
		}
	}
</style>
