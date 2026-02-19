<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
</script>

<svelte:head>
	<title>Trash - Ivy</title>
</svelte:head>

<div class="folder-view">
	<header class="folder-header">
		<div class="header-left">
			<h1>Trash</h1>
		</div>
		<button class="empty-trash-btn" disabled>
			<Icon name="trash" size={16} />
			<span>Empty Trash</span>
		</button>
	</header>

	<div class="folder-content">
		<div class="notice-bar">
			<Icon name="trash" size={16} />
			<span>Items in trash will be permanently deleted after 30 days</span>
		</div>

		<div class="empty-state">
			<div class="empty-icon">
				<Icon name="trash" size={48} />
			</div>
			<h2>Trash is empty</h2>
			<p>Deleted emails will appear here for 30 days</p>
		</div>
	</div>
</div>

<style>
	.folder-view {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.folder-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.folder-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.empty-trash-btn {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		transition: all var(--transition-fast);
	}

	.empty-trash-btn:hover:not(:disabled) {
		background: var(--color-error);
		color: white;
	}

	.empty-trash-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.folder-content {
		flex: 1;
		overflow-y: auto;
	}

	.notice-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-bg-tertiary);
		border-bottom: 1px solid var(--color-border-subtle);
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		text-align: center;
		min-height: 400px;
	}

	.empty-icon {
		color: var(--color-text-muted);
		margin-bottom: var(--space-4);
	}

	.empty-state h2 {
		font-size: var(--text-lg);
		font-weight: var(--font-medium);
		color: var(--color-text-secondary);
		margin-bottom: var(--space-2);
	}

	.empty-state p {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
</style>
