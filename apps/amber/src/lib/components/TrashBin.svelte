<script lang="ts">
	import type { StorageFile } from "$types";
	import FileList from "./FileList.svelte";
	import Icon from "./Icons.svelte";

	interface Props {
		files: StorageFile[];
		totalSize: number;
		onRestore: (file: StorageFile) => void;
		onDelete: (file: StorageFile) => void;
		onEmptyTrash: () => void;
		loading?: boolean;
	}

	let { files, totalSize, onRestore, onDelete, onEmptyTrash, loading = false }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	}

	let confirmEmpty = $state(false);
</script>

<div class="trash-bin">
	<div class="header">
		<div class="header-info">
			<h2>
				<Icon name="trash" size={20} />
				Trash
			</h2>
			<p class="item-count">
				{files.length} items ({formatBytes(totalSize)})
			</p>
		</div>

		{#if files.length > 0}
			{#if confirmEmpty}
				<div class="confirm-actions">
					<span class="confirm-text">Are you sure?</span>
					<button
						class="btn btn-danger"
						onclick={() => {
							onEmptyTrash();
							confirmEmpty = false;
						}}
						disabled={loading}
					>
						Yes, Empty
					</button>
					<button class="btn btn-secondary" onclick={() => (confirmEmpty = false)}> Cancel </button>
				</div>
			{:else}
				<button class="btn btn-danger" onclick={() => (confirmEmpty = true)} disabled={loading}>
					Empty Trash
				</button>
			{/if}
		{/if}
	</div>

	<FileList {files} showRestore {onRestore} {onDelete} />
</div>

<style>
	.trash-bin {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		flex-wrap: wrap;
		gap: var(--space-4);
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.header-info h2 {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.item-count {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		margin-top: var(--space-1);
	}

	.confirm-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.confirm-text {
		font-size: var(--text-sm);
		color: var(--color-error);
	}

	.btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
		border: none;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-secondary {
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
