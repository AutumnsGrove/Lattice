<script lang="ts">
	import { onMount } from "svelte";
	import StorageMeter from "$lib/components/StorageMeter.svelte";
	import UsageBreakdown from "$lib/components/UsageBreakdown.svelte";
	import AddStorageModal from "$lib/components/AddStorageModal.svelte";
	import Icon from "$lib/components/Icons.svelte";
	import * as api from "$lib/api";
	import type { QuotaStatus, UsageBreakdown as UsageBreakdownType, StorageFile } from "$types";

	// State
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Storage data
	let quota = $state<QuotaStatus | null>(null);
	let breakdown = $state<UsageBreakdownType[]>([]);
	let recentFiles = $state<StorageFile[]>([]);
	let totalFiles = $state(0);
	let trashCount = $state(0);

	// UI state
	let showAddStorageModal = $state(false);

	// Load data
	async function loadData() {
		loading = true;
		error = null;

		try {
			const [storageRes, filesRes, trashRes] = await Promise.all([
				api.getStorageInfo(),
				api.getFiles({ sort: "created_at", order: "desc" }),
				api.getTrash(),
			]);

			if (storageRes.error) throw new Error(storageRes.error);
			if (filesRes.error) throw new Error(filesRes.error);
			if (trashRes.error) throw new Error(trashRes.error);

			quota = storageRes.data!.quota;
			breakdown = storageRes.data!.breakdown;
			recentFiles = filesRes.data!.files.slice(0, 6);
			totalFiles = filesRes.data!.total;
			trashCount = trashRes.data!.files.length;
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load data";
		} finally {
			loading = false;
		}
	}

	async function handlePurchaseAddon(addonType: string) {
		const res = await api.purchaseAddon(addonType);
		if (res.error) {
			alert(res.error);
			return;
		}
		if (res.data?.redirect_url) {
			window.location.href = res.data.redirect_url;
		}
		showAddStorageModal = false;
	}

	onMount(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>Dashboard - Amber</title>
</svelte:head>

<div class="dashboard">
	<div class="page-header">
		<div>
			<h1>Dashboard</h1>
			<p class="subtitle">Your Grove storage at a glance</p>
		</div>
		<div class="header-actions">
			<button class="btn btn-secondary" onclick={() => loadData()}>
				<Icon name="refresh" size={16} />
				<span>Refresh</span>
			</button>
			<button class="btn btn-primary" onclick={() => (showAddStorageModal = true)}>
				<Icon name="plus" size={16} />
				<span>Add Storage</span>
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

	{#if loading && !quota}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading your storage...</p>
		</div>
	{:else if quota}
		<!-- Storage Overview -->
		<div class="overview-grid">
			<div class="card storage-card">
				<StorageMeter {quota} />
			</div>
			<div class="card breakdown-card">
				<UsageBreakdown {breakdown} totalBytes={quota.used_bytes} />
			</div>
		</div>

		<!-- Quick Stats -->
		<div class="stats-grid">
			<a href="/files" class="stat-card">
				<div class="stat-icon">
					<Icon name="folder" size={24} />
				</div>
				<div class="stat-content">
					<span class="stat-value">{totalFiles}</span>
					<span class="stat-label">Total Files</span>
				</div>
			</a>
			<a href="/trash" class="stat-card">
				<div class="stat-icon trash">
					<Icon name="trash" size={24} />
				</div>
				<div class="stat-content">
					<span class="stat-value">{trashCount}</span>
					<span class="stat-label">In Trash</span>
				</div>
			</a>
			<div class="stat-card">
				<div class="stat-icon storage">
					<Icon name="storage" size={24} />
				</div>
				<div class="stat-content">
					<span class="stat-value">{quota.total_gb} GB</span>
					<span class="stat-label">Total Storage</span>
				</div>
			</div>
		</div>

		<!-- Recent Files -->
		{#if recentFiles.length > 0}
			<div class="section">
				<div class="section-header">
					<h2>Recent Files</h2>
					<a href="/files" class="view-all">
						View all
						<Icon name="chevron-right" size={16} />
					</a>
				</div>
				<div class="recent-files-grid">
					{#each recentFiles as file}
						<div class="file-card">
							<div class="file-icon">
								<Icon name="file" size={24} />
							</div>
							<div class="file-info">
								<span class="file-name">{file.filename}</span>
								<span class="file-meta">{file.product}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<AddStorageModal
	open={showAddStorageModal}
	onClose={() => (showAddStorageModal = false)}
	onPurchase={handlePurchaseAddon}
	currentStorageGb={quota?.total_gb ?? 0}
/>

<style>
	.dashboard {
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

	.btn-secondary {
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
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

	.error-banner button:hover {
		background: rgba(248, 113, 113, 0.2);
	}

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

	/* Overview Grid */
	.overview-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	@media (max-width: 900px) {
		.overview-grid {
			grid-template-columns: 1fr;
		}
	}

	.card {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-4);
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}

	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: var(--space-4);
		transition: all var(--transition-fast);
	}

	.stat-card:hover {
		border-color: var(--color-primary);
		background: var(--color-surface-hover);
	}

	.stat-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-lg);
	}

	.stat-icon.trash {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	.stat-icon.storage {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.stat-label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-6);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-4);
	}

	.section-header h2 {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.view-all {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-primary);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		transition: color var(--transition-fast);
	}

	.view-all:hover {
		color: var(--color-primary-hover);
	}

	/* Recent Files Grid */
	.recent-files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-3);
	}

	.file-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: var(--space-3);
		transition: all var(--transition-fast);
	}

	.file-card:hover {
		border-color: var(--color-border-strong);
		background: var(--color-surface-hover);
	}

	.file-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
	}

	.file-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.file-name {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.file-meta {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
		text-transform: capitalize;
	}
</style>
