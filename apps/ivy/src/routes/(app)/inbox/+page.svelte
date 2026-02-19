<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	let { data } = $props();

	const categories = [
		{ id: "all", label: "All" },
		{ id: "important", label: "Important" },
		{ id: "actionable", label: "Actionable" },
		{ id: "fyi", label: "FYI" },
		{ id: "social", label: "Social" },
		{ id: "transactional", label: "Receipts" },
		{ id: "marketing", label: "Marketing" },
		{ id: "junk", label: "Junk" },
	];

	const categoryColors: Record<string, string> = {
		important: "var(--color-error)",
		actionable: "var(--color-warning)",
		fyi: "var(--color-primary)",
		social: "#8b5cf6",
		transactional: "var(--color-text-tertiary)",
		marketing: "#f59e0b",
		junk: "var(--color-text-muted)",
		uncategorized: "var(--color-text-muted)",
	};

	let activeCategory = $derived($page.url.searchParams.get("category") || "all");

	function selectCategory(id: string) {
		if (id === "all") {
			goto("/inbox");
		} else {
			goto(`/inbox?category=${id}`);
		}
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
		} else if (days === 1) {
			return "Yesterday";
		} else if (days < 7) {
			return date.toLocaleDateString("en-US", { weekday: "short" });
		} else {
			return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
		}
	}

	function getUnreadCount(categoryId: string): number {
		if (!data.stats) return 0;
		if (categoryId === "all") {
			return Object.values(data.stats).reduce(
				(sum: number, s: { unread: number }) => sum + s.unread,
				0,
			);
		}
		return data.stats[categoryId]?.unread || 0;
	}

	function openEmail(id: string) {
		goto(`/thread/${id}`);
	}
</script>

<svelte:head>
	<title>Inbox - Ivy</title>
</svelte:head>

<div class="inbox">
	<header class="inbox-header">
		<div class="header-left">
			<h1>Inbox</h1>
			<span class="unread-count">{getUnreadCount("all")} unread</span>
		</div>
		<div class="header-actions">
			<button class="action-btn" title="Refresh" onclick={() => goto("/inbox" + $page.url.search)}>
				<Icon name="inbox" size={18} />
			</button>
		</div>
	</header>

	<!-- Category Tabs -->
	<div class="category-tabs" role="tablist">
		{#each categories as cat}
			{@const unread = getUnreadCount(cat.id)}
			<button
				class="tab"
				class:active={activeCategory === cat.id}
				role="tab"
				aria-selected={activeCategory === cat.id}
				onclick={() => selectCategory(cat.id)}
			>
				<span class="tab-label">{cat.label}</span>
				{#if unread > 0}
					<span
						class="tab-badge"
						style="background: {categoryColors[cat.id] || 'var(--color-primary)'}"
					>
						{unread}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Email List -->
	<div class="email-list">
		{#each data.emails as email (email.id)}
			<div
				class="email-item"
				class:unread={!email.is_read}
				onclick={() => openEmail(email.id)}
				onkeydown={(e) => e.key === "Enter" && openEmail(email.id)}
				role="button"
				tabindex="0"
			>
				<div
					class="email-category-dot"
					style="background: {categoryColors[email.category] || 'var(--color-text-muted)'}"
				></div>

				<div class="email-content">
					<div class="email-top">
						<span class="email-from">{email.from}</span>
						<span class="email-date">{formatDate(email.created_at)}</span>
					</div>

					<div class="email-middle">
						<span class="email-subject">{email.subject}</span>
						{#if email.category && email.category !== "uncategorized"}
							<span
								class="email-category-badge"
								style="color: {categoryColors[email.category]}; border-color: {categoryColors[
									email.category
								]}"
							>
								{email.category}
							</span>
						{/if}
					</div>

					{#if email.snippet}
						<div class="email-bottom">
							<span class="email-snippet">{email.snippet}</span>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="empty-state">
				<div class="empty-icon">
					<Icon name="inbox" size={48} />
				</div>
				{#if activeCategory !== "all"}
					<h2>No {activeCategory} emails</h2>
					<p>Emails classified as "{activeCategory}" will appear here</p>
				{:else}
					<h2>Your inbox is empty</h2>
					<p>Forwarded emails will appear here once triage is configured</p>
				{/if}
			</div>
		{/each}
	</div>

	{#if data.total > data.emails.length}
		<div class="load-more">
			<span class="load-more-text">Showing {data.emails.length} of {data.total}</span>
		</div>
	{/if}
</div>

<style>
	.inbox {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.inbox-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4) var(--space-6);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
	}

	.header-left {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
	}

	.inbox-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.unread-count {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.header-actions {
		display: flex;
		gap: var(--space-2);
	}

	.action-btn {
		padding: var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}

	.action-btn:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	/* Category Tabs */
	.category-tabs {
		display: flex;
		gap: var(--space-1);
		padding: var(--space-2) var(--space-4);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	.category-tabs::-webkit-scrollbar {
		display: none;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		white-space: nowrap;
		transition: all var(--transition-fast);
		min-height: 36px;
	}

	.tab:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.tab.active {
		background: var(--color-primary-muted);
		color: var(--color-primary);
		font-weight: var(--font-medium);
	}

	.tab-badge {
		font-size: 11px;
		font-weight: var(--font-semibold);
		color: white;
		padding: 1px 6px;
		border-radius: var(--radius-full);
		min-width: 18px;
		text-align: center;
		line-height: 1.4;
	}

	/* Email List */
	.email-list {
		flex: 1;
		overflow-y: auto;
	}

	.email-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: background var(--transition-fast);
		text-align: left;
		background: transparent;
	}

	.email-item:hover {
		background: var(--color-surface-hover);
	}

	.email-item.unread {
		background: var(--color-bg-tertiary);
	}

	.email-item.unread:hover {
		background: var(--color-surface-hover);
	}

	.email-category-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		margin-top: 8px;
		flex-shrink: 0;
	}

	.email-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.email-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.email-from {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.email-item.unread .email-from {
		font-weight: var(--font-semibold);
	}

	.email-date {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}

	.email-item.unread .email-date {
		color: var(--color-primary);
		font-weight: var(--font-medium);
	}

	.email-middle {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.email-subject {
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.email-item.unread .email-subject {
		font-weight: var(--font-medium);
	}

	.email-category-badge {
		font-size: 10px;
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 1px 6px;
		border: 1px solid;
		border-radius: var(--radius-sm);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.email-bottom {
		display: flex;
	}

	.email-snippet {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Load More */
	.load-more {
		padding: var(--space-3) var(--space-4);
		text-align: center;
		border-top: 1px solid var(--color-border-subtle);
		background: var(--color-bg-secondary);
	}

	.load-more-text {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-16);
		text-align: center;
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

	@media (max-width: 767px) {
		.inbox-header {
			padding: var(--space-3) var(--space-4);
		}

		.category-tabs {
			padding: var(--space-2) var(--space-3);
		}

		.tab {
			min-height: 44px;
		}
	}
</style>
