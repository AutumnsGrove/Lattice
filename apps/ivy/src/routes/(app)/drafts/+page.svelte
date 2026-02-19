<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
	import { isComposing } from "$lib/stores";

	// Mock draft for demo
	const drafts = [
		{
			id: "d1",
			to: "team@grove.place",
			subject: "Q1 Planning Notes",
			snippet: "Here are my thoughts on the upcoming quarter...",
			lastEdited: new Date(Date.now() - 1000 * 60 * 60 * 2),
		},
	];

	function formatDate(date: Date): string {
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));

		if (hours < 1) return "Just now";
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}
</script>

<svelte:head>
	<title>Drafts - Ivy</title>
</svelte:head>

<div class="folder-view">
	<header class="folder-header">
		<div class="header-left">
			<h1>Drafts</h1>
			{#if drafts.length > 0}
				<span class="count">{drafts.length}</span>
			{/if}
		</div>
	</header>

	<div class="folder-content">
		{#each drafts as draft (draft.id)}
			<button class="draft-item" onclick={() => isComposing.set(true)}>
				<div class="draft-content">
					<div class="draft-top">
						<span class="draft-to">To: {draft.to || "(no recipient)"}</span>
						<span class="draft-date">{formatDate(draft.lastEdited)}</span>
					</div>
					<div class="draft-subject">{draft.subject || "(no subject)"}</div>
					<div class="draft-snippet">{draft.snippet}</div>
				</div>
			</button>
		{:else}
			<div class="empty-state">
				<div class="empty-icon">
					<Icon name="file" size={48} />
				</div>
				<h2>No drafts</h2>
				<p>Drafts you save will appear here</p>
			</div>
		{/each}
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

	.count {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.folder-content {
		flex: 1;
		overflow-y: auto;
	}

	.draft-item {
		display: block;
		width: 100%;
		padding: var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
		text-align: left;
		background: transparent;
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.draft-item:hover {
		background: var(--color-surface-hover);
	}

	.draft-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.draft-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.draft-to {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.draft-date {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
	}

	.draft-subject {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.draft-snippet {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
