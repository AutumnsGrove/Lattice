<script lang="ts">
	/**
	 * Safety Dashboard
	 *
	 * Wayfinder-only page showing combined Petal (image) and Thorn (text)
	 * moderation metrics with a flagged content review queue.
	 */

	import { enhance } from '$app/forms';
	import {
		Shield,
		ShieldAlert,
		ShieldCheck,
		Eye,
		AlertTriangle,
		CheckCircle,
		XCircle,
		Activity,
		Clock
	} from 'lucide-svelte';
	import { GlassCard, GroveTerm } from '$lib/ui';

	let { data, form } = $props();

	let thornStats = $derived(data.thornStats);
	let petalBlocks = $derived(data.petalBlocks);
	let thornFlagged = $derived(data.thornFlagged);
	let thornRecent = $derived(data.thornRecent);
	let petalFlags = $derived(data.petalFlags);

	// Format timestamp for display
	function formatTime(ts: string): string {
		try {
			const d = new Date(ts);
			return d.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
		} catch {
			return ts;
		}
	}

	// Action badge styling
	function actionClass(action: string): string {
		switch (action) {
			case 'allow':
				return 'bg-green-500/20 text-green-300 border-green-500/30';
			case 'warn':
				return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
			case 'flag_review':
				return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
			case 'block':
				return 'bg-red-500/20 text-red-300 border-red-500/30';
			default:
				return 'bg-slate-500/20 text-foreground-faint border-slate-500/30';
		}
	}

	function actionLabel(action: string): string {
		switch (action) {
			case 'allow': return 'Allowed';
			case 'warn': return 'Warned';
			case 'flag_review': return 'Flagged';
			case 'block': return 'Blocked';
			default: return action;
		}
	}

	// Parse categories from JSON string (validated as string array, bounded)
	function parseCategories(cats: string | null): string[] {
		if (!cats) return [];
		try {
			const parsed = JSON.parse(cats);
			if (!Array.isArray(parsed)) return [];
			return parsed.filter((c): c is string => typeof c === 'string').slice(0, 20);
		} catch {
			return [];
		}
	}
</script>

