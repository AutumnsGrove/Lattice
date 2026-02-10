<script lang="ts">
	/**
	 * Timeline Public Route - Page
	 *
	 * Displays AI-generated daily development summaries for the site owner.
	 * Uses the Timeline component from the curios library.
	 */

	import { Calendar } from 'lucide-svelte';
	import { Timeline } from '$lib/curios/timeline';
	import { toast } from '$lib/ui';

	interface PageData {
		summaries: any[];
		activity: { date: string; commits: number }[];
		pagination: {
			limit: number;
			offset: number;
			total: number;
			hasMore: boolean;
		};
		config: {
			githubUsername: string;
			ownerName: string | null;
		};
	}

	let { data }: { data: PageData } = $props();

	// Local state for incremental loading (intentionally captures initial server data)
	const initialSummaries = data.summaries;
	const initialPagination = data.pagination;
	let summaries = $state(initialSummaries);
	let pagination = $state(initialPagination);

	// Load more summaries
	async function loadMore(): Promise<void> {
		const newOffset = pagination.offset + pagination.limit;

		try {
			const response = await fetch(
				`/api/curios/timeline?limit=${pagination.limit}&offset=${newOffset}`
			); // csrf-ok

			if (!response.ok) {
				throw new Error('Failed to load more');
			}

			const result = await response.json() as { summaries: PageData['summaries']; pagination: PageData['pagination'] };
			summaries = [...summaries, ...result.summaries];
			pagination = result.pagination;
		} catch (error) {
			toast.error('Failed to load more summaries');
			console.error('Load more error:', error);
		}
	}
</script>

<svelte:head>
	<title>Development Timeline{data.config.ownerName ? ` - ${data.config.ownerName}` : ''}</title>
	<meta name="description" content="Daily development activity and progress over time" />
</svelte:head>

<div class="timeline-page">
	<header class="timeline-header">
		<h1><Calendar size={28} /> Development Timeline</h1>
		<p>
			{#if data.config.ownerName}
				Daily summaries of {data.config.ownerName}'s coding adventures, powered by AI
			{:else}
				Daily development summaries, powered by AI
			{/if}
		</p>
	</header>

	<Timeline
		{summaries}
		activity={data.activity}
		githubUsername={data.config.githubUsername}
		ownerName={data.config.ownerName ?? 'the developer'}
		showHeatmap={true}
		heatmapDays={365}
		hasMore={pagination.hasMore}
		total={pagination.total}
		onLoadMore={loadMore}
	/>
</div>

<style>
	.timeline-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 1rem;
	}

	.timeline-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.timeline-header h1 {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: #2c5f2d;
		margin: 0;
		font-size: 1.75rem;
	}

	:global(.dark) .timeline-header h1 {
		color: var(--grove-500, #4ade80);
	}

	.timeline-header p {
		color: #666;
		margin: 0.5rem 0 0;
	}

	:global(.dark) .timeline-header p {
		color: var(--color-muted-foreground, #888);
	}
</style>
