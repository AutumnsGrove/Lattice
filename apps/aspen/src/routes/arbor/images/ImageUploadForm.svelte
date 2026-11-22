<script lang="ts">
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Glass from "@autumnsgrove/lattice/ui/components/ui/Glass.svelte";
	import Waystone from "@autumnsgrove/lattice/ui/components/ui/Waystone.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import {
		api,
		apiRequest,
		processImage,
		generateThumbnail,
		extractDominantColor,
		calculateFileHash,
		formatBytes,
		compressionRatio,
		formatName,
		type ImageFormat,
	} from "@autumnsgrove/lattice/utils";
	import {
		UPLOAD_ACCEPT_ATTR,
		ALLOWED_TYPES_DISPLAY,
		validateImageFile,
		isConvertibleFormat,
		getUploadStrategy,
		getActionableUploadError,
		normalizeFileForUpload,
	} from "@autumnsgrove/lattice/media/validation/upload-validation";

	interface UploadItem {
		id: number;
		name: string;
		status: string;
		stage: string;
		progress: number;
		url: string | null;
		error: string | null;
		aiData: { filename: string; altText: string; description: string } | null;
		originalSize: number;
		processedSize: number | null;
		format: string | null;
		markdown: string | null;
		html: string | null;
		svelte: string | null;
		duplicate: boolean;
		originalFile: File;
	}

	interface Props {
		uploadsEnabled: boolean;
		/** Where a suspended uploader asks for them to be turned on (#1626). */
		uploadAccessUrl?: string | null;
		copyFormat: string;
		copiedItem: string | number | null;
		onCopyFormatChange?: (format: string) => void;
		onCopy?: (text: string, itemId: string | number | null) => void;
		onUploadsComplete?: () => void;
	}

	let {
		uploadsEnabled,
		uploadAccessUrl = null,
		copyFormat,
		copiedItem,
		onCopyFormatChange = () => {},
		onCopy = () => {},
		onUploadsComplete = () => {},
	}: Props = $props();

	// Upload options
	let quality = $state(80);
	let imageFormat = $state<"webp" | "original">("webp");
	let fullResolution = $state(false);
	let useAiAnalysis = $state(false);
	let showAdvanced = $state(false);

	// Upload state
	let isDragging = $state(false);
	let uploads = $state<UploadItem[]>([]);
	let uploading = $state(false);

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : [];
		uploadFiles(files);
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files ? Array.from(target.files) : [];
		uploadFiles(files);
		target.value = "";
	}

	async function uploadFiles(files: File[]) {
		const validFiles = [];
		const rejectedFiles = [];

		for (let file of files) {
			try {
				const normalized = await normalizeFileForUpload(file);
				file = normalized.file;
				if (normalized.needsHeicConversion) {
					validFiles.push(file);
					continue;
				}
			} catch {
				// Normalization failed — fall through to standard validation
			}

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

		uploading = true;
		const uploadPromises = validFiles.map((file) => uploadSingleFile(file));
		await Promise.all(uploadPromises);
		uploading = false;
		onUploadsComplete();
	}

	async function uploadSingleFile(file: File) {
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
			format: null as string | null,
			markdown: null,
			html: null,
			svelte: null,
			duplicate: false,
			originalFile: file,
		};

		uploads = [uploadItem, ...uploads];

		const updateUpload = (updates: Partial<UploadItem>) => {
			uploads = uploads.map((u) => (u.id === uploadItem.id ? { ...u, ...updates } : u));
		};

		try {
			const strategy = getUploadStrategy(file);

			if (strategy.warning) {
				toast.info(strategy.warning);
			}

			const hash = await calculateFileHash(file);
			updateUpload({
				progress: 10,
				stage: strategy.needsConversion
					? "Converting iPhone photo..."
					: strategy.skipProcessing
						? "Preparing upload..."
						: "Processing image...",
			});

			let processedBlob: File | Blob = file;
			let processResult: {
				originalSize: number;
				processedSize: number;
				format: string;
				blob?: Blob;
				width?: number;
				height?: number;
				skipped?: boolean;
				reason?: string;
			} = {
				originalSize: file.size,
				processedSize: file.size,
				format: file.name.split(".").pop()?.toLowerCase() || "original",
				skipped: true,
				reason: strategy.reason || "Original format preserved",
			};

			if (!strategy.skipProcessing) {
				processResult = await processImage(file, {
					quality,
					format: imageFormat,
					fullResolution,
				});
				processedBlob = processResult.blob!;
			}

			updateUpload({
				progress: 30,
				stage: "Generating thumbnail...",
				processedSize: processResult.processedSize,
				format: processResult.format,
			});

			let thumbResult: { blob: Blob; width: number; height: number } | null = null;
			let dominantColor: string | null = null;
			try {
				const [thumb, color] = await Promise.all([
					generateThumbnail(file, { maxWidth: 400, quality: 60 }),
					extractDominantColor(file),
				]);
				thumbResult = thumb;
				dominantColor = color;
			} catch (thumbErr) {
				console.warn("Thumbnail generation failed:", thumbErr);
			}

			updateUpload({
				progress: 40,
				stage: useAiAnalysis ? "Analyzing with AI..." : "Uploading...",
			});

			let aiData = null;
			if (useAiAnalysis) {
				try {
					const analyzeForm = new FormData();
					analyzeForm.append("file", file);
					const aiResult = await apiRequest("/api/images/analyze", {
						method: "POST",
						body: analyzeForm,
					});
					aiData = aiResult;
					updateUpload({ progress: 60, stage: "Uploading...", aiData });
				} catch (aiErr) {
					console.warn("AI analysis failed:", aiErr);
				}
			}

			updateUpload({ progress: 70, stage: "Uploading to CDN..." });

			const formData = new FormData();
			let uploadName = file.name;
			if (processedBlob.type && processedBlob.type !== file.type) {
				const extForMime: Record<string, string> = {
					"image/webp": ".webp",
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

			if (processResult.format) {
				formData.append("imageFormat", processResult.format);
			}
			formData.append("originalSize", String(processResult.originalSize));
			formData.append("storedSize", String(processResult.processedSize));

			if (thumbResult) {
				formData.append(
					"thumbnail",
					new File([thumbResult.blob], "thumb.webp", { type: "image/webp" }),
				);
				formData.append("imageWidth", String(processResult.width || thumbResult.width));
				formData.append("imageHeight", String(processResult.height || thumbResult.height));
			}
			if (dominantColor) {
				formData.append("dominantColor", dominantColor);
			}

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
			toast.error(errorMessage);
			updateUpload({
				status: "error",
				stage: "Failed",
				error: errorMessage,
			});
		}
	}

	function getCopyText(upload: UploadItem) {
		if (copyFormat === "url") return upload.url;
		if (copyFormat === "markdown") return upload.markdown;
		if (copyFormat === "html") return upload.html;
		return upload.url;
	}

	function clearCompleted() {
		uploads = uploads.filter((u) => u.status === "processing");
	}

	async function retryUpload(upload: UploadItem) {
		if (!upload.originalFile) return;
		uploads = uploads.filter((u) => u.id !== upload.id);
		await uploadSingleFile(upload.originalFile);
	}
</script>

<!-- Upload Section -->
<section class="upload-section">
	{#if !uploadsEnabled}
		<div class="uploads-disabled-banner">
			<span class="banner-icon">~</span>
			<div>
				<p>
					Your grove needs a little time to sprout before photo uploads are available.
					{#if uploadAccessUrl}
						If you'd like them sooner,
						<a href={uploadAccessUrl} target="_blank" rel="noopener" class="underline"
							>ask me to turn them on</a
						>.
					{/if}
				</p>
				<p class="mt-2 text-xs opacity-80">
					In the meantime you can link images from anywhere with markdown:
				</p>
				<code class="block mt-2 text-xs opacity-80">![description](https://your-image-url.jpg)</code
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
		class="drop-zone {isDragging ? 'dragging' : ''} {uploading ? 'uploading' : ''} {!uploadsEnabled
			? 'disabled'
			: ''}"
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
				<select
					id="copyFormat"
					value={copyFormat}
					onchange={(e) => onCopyFormatChange((e.target as HTMLSelectElement).value)}
				>
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
							<option value="webp">WebP only</option>
							<option value="original">Keep original</option>
						</select>
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
									<span class="stat-pill format">{formatName(upload.format as ImageFormat)}</span>
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
									onclick={() => onCopy(getCopyText(upload) ?? "", upload.id)}
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
								<Waystone slug="image-upload-failures" label="Troubleshoot upload issues" inline />
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

<style>
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

	@media (max-width: 768px) {
		.options-main {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
