<script lang="ts">
	import type { PageData } from './$types';

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

	function getFileIcon(contentType: string): string {
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

				const response = await fetch('/api/admin/cdn/upload', {
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
			const response = await fetch(`/api/admin/cdn/files/${id}`, {
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
</script>

<svelte:head>
	<title>CDN Manager - Grove Admin</title>
</svelte:head>

<div class="min-h-screen bg-cream">
	<!-- Header -->
	<header class="bg-white border-b border-grove-200 px-6 py-4">
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors" aria-label="Go to home">
					<svg class="w-8 h-8" viewBox="0 0 100 100" fill="none">
						<path
							d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
							fill="currentColor"
							fill-opacity="0.3"
						/>
						<path
							d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
							fill="currentColor"
						/>
						<path d="M50 70V85" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
					</svg>
				</a>
				<div>
					<h1 class="text-xl font-serif text-bark">CDN Manager</h1>
					<p class="text-sm text-bark/50 font-sans">{files.length} files uploaded</p>
				</div>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-bark/60 font-sans">{data.user.email}</span>
				<a
					href="/admin"
					class="text-sm text-grove-600 hover:text-grove-700 font-sans transition-colors"
				>
					Dashboard
				</a>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		<!-- Messages -->
		{#if errorMessage}
			<div
				class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between"
			>
				<span class="font-sans text-sm">{errorMessage}</span>
				<button onclick={() => (errorMessage = '')} class="text-red-500 hover:text-red-700" aria-label="Dismiss error">
					<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
						<path
							d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
						/>
					</svg>
				</button>
			</div>
		{/if}

		{#if successMessage}
			<div class="mb-6 bg-grove-50 border border-grove-200 text-grove-700 px-4 py-3 rounded-lg">
				<span class="font-sans text-sm">{successMessage}</span>
			</div>
		{/if}

		<!-- Upload Zone -->
		<section class="mb-8">
			<div
				class="border-2 border-dashed rounded-xl p-8 text-center transition-colors {isDragging
					? 'border-grove-500 bg-grove-50'
					: 'border-grove-300 hover:border-grove-400'}"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				onkeydown={handleDropZoneKeydown}
				role="button"
				tabindex="0"
				aria-label="Upload files. Press Enter or Space to browse, or drag and drop files here."
			>
				<div class="w-12 h-12 mx-auto mb-4 text-grove-400">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
						/>
					</svg>
				</div>

				<p class="text-bark/70 font-sans mb-4">
					Drag & drop files here, or
					<label class="text-grove-600 hover:text-grove-700 cursor-pointer underline">
						browse
						<input bind:this={fileInputRef} type="file" multiple class="hidden" onchange={handleFileSelect} />
					</label>
				</p>

				<!-- Folder Selection -->
				<div class="flex items-center justify-center gap-4 mb-4">
					<div class="flex items-center gap-2">
						<label for="folder-select" class="text-sm text-bark/60 font-sans">Folder:</label>
						{#if showNewFolder}
							<input
								type="text"
								bind:value={newFolderName}
								placeholder="folder-name"
								class="px-3 py-1.5 text-sm border border-grove-300 rounded-lg focus:border-grove-500 focus:outline-none"
							/>
							<button
								onclick={() => {
									showNewFolder = false;
									newFolderName = '';
								}}
								class="text-bark/50 hover:text-bark text-sm"
							>
								Cancel
							</button>
						{:else}
							<select
								id="folder-select"
								bind:value={selectedFolder}
								class="px-3 py-1.5 text-sm border border-grove-300 rounded-lg focus:border-grove-500 focus:outline-none bg-white"
							>
								<option value="/">/ (root)</option>
								{#each folders.filter((f) => f !== '/') as folder}
									<option value={folder}>{folder}</option>
								{/each}
							</select>
							<button
								onclick={() => (showNewFolder = true)}
								class="text-grove-600 hover:text-grove-700 text-sm font-sans"
							>
								+ New folder
							</button>
						{/if}
					</div>
				</div>

				<p class="text-xs text-bark/40 font-sans">
					Max 50MB. Images, PDFs, videos, fonts, and code files supported.
				</p>
			</div>

			<!-- Upload Progress -->
			{#if isUploading && uploadProgress.length > 0}
				<div class="mt-4 space-y-2">
					{#each uploadProgress as item}
						<div class="flex items-center gap-3 bg-white p-3 rounded-lg border border-grove-200">
							<span class="text-sm font-sans text-bark/70 flex-1 truncate">{item.name}</span>
							{#if item.progress === -1}
								<span class="text-xs text-red-500 font-sans">Failed</span>
							{:else if item.progress === 100}
								<svg class="w-5 h-5 text-grove-500" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
										clip-rule="evenodd"
									/>
								</svg>
							{:else}
								<div
									class="w-24 h-2 bg-grove-100 rounded-full overflow-hidden"
									role="progressbar"
									aria-valuenow={item.progress}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-label="Upload progress for {item.name}"
								>
									<div
										class="h-full bg-grove-500 transition-all duration-300"
										style="width: {item.progress}%"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Files Grid -->
		<section>
			<h2 class="text-lg font-serif text-bark mb-4">Uploaded Files</h2>

			{#if files.length === 0}
				<div class="text-center py-12 bg-white rounded-xl border border-grove-200">
					<div class="w-16 h-16 mx-auto mb-4 text-grove-300">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
							/>
						</svg>
					</div>
					<p class="text-bark/50 font-sans">No files uploaded yet</p>
					<p class="text-sm text-bark/40 font-sans mt-1">Drop files above to get started</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each files as file (file.id)}
						<div
							class="bg-white rounded-xl border border-grove-200 overflow-hidden hover:border-grove-300 transition-colors group"
						>
							<!-- Preview -->
							<div class="aspect-square bg-grove-50 flex items-center justify-center relative">
								{#if isImage(file.content_type)}
									<img
										src={file.url}
										alt={file.alt_text || file.original_filename}
										class="w-full h-full object-cover"
									/>
								{:else}
									<div class="text-grove-400">
										{#if getFileIcon(file.content_type) === 'video'}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
										{:else if getFileIcon(file.content_type) === 'audio'}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
												/>
											</svg>
										{:else if getFileIcon(file.content_type) === 'pdf'}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
												/>
											</svg>
										{:else if getFileIcon(file.content_type) === 'font'}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 19h14M8 5v14m4-14v14m4-14v14" />
											</svg>
										{:else if getFileIcon(file.content_type) === 'code'}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
												/>
											</svg>
										{:else}
											<svg class="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
												/>
											</svg>
										{/if}
									</div>
								{/if}

								<!-- Delete Confirmation Overlay -->
								{#if deleteConfirmId === file.id}
									<div
										class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4"
										role="dialog"
										aria-modal="true"
										aria-labelledby="delete-dialog-{file.id}"
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
												class="px-3 py-1.5 bg-white text-bark text-sm rounded-lg hover:bg-gray-100 transition-colors"
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
									class="text-sm font-sans text-bark truncate"
									title={file.original_filename}
								>
									{file.original_filename}
								</p>
								<div class="flex items-center gap-2 mt-1 text-xs text-bark/50 font-sans">
									<span>{formatBytes(file.size_bytes)}</span>
									<span>-</span>
									<span>{formatDate(file.created_at)}</span>
								</div>
								{#if file.folder !== '/'}
									<p class="text-xs text-grove-600 font-sans mt-1">{file.folder}</p>
								{/if}

								<!-- Actions -->
								<div class="flex items-center gap-2 mt-3">
									<button
										onclick={() => copyUrl(file)}
										class="flex-1 px-2 py-1.5 text-xs font-sans bg-grove-50 text-grove-700 rounded-lg hover:bg-grove-100 transition-colors flex items-center justify-center gap-1"
									>
										{#if copiedId === file.id}
											<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
												<path
													fill-rule="evenodd"
													d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
													clip-rule="evenodd"
												/>
											</svg>
											Copied!
										{:else}
											<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
												<path
													d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
												/>
												<path
													d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
												/>
											</svg>
											Copy URL
										{/if}
									</button>
									<a
										href={file.url}
										target="_blank"
										rel="noopener noreferrer"
										class="p-1.5 text-bark/40 hover:text-grove-600 transition-colors"
										title="Open in new tab"
									>
										<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
												clip-rule="evenodd"
											/>
											<path
												fill-rule="evenodd"
												d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
												clip-rule="evenodd"
											/>
										</svg>
									</a>
									<button
										bind:this={deleteButtonRefs[file.id]}
										onclick={() => (deleteConfirmId = file.id)}
										class="p-1.5 text-bark/40 hover:text-red-500 transition-colors"
										aria-label="Delete file {file.original_filename}"
									>
										<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
											<path
												fill-rule="evenodd"
												d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>
	</main>
</div>
