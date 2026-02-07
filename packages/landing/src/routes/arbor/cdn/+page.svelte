<script lang="ts">
	import type { PageData } from './$types';
	import { GlassCard, GlassButton } from '@autumnsgrove/groveengine/ui';
	import {
		Upload,
		Image,
		Video,
		Music,
		FileText,
		Type,
		File as FileIcon,
		Code,
		Copy,
		Check,
		Trash2,
		ExternalLink,
		X,
		CheckCircle,
		RefreshCw
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface CdnFile {
		id: string;
		filename: string;
		original_filename: string;
		key: string;
		content_type: string;
		size_bytes: number;
		folder: string;
		alt_text: string | null;
		uploaded_by: string;
		created_at: string;
		url: string;
	}

	let { data }: { data: PageData } = $props();

	// State
	let files = $derived(data.files as CdnFile[]);
	let folders = $derived(data.folders as string[]);
	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state<{ name: string; progress: number }[]>([]);
	let errorMessage = $state('');
	let successMessage = $state('');
	let selectedFolder = $state('/');
	let newFolderName = $state('');
	let showNewFolder = $state(false);
	let copiedId = $state<string | null>(null);
	let deleteConfirmId = $state<string | null>(null);
	let fileInputRef = $state<HTMLInputElement>();
	let deleteButtonRefs = $state<Record<string, HTMLButtonElement>>({});

	// Sync state
	let isSyncing = $state(false);
	let syncResult = $state<{ synced: number; skipped: number; total: number; errors: string[] } | null>(null);

	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// File type icon mapping (replacing inline SVGs)
	const fileTypeIcons: Record<string, ComponentType> = {
		image: Image,
		video: Video,
		audio: Music,
		pdf: FileText,
		font: Type,
		code: Code,
		file: FileIcon
	};

	function getFileIconType(contentType: string): string {
		if (contentType.startsWith('image/')) return 'image';
		if (contentType.startsWith('video/')) return 'video';
		if (contentType.startsWith('audio/')) return 'audio';
		if (contentType === 'application/pdf') return 'pdf';
		if (contentType.startsWith('font/')) return 'font';
		if (contentType.includes('javascript') || contentType.includes('json') || contentType === 'text/css')
			return 'code';
		return 'file';
	}

	function isImage(contentType: string): boolean {
		return contentType.startsWith('image/') && contentType !== 'image/svg+xml';
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const droppedFiles = e.dataTransfer?.files;
		if (droppedFiles) {
			await uploadFiles(Array.from(droppedFiles));
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			await uploadFiles(Array.from(input.files));
			input.value = '';
		}
	}

	async function uploadFiles(filesToUpload: File[]) {
		if (filesToUpload.length === 0) return;

		isUploading = true;
		errorMessage = '';
		successMessage = '';
		uploadProgress = filesToUpload.map((f) => ({ name: f.name, progress: 0 }));

		const folder = showNewFolder && newFolderName ? `/${newFolderName.replace(/^\/+|\/+$/g, '')}` : selectedFolder;

		let successCount = 0;

		for (let i = 0; i < filesToUpload.length; i++) {
			const file = filesToUpload[i];
			const formData = new FormData();
			formData.append('file', file);
			formData.append('folder', folder);

			try {
				uploadProgress[i].progress = 50;

				const response = await fetch('/api/arbor/cdn/upload', {
					method: 'POST',
					body: formData
				});

				const result = (await response.json()) as { success?: boolean; file?: CdnFile; error?: string };

				if (response.ok && result.success) {
					uploadProgress[i].progress = 100;
					files = [result.file as CdnFile, ...files];
					if (!folders.includes(folder)) {
						folders = [...folders, folder].sort();
					}
					successCount++;
				} else {
					throw new Error(result.error || 'Upload failed');
				}
			} catch (err) {
				errorMessage = err instanceof Error ? err.message : 'Upload failed';
				uploadProgress[i].progress = -1;
			}
		}

		isUploading = false;

		if (successCount > 0) {
			successMessage = `Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`;
			setTimeout(() => {
				successMessage = '';
			}, 3000);
		}

		if (showNewFolder && newFolderName && successCount > 0) {
			selectedFolder = folder;
			showNewFolder = false;
			newFolderName = '';
		}
	}

	async function copyUrl(file: CdnFile) {
		await navigator.clipboard.writeText(file.url);
		copiedId = file.id;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	async function deleteFile(id: string) {
		try {
			const response = await fetch(`/api/arbor/cdn/files/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				files = files.filter((f) => f.id !== id);
				successMessage = 'File deleted successfully';
				setTimeout(() => {
					successMessage = '';
				}, 3000);
			} else {
				const result = (await response.json()) as { error?: string };
				throw new Error(result.error || 'Delete failed');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Delete failed';
		}
		const fileId = deleteConfirmId;
		deleteConfirmId = null;
		// Restore focus to delete button
		if (fileId) deleteButtonRefs[fileId]?.focus();
	}

	function handleDropZoneKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			fileInputRef?.click();
		}
	}

	function handleDeleteDialogKeydown(e: KeyboardEvent, fileId: string) {
		if (e.key === 'Escape') {
			deleteConfirmId = null;
			deleteButtonRefs[fileId]?.focus();
		}
	}

	async function syncFromStorage() {
		if (isSyncing) return;

		isSyncing = true;
		errorMessage = '';
		successMessage = '';
		syncResult = null;

		try {
			const response = await fetch('/api/arbor/cdn/sync', {
				method: 'POST'
			});

			const result = (await response.json()) as {
				success?: boolean;
				synced: number;
				skipped: number;
				total: number;
				errors: string[];
				error?: string;
			};

			if (response.ok && result.success) {
				syncResult = {
					synced: result.synced,
					skipped: result.skipped,
					total: result.total,
					errors: result.errors
				};

				if (result.synced > 0) {
					successMessage = `Synced ${result.synced} file${result.synced !== 1 ? 's' : ''} from storage`;
					// Reload the page to show synced files
					setTimeout(() => {
						window.location.reload();
					}, 1500);
				} else if (result.total === 0) {
					successMessage = 'No files found in storage bucket';
				} else {
					successMessage = `All ${result.total} files already synced`;
				}
			} else {
				throw new Error(result.error || 'Sync failed');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to sync from storage';
		} finally {
			isSyncing = false;
		}
	}
</script>

<svelte:head>
	<title>CDN Manager - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">CDN Manager</h1>
	<p class="text-foreground-muted font-sans mt-1">{files.length} files uploaded</p>
</div>

<!-- Messages -->
{#if errorMessage}
	<div class="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
		<span class="font-sans text-sm">{errorMessage}</span>
		<button onclick={() => (errorMessage = '')} class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200" aria-label="Dismiss error">
			<X class="w-4 h-4" />
		</button>
	</div>
{/if}

{#if successMessage}
	<div class="mb-6 bg-grove-50 dark:bg-grove-950/30 border border-grove-200 dark:border-grove-800 text-grove-700 dark:text-grove-300 px-4 py-3 rounded-lg" role="status" aria-live="polite">
		<span class="font-sans text-sm">{successMessage}</span>
	</div>
{/if}

<!-- Upload Zone -->
<section class="mb-8">
	<div
		class="border-2 border-dashed rounded-xl p-8 text-center transition-colors
			{isDragging
				? 'border-grove-500 dark:border-grove-400 bg-grove-50/50 dark:bg-grove-950/30'
				: 'border-grove-300 dark:border-bark-600 hover:border-grove-400 dark:hover:border-grove-500'}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onkeydown={handleDropZoneKeydown}
		role="button"
		tabindex="0"
		aria-label="Upload files. Press Enter or Space to browse, or drag and drop files here."
	>
		<Upload class="w-12 h-12 mx-auto mb-4 text-grove-400 dark:text-grove-500" aria-hidden="true" />

		<p class="text-foreground-muted font-sans mb-4">
			Drag & drop files here, or
			<label class="text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300 cursor-pointer underline">
				browse
				<input bind:this={fileInputRef} type="file" multiple class="hidden" onchange={handleFileSelect} />
			</label>
		</p>

		<!-- Folder Selection -->
		<div class="flex items-center justify-center gap-4 mb-4">
			<div class="flex items-center gap-2">
				<label for="folder-select" class="text-sm text-foreground-muted font-sans">Folder:</label>
				{#if showNewFolder}
					<input
						type="text"
						bind:value={newFolderName}
						placeholder="folder-name"
						class="px-3 py-1.5 text-sm border border-grove-300 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground focus:border-grove-500 focus:outline-none"
					/>
					<button
						onclick={() => {
							showNewFolder = false;
							newFolderName = '';
						}}
						class="text-foreground-muted hover:text-foreground text-sm"
					>
						Cancel
					</button>
				{:else}
					<select
						id="folder-select"
						bind:value={selectedFolder}
						class="px-3 py-1.5 text-sm border border-grove-300 dark:border-bark-600 rounded-lg bg-white dark:bg-bark-800 text-foreground focus:border-grove-500 focus:outline-none"
					>
						<option value="/">/ (root)</option>
						{#each folders.filter((f) => f !== '/') as folder}
							<option value={folder}>{folder}</option>
						{/each}
					</select>
					<button
						onclick={() => (showNewFolder = true)}
						class="text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300 text-sm font-sans"
					>
						+ New folder
					</button>
				{/if}
			</div>
		</div>

		<p class="text-xs text-foreground/40 font-sans">
			Max 50MB. Images, PDFs, videos, fonts, and code files supported.
		</p>
	</div>

	<!-- Upload Progress -->
	{#if isUploading && uploadProgress.length > 0}
		<div class="mt-4 space-y-2">
			{#each uploadProgress as item}
				<GlassCard class="flex items-center gap-3 p-3">
					<span class="text-sm font-sans text-foreground-muted flex-1 truncate">{item.name}</span>
					{#if item.progress === -1}
						<span class="text-xs text-red-500 dark:text-red-400 font-sans">Failed</span>
					{:else if item.progress === 100}
						<CheckCircle class="w-5 h-5 text-grove-500 dark:text-grove-400" />
					{:else}
						<div
							class="w-24 h-2 bg-grove-100 dark:bg-bark-700 rounded-full overflow-hidden"
							role="progressbar"
							aria-valuenow={item.progress}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label="Upload progress for {item.name}"
						>
							<div
								class="h-full bg-grove-500 dark:bg-grove-400 transition-all duration-300"
								style="width: {item.progress}%"
							></div>
						</div>
					{/if}
				</GlassCard>
			{/each}
		</div>
	{/if}
</section>

<!-- Files Grid -->
<section>
	<h2 class="text-lg font-serif text-foreground mb-4">Uploaded Files</h2>

	{#if files.length === 0}
		<GlassCard class="text-center py-12">
			<Image class="w-16 h-16 mx-auto mb-4 text-foreground/20" aria-hidden="true" />
			<p class="text-foreground-muted font-sans">No files found in database</p>
			<p class="text-sm text-foreground/40 font-sans mt-1 mb-4">
				Files may exist in storage but be missing from the database.
			</p>
			<GlassButton
				onclick={syncFromStorage}
				disabled={isSyncing}
				class="inline-flex items-center gap-2"
				aria-busy={isSyncing}
			>
				<RefreshCw class="w-4 h-4 {isSyncing ? 'animate-spin' : ''}" aria-hidden="true" />
				{isSyncing ? 'Syncing...' : 'Sync from Storage'}
			</GlassButton>
			{#if syncResult && syncResult.synced === 0 && syncResult.total === 0}
				<p class="text-sm text-foreground/40 font-sans mt-4">
					Storage bucket is empty. Drop files above to get started.
				</p>
			{/if}
		</GlassCard>
	{:else}
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
			{#each files as file (file.id)}
				{@const iconType = getFileIconType(file.content_type)}
				{@const FileTypeIcon = fileTypeIcons[iconType] || FileIcon}
				<GlassCard class="overflow-hidden hover:border-grove-300 dark:hover:border-grove-600 transition-colors group">
					<!-- Preview -->
					<div class="aspect-square bg-grove-50 dark:bg-bark-800/50 flex items-center justify-center relative">
						{#if isImage(file.content_type)}
							<img
								src={file.url}
								alt={file.alt_text || file.original_filename}
								class="w-full h-full object-cover"
							/>
						{:else}
							<FileTypeIcon class="w-12 h-12 text-grove-400 dark:text-grove-500" aria-hidden="true" />
						{/if}

						<!-- Delete Confirmation Overlay -->
						{#if deleteConfirmId === file.id}
							<div
								class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4"
								role="dialog"
								aria-modal="true"
								aria-labelledby="delete-dialog-{file.id}"
								tabindex="-1"
								onkeydown={(e) => handleDeleteDialogKeydown(e, file.id)}
							>
								<p id="delete-dialog-{file.id}" class="text-white text-sm font-sans mb-3 text-center">Delete this file?</p>
								<div class="flex gap-2">
									<button
										onclick={() => deleteFile(file.id)}
										class="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
									>
										Delete
									</button>
									<button
										onclick={() => {
											deleteConfirmId = null;
											deleteButtonRefs[file.id]?.focus();
										}}
										class="px-3 py-1.5 bg-white text-bark-900 text-sm rounded-lg hover:bg-gray-100 transition-colors"
									>
										Cancel
									</button>
								</div>
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="p-3">
						<p
							class="text-sm font-sans text-foreground truncate"
							title={file.original_filename}
						>
							{file.original_filename}
						</p>
						<div class="flex items-center gap-2 mt-1 text-xs text-foreground-muted font-sans">
							<span>{formatBytes(file.size_bytes)}</span>
							<span>-</span>
							<span>{formatDate(file.created_at)}</span>
						</div>
						{#if file.folder !== '/'}
							<p class="text-xs text-grove-600 dark:text-grove-400 font-sans mt-1">{file.folder}</p>
						{/if}

						<!-- Actions -->
						<div class="flex items-center gap-2 mt-3">
							<button
								onclick={() => copyUrl(file)}
								class="flex-1 px-2 py-1.5 text-xs font-sans bg-grove-50 dark:bg-bark-700 text-grove-700 dark:text-grove-300 rounded-lg hover:bg-grove-100 dark:hover:bg-bark-600 transition-colors flex items-center justify-center gap-1"
							>
								{#if copiedId === file.id}
									<Check class="w-3.5 h-3.5" />
									Copied!
								{:else}
									<Copy class="w-3.5 h-3.5" />
									Copy URL
								{/if}
							</button>
							<a
								href={file.url}
								target="_blank"
								rel="noopener noreferrer"
								class="p-1.5 text-foreground/40 hover:text-grove-600 dark:hover:text-grove-400 transition-colors"
								aria-label="Open {file.original_filename} in new tab"
							>
								<ExternalLink class="w-4 h-4" aria-hidden="true" />
							</a>
							<button
								bind:this={deleteButtonRefs[file.id]}
								onclick={() => (deleteConfirmId = file.id)}
								class="p-1.5 text-foreground/40 hover:text-red-500 dark:hover:text-red-400 transition-colors"
								aria-label="Delete file {file.original_filename}"
							>
								<Trash2 class="w-4 h-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				</GlassCard>
			{/each}
		</div>
	{/if}
</section>
