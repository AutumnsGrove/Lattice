<script lang="ts">
	import { onMount } from "svelte";
	import TrashBin from "$lib/components/TrashBin.svelte";
	import Icon from "$lib/components/Icons.svelte";
	import * as api from "$lib/api";
	import type { StorageFile } from "$types";

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let trashFiles = $state<StorageFile[]>([]);
	let trashSize = $state(0);

	// Load data
	async function loadData() {
		loading = true;
		error = null;

		try {
			const res = await api.getTrash();
			if (res.error) throw new Error(res.error);

			trashFiles = res.data!.files;
			trashSize = res.data!.total_size;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load trash";
		} finally {
			loading = false;
		}
	}

	async function handleRestore(file: StorageFile) {
		const res = await api.restoreFile(file.id);
		if (res.error) {
			alert(res.error);
			return;
		}
		await loadData();
	}

	async function handlePermanentDelete(file: StorageFile) {
		if (!confirm(`Permanently delete "${file.filename}"? This cannot be undone.`)) return;

		const res = await api.permanentlyDeleteFile(file.id);
		if (res.error) {
			alert(res.error);
			return;
		}
		await loadData();
	}

	async function handleEmptyTrash() {
		if (!confirm("Empty trash? All files will be permanently deleted.")) return;

		const res = await api.emptyTrash();
		if (res.error) {
			alert(res.error);
			return;
		}
		await loadData();
	}

	onMount(() => {
		loadData();
	});

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	}
</script>

<svelte:head>
	<title>Trash - Amber</title>
</svelte:head>

<div class="trash-page">
	<div class="page-header">
		<div>
			<h1>Trash</h1>
			<p class="subtitle">
				{trashFiles.length} files ({formatBytes(trashSize)})
			</p>
		</div>
		{#if trashFiles.length > 0}
			<div class="header-actions">
				<button class="btn btn-danger" onclick={handleEmptyTrash}>
					<Icon name="trash" size={16} />
					<span>Empty Trash</span>
				</button>
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-banner">
			<span>{error}</span>
			<button onclick={() => (error = null)}>
				<Icon name="x" size={16} />
			</button>
		</div>
	{/if}

	<div class="info-banner">
		<Icon name="trash" size={16} />
		<span>Files in trash are automatically deleted after 30 days</span>
	</div>

	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading trash...</p>
		</div>
	{:else if trashFiles.length === 0}
		<div class="empty-state">
			<Icon name="trash" size={48} />
			<h2>Trash is empty</h2>
			<p>Deleted files will appear here</p>
		</div>
	{:else}
		<TrashBin
			files={trashFiles}
			totalSize={trashSize}
			onRestore={handleRestore}
			onDelete={handlePermanentDelete}
			onEmptyTrash={handleEmptyTrash}
		/>
	{/if}
</div>

<style>
	.trash-page {
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

	.btn-danger {
		background: var(--color-error);
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
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

	.info-banner {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-4);
		color: var(--color-warning);
		font-size: var(--text-sm);
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
	}
</style>
