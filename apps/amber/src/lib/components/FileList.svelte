<script lang="ts">
	import type { StorageFile } from "$types";
	import Icon from "./Icons.svelte";

	interface Props {
		files: StorageFile[];
		selectedIds?: Set<string>;
		onSelect?: (file: StorageFile) => void;
		onSelectAll?: () => void;
		onDelete?: (file: StorageFile) => void;
		onDownload?: (file: StorageFile) => void;
		onRestore?: (file: StorageFile) => void;
		showRestore?: boolean;
	}

	let {
		files,
		selectedIds = new Set(),
		onSelect,
		onSelectAll,
		onDelete,
		onDownload,
		onRestore,
		showRestore = false,
	}: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function getFileIcon(
		mimeType: string,
	): "image" | "video" | "audio" | "document" | "archive" | "file" | "folder" {
		if (mimeType.startsWith("image/")) return "image";
		if (mimeType.startsWith("video/")) return "video";
		if (mimeType.startsWith("audio/")) return "audio";
		if (mimeType === "application/pdf") return "document";
		if (mimeType.includes("zip") || mimeType.includes("7z")) return "archive";
		if (mimeType.includes("text") || mimeType.includes("markdown")) return "document";
		return "file";
	}

	const allSelected = $derived(files.length > 0 && files.every((f) => selectedIds.has(f.id)));
</script>

<div class="file-list">
	{#if files.length === 0}
		<div class="empty-state">
			<Icon name="folder" size={32} />
			<p>No files found</p>
		</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th>
						<input type="checkbox" checked={allSelected} onchange={() => onSelectAll?.()} />
					</th>
					<th>Name</th>
					<th class="hide-md">Product</th>
					<th class="hide-sm">Size</th>
					<th class="hide-lg">Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each files as file (file.id)}
					<tr class:selected={selectedIds.has(file.id)}>
						<td>
							<input
								type="checkbox"
								checked={selectedIds.has(file.id)}
								onchange={() => onSelect?.(file)}
							/>
						</td>
						<td>
							<div class="file-name-cell">
								<Icon name={getFileIcon(file.mime_type)} size={18} />
								<div>
									<p title={file.filename}>
										{file.filename}
									</p>
									<p class="product-mobile">{file.product}</p>
								</div>
							</div>
						</td>
						<td class="hide-md">
							<span class="badge">
								{file.product}
							</span>
						</td>
						<td class="hide-sm">
							{formatBytes(file.size_bytes)}
						</td>
						<td class="hide-lg">
							{formatDate(file.deleted_at || file.created_at)}
						</td>
						<td class="actions-cell">
							<div class="actions">
								{#if showRestore}
									<button class="action-btn" title="Restore" onclick={() => onRestore?.(file)}>
										<Icon name="refresh" size={18} />
									</button>
								{:else}
									<button class="action-btn" title="Download" onclick={() => onDownload?.(file)}>
										<Icon name="download" size={18} />
									</button>
								{/if}
								<button class="action-btn danger" title="Delete" onclick={() => onDelete?.(file)}>
									<Icon name="trash" size={18} />
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.file-list {
		background: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-md);
		overflow: hidden;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		background: var(--color-bg-tertiary);
		gap: var(--space-4);
		color: var(--color-text-secondary);
	}

	.empty-state p {
		font-size: var(--text-sm);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	thead {
		background: var(--color-bg-tertiary);
		border-bottom: 1px solid var(--color-border);
	}

	th {
		padding: var(--space-3);
		text-align: left;
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
	}

	th:last-child {
		text-align: right;
	}

	td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--color-border-subtle);
		color: var(--color-text-primary);
	}

	tbody tr {
		transition: background-color var(--transition-fast);
	}

	tbody tr:hover {
		background: var(--color-bg-hover);
	}

	tbody tr.selected {
		background: var(--color-primary-muted);
	}

	input[type="checkbox"] {
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		accent-color: var(--color-primary);
	}

	.file-name-cell {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.file-name-cell > div {
		flex: 1;
	}

	.file-name-cell p {
		margin: 0;
		color: var(--color-text-primary);
		font-weight: var(--font-medium);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 20rem;
	}

	.product-mobile {
		font-size: var(--text-xs) !important;
		color: var(--color-text-secondary) !important;
		font-weight: var(--font-normal) !important;
		margin-top: var(--space-1) !important;
	}

	.badge {
		display: inline-block;
		padding: var(--space-1) var(--space-2);
		font-size: var(--text-xs);
		border-radius: var(--radius-full);
		background: var(--color-bg-elevated);
		color: var(--color-text-secondary);
	}

	.actions-cell {
		text-align: right;
	}

	.actions {
		display: flex;
		gap: var(--space-1);
		justify-content: flex-end;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1);
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: background-color var(--transition-fast);
		color: var(--color-text-secondary);
	}

	.action-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.action-btn.danger:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}

	@media (max-width: 768px) {
		.hide-md {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.hide-sm {
			display: none;
		}
	}

	@media (max-width: 1024px) {
		.hide-lg {
			display: none;
		}
	}
</style>
