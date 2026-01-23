<script lang="ts">
	/**
	 * Timeline Component
	 *
	 * Displays AI-generated daily development summaries with:
	 * - Expandable summary cards with markdown content
	 * - Inline gutter comments anchored to project headers
	 * - Activity heatmap visualization
	 * - Focus streak badges for multi-day tasks
	 * - Pagination with "Load More"
	 */

	import MarkdownIt from 'markdown-it';
	import { sanitizeMarkdown } from '$lib/utils';

	// Local instance with breaks: true for timeline rendering
	const timelineMd = new MarkdownIt({ breaks: true, linkify: true });
	import {
		Calendar,
		GitCommit,
		Plus,
		Minus,
		FolderGit2,
		ChevronDown,
		ChevronUp,
		Cloud,
		Loader2,
		Flame
	} from 'lucide-svelte';
	import { GlassCard, GlassButton, Badge } from '$lib/ui';
	import Heatmap from './Heatmap.svelte';

	interface GutterItem {
		anchor: string;
		content: string;
		type?: string;
	}

	interface Summary {
		id: string;
		summary_date: string;
		brief_summary: string | null;
		detailed_timeline: string | null;
		gutter_content: GutterItem[] | null;
		commit_count: number;
		repos_active: string[];
		total_additions: number;
		total_deletions: number;
		detected_focus?: { task: string } | null;
		focus_streak?: number;
	}

	interface ActivityDay {
		date: string;
		commits: number;
	}

	interface Props {
		summaries?: Summary[];
		activity?: ActivityDay[];
		githubUsername?: string;
		ownerName?: string;
		showHeatmap?: boolean;
		heatmapDays?: number;
		onLoadMore?: () => Promise<void>;
		hasMore?: boolean;
		total?: number;
	}

	const props: Props = $props();

	let summaries = $derived(props.summaries ?? []);
	let activity = $derived(props.activity ?? []);
	let githubUsername = $derived(props.githubUsername ?? '');
	let ownerName = $derived(props.ownerName ?? 'the developer');
	let showHeatmap = $derived(props.showHeatmap ?? true);
	let heatmapDays = $derived(props.heatmapDays ?? 365);

	let loadingMore = $state(false);
	let expandedCards = $state(new Set<string>());


	// Fun rest day messages
	const REST_DAY_MESSAGES = [
		"Taking a well-deserved break from the keyboard",
		"Probably gaming instead of coding today",
		"Coffee > Code (just for today)",
		"Even developers need a day off",
		"Learning by not coding (it's a thing)",
		"Recharging the creative batteries",
		"Binge-watching something instead",
		"Pizza and chill, no commits to fulfill",
		"Practicing the ancient art of doing nothing",
		"Cat probably sat on the keyboard, preventing all work",
		"Touching grass (the outdoor kind)",
		"Debugging life instead of code",
		"AFK - Away From Keyboard",
		"Plot twist: no bugs to fix today"
	];

	// Get a consistent random message for a date
	function getRestDayMessage(date: string): string {
		const hash = date.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
		return REST_DAY_MESSAGES[hash % REST_DAY_MESSAGES.length];
	}

	// Format date nicely
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + 'T12:00:00');
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Format short date for mobile
	function formatShortDate(dateStr: string): string {
		const date = new Date(dateStr + 'T12:00:00');
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	// Check if date is today
	function isToday(dateStr: string): boolean {
		const today = new Date().toISOString().split('T')[0];
		return dateStr === today;
	}

	// Format focus streak for display
	function formatFocusStreak(summary: Summary): string | null {
		if (!summary.focus_streak || summary.focus_streak < 2) return null;
		const task = summary.detected_focus?.task || 'focused work';
		return `Day ${summary.focus_streak} of ${task}`;
	}

	/**
	 * Get gutter items grouped by their anchor header
	 */
	function getGutterItemsByAnchor(gutterItems: GutterItem[]): Record<string, GutterItem[]> {
		const grouped: Record<string, GutterItem[]> = {};
		for (const item of gutterItems) {
			const headerName = item.anchor?.replace(/^#+\s*/, '').trim() || 'General';
			if (!grouped[headerName]) {
				grouped[headerName] = [];
			}
			grouped[headerName].push(item);
		}
		return grouped;
	}

	/**
	 * Render markdown to HTML with repo links and inject gutter comments
	 */
	function renderMarkdownWithGutter(text: string, gutterItems: GutterItem[] = []): string {
		if (!text) return '';

		const gutterByHeader = getGutterItemsByAnchor(gutterItems);

		// Convert ### RepoName headers to GitHub links (if username provided)
		let withRepoLinks = text;
		if (githubUsername) {
			withRepoLinks = text.replace(
				/^### (?!\[)(.+)$/gm,
				(match, repoName) => {
					const cleanName = repoName.trim();
					return `### [${cleanName}](https://github.com/${githubUsername}/${cleanName})`;
				}
			);
		}

		// Parse to HTML and sanitize
		let html = sanitizeMarkdown(timelineMd.render(withRepoLinks));

		// Inject gutter comments after headers
		for (const [headerName, items] of Object.entries(gutterByHeader)) {
			const gutterHtml = items.map(item =>
				`<div class="inline-gutter-comment"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg><span>${escapeHtml(item.content)}</span></div>`
			).join('');

			const linkPattern = new RegExp(
				`(<h3>\\s*<a[^>]*>\\s*${escapeRegex(headerName)}\\s*</a>\\s*</h3>)`,
				'i'
			);
			const plainPattern = new RegExp(
				`(<h3>\\s*${escapeRegex(headerName)}\\s*</h3>)`,
				'i'
			);

			if (linkPattern.test(html)) {
				html = html.replace(linkPattern, `$1\n<div class="header-gutter-group">${gutterHtml}</div>`);
			} else if (plainPattern.test(html)) {
				html = html.replace(plainPattern, `$1\n<div class="header-gutter-group">${gutterHtml}</div>`);
			}
		}

		return html;
	}

	function escapeHtml(text: string): string {
		if (!text) return '';
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function escapeRegex(str: string): string {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function toggleCard(id: string): void {
		if (expandedCards.has(id)) {
			expandedCards.delete(id);
			expandedCards = new Set(expandedCards);
		} else {
			expandedCards.add(id);
			expandedCards = new Set(expandedCards);
		}
	}

	async function loadMore(): Promise<void> {
		if (loadingMore || !props.onLoadMore) return;

		loadingMore = true;
		try {
			await props.onLoadMore();
		} finally {
			loadingMore = false;
		}
	}
</script>

<div class="timeline-component">
	{#if summaries.length === 0}
		<div class="empty-state">
			<Cloud size={48} />
			<h2>No summaries yet</h2>
			<p>Daily summaries will appear here once generation begins.</p>
		</div>
	{:else}
		<!-- Activity Heatmap -->
		{#if showHeatmap && activity.length > 0}
			<div class="heatmap-section">
				<Heatmap {activity} days={heatmapDays} />
			</div>
		{/if}

		<!-- Timeline Cards -->
		<div class="timeline-cards">
			{#each summaries as summary (summary.id)}
				{@const isRestDay = summary.commit_count === 0}
				{@const isExpanded = expandedCards.has(summary.id)}
				{@const gutterItems = summary.gutter_content || []}
				{@const focusStreak = formatFocusStreak(summary)}

				<GlassCard
					variant={isRestDay ? "muted" : "default"}
					hoverable
					class="timeline-card {isRestDay ? 'rest-day' : ''} {isToday(summary.summary_date) ? 'today' : ''}"
				>
					{#snippet header()}
						<div class="card-header">
							<div class="date-info">
								<span class="date-full">{formatDate(summary.summary_date)}</span>
								<span class="date-short">{formatShortDate(summary.summary_date)}</span>
								{#if isToday(summary.summary_date)}
									<Badge variant="tag" class="today-badge">Today</Badge>
								{/if}
							</div>
							<div class="commit-badge-wrapper">
								{#if isRestDay}
									<Badge class="commit-badge rest-badge">
										<Cloud size={14} />
										<span>Rest Day</span>
									</Badge>
								{:else}
									{#if focusStreak}
										<Badge class="focus-badge">
											<Flame size={14} />
											<span>{focusStreak}</span>
										</Badge>
									{/if}
									<Badge class="commit-badge">
										<GitCommit size={14} />
										<span>{summary.commit_count} commit{summary.commit_count !== 1 ? 's' : ''}</span>
									</Badge>
								{/if}
							</div>
						</div>
					{/snippet}

					<div class="card-content">
						{#if isRestDay}
							<p class="rest-message">{getRestDayMessage(summary.summary_date)}</p>
						{:else}
							<p class="brief-summary">{summary.brief_summary}</p>

							<div class="meta-info">
								<span class="repos">
									<FolderGit2 size={14} />
									{summary.repos_active?.join(', ') || 'Unknown'}
								</span>
								{#if summary.total_additions > 0 || summary.total_deletions > 0}
									<span class="changes">
										<Plus size={14} class="plus-icon" />
										{summary.total_additions.toLocaleString()}
										<Minus size={14} class="minus-icon" />
										{summary.total_deletions.toLocaleString()}
									</span>
								{/if}
							</div>

							{#if summary.detailed_timeline && isExpanded}
								<div class="detailed-section">
									<div class="detailed-timeline markdown-content">
										{@html renderMarkdownWithGutter(summary.detailed_timeline, gutterItems)}
									</div>
								</div>
							{/if}

							{#if summary.detailed_timeline}
								<div class="expand-btn-container">
									<GlassButton
										variant="ghost"
										size="sm"
										onclick={() => toggleCard(summary.id)}
										class="expand-btn w-full"
									>
										{#if isExpanded}
											<ChevronUp size={16} />
											<span>Hide Details</span>
										{:else}
											<ChevronDown size={16} />
											<span>Show Details</span>
										{/if}
									</GlassButton>
								</div>
							{/if}
						{/if}
					</div>
				</GlassCard>
			{/each}
		</div>

		<!-- Load More -->
		{#if props.hasMore}
			<div class="load-more-container">
				<GlassButton
					variant="accent"
					size="lg"
					onclick={loadMore}
					disabled={loadingMore}
					class="load-more-btn"
				>
					{#if loadingMore}
						<Loader2 size={16} class="spinner" />
						<span>Loading...</span>
					{:else}
						<span>Load More</span>
					{/if}
				</GlassButton>
			</div>
		{/if}

		<!-- Footer -->
		{#if props.total}
			<footer class="timeline-footer">
				<p>Showing {summaries.length} of {props.total} days</p>
			</footer>
		{/if}
	{/if}
</div>

<style>
	.timeline-component {
		max-width: 900px;
		margin: 0 auto;
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: 3rem;
		background: var(--cream-200, #f5f5f0);
		border-radius: 12px;
		color: #666;
	}
	:global(.dark) .empty-state {
		background: var(--cream-300, #2a2a2a);
		color: var(--color-muted-foreground, #888);
	}
	.empty-state h2 {
		margin: 1rem 0 0.5rem;
		color: #2c5f2d;
	}
	:global(.dark) .empty-state h2 {
		color: var(--grove-500, #4ade80);
	}

	/* Heatmap Section */
	.heatmap-section {
		margin-bottom: 1.5rem;
	}

	/* Timeline Cards */
	.timeline-cards {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	:global(.timeline-card) {
		transition: transform 0.15s ease;
	}
	:global(.timeline-card:hover) {
		transform: translateY(-2px);
	}
	:global(.timeline-card.today) {
		box-shadow: 0 0 0 2px var(--grove-500, #4ade80) !important;
	}

	/* Card Header */
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}
	.date-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.date-full {
		font-weight: 600;
		color: var(--color-foreground, #333);
	}
	:global(.dark) .date-full {
		color: var(--bark, #f5f2ea);
	}
	.date-short {
		display: none;
		font-weight: 600;
		color: var(--color-foreground, #333);
	}
	:global(.dark) .date-short {
		color: var(--bark, #f5f2ea);
	}
	:global(.today-badge) {
		background: var(--grove-500, #4ade80);
		color: white;
		font-size: 0.7rem;
		padding: 0.15rem 0.4rem;
		border-radius: 4px;
		font-weight: 600;
		text-transform: uppercase;
	}
	.commit-badge-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	:global(.commit-badge) {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: #e8f5e9;
		color: #2c5f2d;
		padding: 0.35rem 0.65rem;
		border-radius: 16px;
		font-size: 0.85rem;
		font-weight: 500;
	}
	:global(.dark) :global(.commit-badge) {
		background: var(--cream-200, #3a3a3a);
		color: var(--grove-500, #4ade80);
	}
	:global(.commit-badge.rest-badge) {
		background: var(--color-foreground, #666);
		color: var(--bark-500, #8b7355);
	}
	:global(.dark) :global(.commit-badge.rest-badge) {
		background: var(--color-border-strong, #444);
		color: var(--bark-500, #8b7355);
	}

	/* Focus streak badge */
	:global(.focus-badge) {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: linear-gradient(135deg, #fff5e6 0%, #ffe4c4 100%);
		color: #b35900;
		padding: 0.35rem 0.65rem;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 500;
		border: 1px solid #ffcc80;
	}
	:global(.dark) :global(.focus-badge) {
		background: linear-gradient(135deg, #3d2800 0%, #4d3200 100%);
		color: #ffb74d;
		border-color: #5c4000;
	}
	:global(.focus-badge svg) {
		color: #ff9800;
	}
	:global(.dark) :global(.focus-badge svg) {
		color: #ffb74d;
	}

	/* Card Content */
	.rest-message {
		font-style: italic;
		color: var(--bark-500, #8b7355);
		margin: 0;
		font-size: 0.95rem;
	}
	:global(.dark) .rest-message {
		color: var(--bark-600, #b69575);
	}
	.brief-summary {
		margin: 0 0 0.75rem;
		color: var(--color-foreground, #333);
		line-height: 1.5;
	}
	:global(.dark) .brief-summary {
		color: var(--bark, #f5f2ea);
	}
	.meta-info {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 0.85rem;
		color: var(--color-foreground, #333);
		margin-bottom: 0.75rem;
	}
	:global(.dark) .meta-info {
		color: var(--bark-700, #ccb59c);
	}
	.repos, .changes {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.changes :global(.plus-icon) {
		color: var(--grove-500, #4ade80);
	}
	.changes :global(.minus-icon) {
		color: var(--color-error, #ef4444);
	}

	/* Expand Button */
	.expand-btn-container {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px dashed var(--bark-400, #a89078);
	}
	:global(.dark) .expand-btn-container {
		border-top-color: var(--color-border-strong, #444);
	}
	:global(.expand-btn) {
		justify-content: center;
	}

	/* Detailed Section */
	.detailed-section {
		margin-top: 0.75rem;
	}

	/* Inline Gutter Comments */
	.markdown-content :global(.header-gutter-group) {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.35rem 0 0.75rem;
	}
	.markdown-content :global(.inline-gutter-comment) {
		display: inline-flex;
		align-items: flex-start;
		gap: 0.35rem;
		padding: 0.4rem 0.6rem;
		background: linear-gradient(135deg, #f0f7f0 0%, #e8f5e9 100%);
		border-left: 2px solid var(--grove-500, #4ade80);
		border-radius: 0 4px 4px 0;
		font-size: 0.8rem;
		color: #2c5f2d;
		line-height: 1.35;
		font-style: italic;
	}
	:global(.dark) .markdown-content :global(.inline-gutter-comment) {
		background: linear-gradient(135deg, var(--cream-200, #3a3a3a) 0%, var(--cream-200, #3a3a3a) 100%);
		border-left-color: var(--grove-500, #4ade80);
		color: var(--grove-600, #22c55e);
	}
	.markdown-content :global(.inline-gutter-comment svg) {
		flex-shrink: 0;
		color: var(--grove-500, #4ade80);
		opacity: 0.7;
		margin-top: 0.1rem;
	}

	/* Detailed Timeline Markdown */
	.detailed-timeline {
		padding: 1rem;
		background: var(--cream-200, #f5f5f0);
		border-radius: 8px;
		font-size: 0.9rem;
		color: var(--color-foreground, #333);
		line-height: 1.6;
	}
	:global(.dark) .detailed-timeline {
		background: var(--cream-300, #2a2a2a);
		color: var(--bark, #f5f2ea);
	}
	.markdown-content :global(h2) {
		font-size: 1.1rem;
		color: #2c5f2d;
		margin: 0 0 0.75rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border, #ddd);
	}
	:global(.dark) .markdown-content :global(h2) {
		color: var(--grove-500, #4ade80);
		border-bottom-color: var(--color-border-strong, #444);
	}
	.markdown-content :global(h3) {
		font-size: 1rem;
		color: var(--color-foreground, #333);
		margin: 1rem 0 0.5rem;
		font-weight: 600;
	}
	:global(.dark) .markdown-content :global(h3) {
		color: var(--bark, #f5f2ea);
	}
	.markdown-content :global(h3 a) {
		color: #2c5f2d;
		text-decoration: none;
		border-bottom: 1px dashed #2c5f2d;
		transition: all 0.15s ease;
	}
	.markdown-content :global(h3 a:hover) {
		color: var(--grove-700, #166534);
		border-bottom-style: solid;
	}
	:global(.dark) .markdown-content :global(h3 a) {
		color: var(--grove-500, #4ade80);
		border-bottom-color: var(--grove-500, #4ade80);
	}
	.markdown-content :global(ul) {
		margin: 0.5rem 0;
		padding-left: 1.25rem;
	}
	.markdown-content :global(li) {
		margin-bottom: 0.25rem;
		color: var(--color-foreground, #333);
	}
	:global(.dark) .markdown-content :global(li) {
		color: var(--bark, #f5f2ea);
	}
	.markdown-content :global(code) {
		background: var(--color-border-strong, #e0e0e0);
		padding: 0.15rem 0.35rem;
		border-radius: 3px;
		font-size: 0.85em;
	}
	:global(.dark) .markdown-content :global(code) {
		background: var(--color-border-strong, #444);
	}

	/* Load More */
	.load-more-container {
		text-align: center;
		margin-top: 2rem;
	}
	:global(.load-more-btn .spinner) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* Footer */
	.timeline-footer {
		text-align: center;
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid var(--bark-400, #a89078);
		color: var(--bark-500, #8b7355);
		font-size: 0.9rem;
	}
	:global(.dark) .timeline-footer {
		border-top-color: var(--color-border-strong, #444);
		color: var(--bark-700, #ccb59c);
	}

	/* Mobile Responsiveness */
	@media (max-width: 600px) {
		.date-full {
			display: none;
		}
		.date-short {
			display: block;
		}
		.card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}
		.meta-info {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
