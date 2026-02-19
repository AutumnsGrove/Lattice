<script lang="ts">
	import { onMount, untrack } from "svelte";
	import FileGrid from "$lib/components/FileGrid.svelte";
	import FileList from "$lib/components/FileList.svelte";
	import Icon from "$lib/components/Icons.svelte";
	import * as api from "$lib/api";
	import type { StorageFile } from "$types";
	import { searchQuery } from "$lib/stores";

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let files = $state<StorageFile[]>([]);
	let totalFiles = $state(0);
	let initialized = $state(false);

	// UI state
	let viewMode = $state<"grid" | "list">("grid");
	let selectedIds = $state<Set<string>>(new Set());
	let productFilter = $state<string>("");
	let sortBy = $state<"created_at" | "size_bytes" | "filename">("created_at");
	let sortOrder = $state<"asc" | "desc">("desc");

	// Load data
	async function loadData() {
		loading = true;
		error = null;

		try {
			const res = await api.getFiles({
				product: productFilter || undefined,
				search: $searchQuery || undefined,
				sort: sortBy,
				order: sortOrder,
			});

			if (res.error) throw new Error(res.error);

			files = res.data!.files;
			totalFiles = res.data!.total;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load files";
		} finally {
			loading = false;
		}
	}

	// File actions
	async function handleDelete(file: StorageFile) {
		const res = await api.deleteFile(file.id);
		if (res.error) {
			alert(res.error);
			return;
		}
		await loadData();
	}

	function handleDownload(file: StorageFile) {
		const url = api.getDownloadUrl(file.r2_key);
		window.open(url, "_blank");
	}

	function handleSelect(file: StorageFile) {
		const newSelected = new Set(selectedIds);
		if (newSelected.has(file.id)) {
			newSelected.delete(file.id);
		} else {
			newSelected.add(file.id);
		}
		selectedIds = newSelected;
	}

	function handleSelectAll() {
		if (selectedIds.size === files.length) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(files.map((f) => f.id));
		}
	}

	// Reload when filters change (but not on initial load)
	$effect(() => {
		// Track these dependencies
		const query = $searchQuery;
		const product = productFilter;
		const sort = sortBy;
		const order = sortOrder;

		// Only reload if already initialized
		if (untrack(() => initialized)) {
			loadData();
		}
	});

	onMount(() => {
		loadData().then(() => {
			initialized = true;
		});
	});
</script>

<svelte:head>
	<title>Files - Amber</title>
</svelte:head>

<div class="files-page">
	<div class="page-header">
		<div>
			<h1>Files</h1>
			<p class="subtitle">{totalFiles} files stored</p>
		</div>
		<div class="header-actions">
			<button class="btn btn-primary">
				<Icon name="upload" size={16} />
				<span>Upload</span>
			</button>
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={() => (error = null)}>
				<Icon name="x" size={16} />
			</button>
		</div>
	{/if}

	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-left">
			<select bind:value={productFilter} class="filter-select">
				<option value="">All Products</option>
				<option value="blog">Blog</option>
				<option value="ivy">Email (Ivy)</option>
				<option value="profile">Profile</option>
				<option value="themes">Themes</option>
			</select>
			<select bind:value={sortBy} class="filter-select">
				<option value="created_at">Date</option>
				<option value="size_bytes">Size</option>
				<option value="filename">Name</option>
			</select>
		</div>
		<div class="toolbar-right">
			<button
				class="view-btn"
				class:active={viewMode === "grid"}
				onclick={() => (viewMode = "grid")}
				title="Grid view"
			>
				<Icon name="grid" size={18} />
			</button>
			<button
				class="view-btn"
				class:active={viewMode === "list"}
				onclick={() => (viewMode = "list")}
				title="List view"
			>
				<Icon name="list" size={18} />
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading files...</p>
		</div>
	{:else if files.length === 0}
		<div class="empty-state">
			<Icon name="folder" size={48} />
			<h2>No files yet</h2>
			<p>Upload your first file to get started</p>
			<button class="btn btn-primary">
				<Icon name="upload" size={16} />
				<span>Upload Files</span>
			</button>
		</div>
	{:else if viewMode === "grid"}
		<FileGrid
			{files}
			{selectedIds}
			onSelect={handleSelect}
			onDelete={handleDelete}
			onDownload={handleDownload}
		/>
	{:else}
		<FileList
			{files}
			{selectedIds}
			onSelect={handleSelect}
			onSelectAll={handleSelectAll}
			onDelete={handleDelete}
			onDownload={handleDownload}
		/>
	{/if}
</div>

<style>
	.files-page {
		padding: var(--space-6);
		max-width: 1200px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: var(--space-6);
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.page-header h1 {
		font-size: var(--text-2xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.subtitle {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		margin-top: var(--space-1);
	}

	.header-actions {
		display: flex;
		gap: var(--space-3);
	}

	.btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-lg);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
	}

	.btn-primary {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}

	.btn-primary:hover {
		background: var(--color-primary-hover);
	}

	.error-banner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3) var(--space-4);
		background: var(--color-error-muted);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		color: var(--color-error);
	}

	.error-banner button {
		color: var(--color-error);
		padding: var(--space-1);
		border-radius: var(--radius-md);
	}

	/* Toolbar */
	.toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-4);
		margin-bottom: var(--space-4);
		flex-wrap: wrap;
	}

	.toolbar-left,
	.toolbar-right {
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.filter-select {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.view-btn {
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.view-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.view-btn.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
		border-color: var(--color-primary);
	}

	/* Loading */
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		gap: var(--space-4);
		color: var(--color-text-secondary);
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		gap: var(--space-4);
		color: var(--color-text-tertiary);
		text-align: center;
	}

	.empty-state h2 {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.empty-state p {
		color: var(--color-text-secondary);
		margin-bottom: var(--space-2);
	}
</style>
