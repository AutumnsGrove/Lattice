<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
</script>

<svelte:head>
	<title>Sent - Ivy</title>
</svelte:head>

<div class="folder-view">
	<header class="folder-header">
		<h1>Sent</h1>
	</header>

	<div class="folder-content">
		<div class="empty-state">
			<div class="empty-icon">
				<Icon name="send" size={48} />
			</div>
			<h2>No sent emails</h2>
			<p>Emails you send will appear here</p>
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
		padding: var(--space-4) var(--space-6);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.folder-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.folder-content {
		flex: 1;
		overflow-y: auto;
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
