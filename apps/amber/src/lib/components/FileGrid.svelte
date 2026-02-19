<script lang="ts">
	import type { StorageFile } from "$types";
	import Icon from "./Icons.svelte";

	interface Props {
		files: StorageFile[];
		selectedIds?: Set<string>;
		onSelect?: (file: StorageFile) => void;
		onDelete?: (file: StorageFile) => void;
		onDownload?: (file: StorageFile) => void;
		onPreview?: (file: StorageFile) => void;
	}

	let {
		files,
		selectedIds = new Set(),
		onSelect,
		onDelete,
		onDownload,
		onPreview,
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
		});
	}

	function getFileIcon(
		mimeType: string,
	): "image" | "video" | "audio" | "document" | "archive" | "file" {
		if (mimeType.startsWith("image/")) return "image";
		if (mimeType.startsWith("video/")) return "video";
		if (mimeType.startsWith("audio/")) return "audio";
		if (mimeType === "application/pdf") return "document";
		if (mimeType.includes("zip") || mimeType.includes("7z")) return "archive";
		if (mimeType.includes("text") || mimeType.includes("markdown")) return "document";
		return "file";
	}

	function isImage(mimeType: string): boolean {
		return mimeType.startsWith("image/");
	}
</script>

<div class="file-grid">
	{#if files.length === 0}
		<div class="empty-state">
			<Icon name="folder" size={48} />
			<p class="empty-text">No files found</p>
		</div>
	{:else}
		<div class="files-container">
			{#each files as file (file.id)}
				<div
					class="file-card"
					class:selected={selectedIds.has(file.id)}
					role="button"
					tabindex="0"
					onclick={() => onSelect?.(file)}
					onkeypress={(e) => e.key === "Enter" && onSelect?.(file)}
				>
					<div
						class="file-preview"
						role="button"
						tabindex="0"
						onclick={(e) => {
							e.stopPropagation();
							onPreview?.(file);
						}}
						onkeypress={(e) => {
							if (e.key === "Enter") {
								e.stopPropagation();
								onPreview?.(file);
							}
						}}
					>
						<div class="icon-placeholder">
							<Icon name={getFileIcon(file.mime_type)} size={48} />
						</div>
					</div>

					<div class="file-info">
						<p class="filename" title={file.filename}>{file.filename}</p>
						<p class="file-meta">
							<span>{formatBytes(file.size_bytes)}</span>
							<span>•</span>
							<span>{formatDate(file.created_at)}</span>
						</p>
					</div>

					<div class="file-actions">
						<button
							class="action-btn"
							title="Download"
							onclick={(e) => {
								e.stopPropagation();
								onDownload?.(file);
							}}
						>
							<Icon name="download" size={16} />
						</button>
						<button
							class="action-btn danger"
							title="Delete"
							onclick={(e) => {
								e.stopPropagation();
								onDelete?.(file);
							}}
						>
							<Icon name="trash" size={16} />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.file-grid {
		padding: var(--space-4);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		background: var(--color-bg-secondary);
		border-radius: var(--radius-xl);
		color: var(--color-text-secondary);
	}

	.empty-text {
		margin-top: var(--space-2);
		color: var(--color-text-secondary);
	}

	.files-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: var(--space-4);
	}

	.file-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
		cursor: pointer;
		transition: all var(--transition-base);
		display: flex;
		flex-direction: column;
	}

	.file-card:hover {
		border-color: var(--color-primary);
		box-shadow: 0 2px 8px var(--color-primary-muted);
	}

	.file-card:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.file-card.selected {
		border-color: var(--color-primary);
		background: var(--color-bg-elevated);
	}

	.file-preview {
		aspect-ratio: 4/3;
		background: var(--color-bg-tertiary);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.icon-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: var(--color-text-secondary);
	}

	.file-info {
		padding: var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	.filename {
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--color-text-primary);
	}

	.file-meta {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
		margin-top: var(--space-1);
		display: flex;
		gap: var(--space-2);
		align-items: center;
	}

	.file-actions {
		display: flex;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-top: 1px solid var(--color-border-subtle);
		background: var(--color-bg-tertiary);
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-1);
		border: none;
		background: none;
		cursor: pointer;
		border-radius: var(--radius-md);
		transition:
			background var(--transition-fast),
			color var(--transition-fast);
		color: var(--color-text-secondary);
	}

	.action-btn:hover {
		background: var(--color-bg-hover);
		color: var(--color-text-primary);
	}

	.action-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: -2px;
	}

	.action-btn.danger:hover {
		background: var(--color-error-muted);
		color: var(--color-error);
	}
</style>