<div class="safety-dashboard">
	<div class="dashboard-header">
		<div class="header-title">
			<Shield class="header-icon" />
			<div>
				<h1>Safety Dashboard</h1>
				<p class="header-subtitle"><GroveTerm term="thorn">Thorn</GroveTerm> (text) + <GroveTerm term="petal">Petal</GroveTerm> (image) moderation overview</p>
			</div>
		</div>
	</div>

	{#if form?.success}
		<div class="success-banner">
			<CheckCircle class="banner-icon" />
			<span>{form.message}</span>
		</div>
	{/if}

	{#if form?.error}
		<div class="error-banner">
			<AlertTriangle class="banner-icon" />
			<span>{form.error}</span>
		</div>
	{/if}

	<!-- Overview Cards -->
	<div class="stats-grid">
		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon">
					<Activity class="icon-sm" />
				</div>
				<div class="stat-content">
					<span class="stat-value">{thornStats.total}</span>
					<span class="stat-label">Total Scans (30d)</span>
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon stat-pass">
					<ShieldCheck class="icon-sm" />
				</div>
				<div class="stat-content">
					<span class="stat-value">{thornStats.passRate}%</span>
					<span class="stat-label">Pass Rate</span>
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon stat-flag">
					<ShieldAlert class="icon-sm" />
				</div>
				<div class="stat-content">
					<span class="stat-value">{thornStats.flagged + thornStats.warned}</span>
					<span class="stat-label">Flagged / Warned</span>
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon stat-block">
					<XCircle class="icon-sm" />
				</div>
				<div class="stat-content">
					<span class="stat-value">{thornStats.blocked}</span>
					<span class="stat-label">Blocked</span>
				</div>
			</div>
		</GlassCard>
	</div>

	<!-- Two-column layout for Thorn and Petal sections -->
	<div class="two-column">
		<!-- Thorn Section -->
		<GlassCard>
			<div class="section-header">
				<Shield class="section-icon" />
				<h2><GroveTerm term="thorn">Thorn</GroveTerm> &mdash; Text Moderation</h2>
			</div>

			{#if thornStats.byCategory.length > 0}
				<h3 class="subsection-title">Flagged Categories (30d)</h3>
				<div class="category-list">
					{#each thornStats.byCategory as cat}
						<div class="category-row">
							<span class="category-name">{cat.category}</span>
							<span class="category-count">{cat.count}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">No flagged categories in the last 30 days</p>
			{/if}

			{#if thornStats.byContentType.length > 0}
				<h3 class="subsection-title">By Content Type (30d)</h3>
				<div class="category-list">
					{#each thornStats.byContentType as ct}
						<div class="category-row">
							<span class="category-name">{ct.content_type}</span>
							<span class="category-count">{ct.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>

		<!-- Petal Section -->
		<GlassCard>
			<div class="section-header">
				<Eye class="section-icon" />
				<h2><GroveTerm term="petal">Petal</GroveTerm> &mdash; Image Moderation</h2>
			</div>

			{#if petalBlocks.length > 0}
				<h3 class="subsection-title">Blocked Categories (30d)</h3>
				<div class="category-list">
					{#each petalBlocks as block}
						<div class="category-row">
							<span class="category-name">{block.category}</span>
							<span class="category-count">{block.count}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">No image blocks in the last 30 days</p>
			{/if}

			{#if petalFlags.length > 0}
				<h3 class="subsection-title">Account Flags (pending)</h3>
				<div class="flag-list">
					{#each petalFlags as flag}
						<div class="flag-row">
							<div class="flag-info">
								<span class="flag-type">{flag.flag_type}</span>
								<span class="flag-user">{flag.user_id}</span>
							</div>
							<span class="flag-time">{formatTime(flag.created_at)}</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="empty-state">No pending account flags</p>
			{/if}
		</GlassCard>
	</div>

	<!-- Flagged Content Review Queue -->
	<GlassCard>
		<div class="section-header">
			<ShieldAlert class="section-icon" />
			<h2>Flagged Content Queue</h2>
			{#if thornFlagged.length > 0}
				<span class="queue-count">{thornFlagged.length} pending</span>
			{/if}
		</div>

		{#if thornFlagged.length > 0}
			<div class="queue-table">
				<div class="queue-header-row">
					<span class="queue-col-type">Type</span>
					<span class="queue-col-ref">Reference</span>
					<span class="queue-col-action">Action</span>
					<span class="queue-col-categories">Categories</span>
					<span class="queue-col-confidence">Conf.</span>
					<span class="queue-col-time">Time</span>
					<span class="queue-col-actions">Review</span>
				</div>
				{#each thornFlagged as flag}
					<div class="queue-row">
						<span class="queue-col-type">{flag.content_type}</span>
						<span class="queue-col-ref">{flag.content_ref || '—'}</span>
						<span class="queue-col-action">
							<span class="action-badge {actionClass(flag.action)}">{actionLabel(flag.action)}</span>
						</span>
						<span class="queue-col-categories">
							{#each parseCategories(flag.categories) as cat}
								<span class="cat-tag">{cat}</span>
							{/each}
						</span>
						<span class="queue-col-confidence">{flag.confidence ? `${Math.round(flag.confidence * 100)}%` : '—'}</span>
						<span class="queue-col-time">{formatTime(flag.created_at)}</span>
						<span class="queue-col-actions">
							<form method="POST" action="?/reviewFlag" use:enhance class="review-form">
								<input type="hidden" name="flag_id" value={flag.id} />
								<button type="submit" name="action" value="cleared" class="btn-clear" title="Clear - content is safe">
									<CheckCircle class="btn-icon" />
								</button>
								<button type="submit" name="action" value="removed" class="btn-remove" title="Remove - content violates policy">
									<XCircle class="btn-icon" />
								</button>
							</form>
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-state">No content pending review</p>
		{/if}
	</GlassCard>

	<!-- Recent Activity -->
	<GlassCard>
		<div class="section-header">
			<Clock class="section-icon" />
			<h2>Recent Activity (7d)</h2>
		</div>

		{#if thornRecent.length > 0}
			<div class="activity-list">
				{#each thornRecent as event}
					<div class="activity-row">
						<span class="action-badge {actionClass(event.action)}">{actionLabel(event.action)}</span>
						<span class="activity-type">{event.content_type}</span>
						<span class="activity-ref">{event.content_ref || ''}</span>
						{#each parseCategories(event.categories) as cat}
							<span class="cat-tag">{cat}</span>
						{/each}
						<span class="activity-time">{formatTime(event.timestamp)}</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="empty-state">No moderation activity in the last 7 days</p>
		{/if}
	</GlassCard>
</div>

<style>
	.safety-dashboard {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.dashboard-header {
		margin-bottom: 0.5rem;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	:global(.header-icon) {
		width: 2rem;
		height: 2rem;
		color: var(--user-accent, var(--color-primary));
	}

	.header-title h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text);
	}

	.header-subtitle {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		margin: 0.125rem 0 0;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		padding: 0.75rem;
		border-radius: var(--border-radius-button);
		background: var(--grove-overlay-8);
	}

	.stat-icon.stat-pass {
		background: rgba(34, 197, 94, 0.15);
	}

	.stat-icon.stat-flag {
		background: rgba(249, 115, 22, 0.15);
	}

	.stat-icon.stat-block {
		background: rgba(239, 68, 68, 0.15);
	}

	:global(.icon-sm) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.stat-content {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1.2;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Two-column layout */
	.two-column {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1.5rem;
	}

	/* Section headers */
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	:global(.section-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--user-accent, var(--color-primary));
	}

	.section-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.queue-count {
		margin-left: auto;
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius-small);
		background: rgba(249, 115, 22, 0.2);
		color: rgb(249, 115, 22);
	}

	.subsection-title {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		margin: 1rem 0 0.5rem;
	}

	/* Category lists */
	.category-list {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.category-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0.5rem;
		border-radius: var(--border-radius-small);
		transition: background 0.15s;
	}

	.category-row:hover {
		background: var(--grove-overlay-5);
	}

	.category-name {
		font-size: 0.875rem;
		color: var(--color-text);
	}

	.category-count {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	/* Flag lists */
	.flag-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.flag-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		border-radius: var(--border-radius-small);
		background: var(--grove-overlay-5);
	}

	.flag-info {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.flag-type {
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		border-radius: var(--border-radius-small);
		background: rgba(239, 68, 68, 0.2);
		color: rgb(239, 68, 68);
	}

	.flag-user {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-family: monospace;
	}

	.flag-time {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Queue table */
	.queue-table {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.queue-header-row {
		display: grid;
		grid-template-columns: 100px 1fr 80px 1fr 60px 110px 80px;
		gap: 0.5rem;
		padding: 0.5rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		border-bottom: 1px solid var(--grove-border-subtle);
	}

	.queue-row {
		display: grid;
		grid-template-columns: 100px 1fr 80px 1fr 60px 110px 80px;
		gap: 0.5rem;
		padding: 0.5rem;
		align-items: center;
		border-radius: var(--border-radius-small);
		font-size: 0.85rem;
		transition: background 0.15s;
	}

	.queue-row:hover {
		background: var(--grove-overlay-5);
	}

	.queue-col-type {
		color: var(--color-text-muted);
		font-size: 0.8rem;
	}

	.queue-col-ref {
		color: var(--color-text);
		font-family: monospace;
		font-size: 0.8rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.queue-col-confidence {
		text-align: center;
		font-family: monospace;
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.queue-col-time {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	/* Action badges */
	.action-badge {
		display: inline-block;
		font-size: 0.7rem;
		padding: 0.125rem 0.375rem;
		border-radius: var(--border-radius-small);
		border: 1px solid;
		font-weight: 500;
	}

	/* Category tags */
	.cat-tag {
		display: inline-block;
		font-size: 0.7rem;
		padding: 0.0625rem 0.3rem;
		margin: 0 0.125rem;
		border-radius: var(--border-radius-small);
		background: var(--grove-overlay-8);
		color: var(--color-text-muted);
	}

	/* Review buttons */
	.review-form {
		display: flex;
		gap: 0.25rem;
	}

	.btn-clear,
	.btn-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		border: none;
		border-radius: var(--border-radius-small);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.btn-clear {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(34, 197, 94);
	}

	.btn-clear:hover {
		background: rgba(34, 197, 94, 0.3);
	}

	.btn-remove {
		background: rgba(239, 68, 68, 0.15);
		color: rgb(239, 68, 68);
	}

	.btn-remove:hover {
		background: rgba(239, 68, 68, 0.3);
	}

	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
	}

	/* Activity list */
	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.activity-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.5rem;
		border-radius: var(--border-radius-small);
		transition: background 0.15s;
	}

	.activity-row:hover {
		background: var(--grove-overlay-5);
	}

	.activity-type {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.activity-ref {
		font-size: 0.8rem;
		color: var(--color-text);
		font-family: monospace;
	}

	.activity-time {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	/* Empty state */
	.empty-state {
		font-size: 0.875rem;
		color: var(--color-text-muted);
		font-style: italic;
		padding: 1rem 0;
		text-align: center;
	}

	/* Success/Error banners */
	.success-banner,
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius-button);
		font-size: 0.875rem;
	}

	.success-banner {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(34, 197, 94);
		border: 1px solid rgba(34, 197, 94, 0.3);
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.15);
		color: rgb(239, 68, 68);
		border: 1px solid rgba(239, 68, 68, 0.3);
	}

	:global(.banner-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.two-column {
			grid-template-columns: 1fr;
		}

		.queue-header-row,
		.queue-row {
			grid-template-columns: 80px 1fr 70px 70px;
		}

		.queue-col-categories,
		.queue-col-confidence,
		.queue-col-time {
			display: none;
		}
	}
</style>
