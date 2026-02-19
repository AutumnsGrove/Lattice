<script lang="ts">
	import Icons from '../icons/Icons.svelte';
	import StatusBadge from '../indicators/StatusBadge.svelte';

	interface Props {
		id: string;
		query: string;
		status: 'pending' | 'running' | 'completed' | 'failed' | 'needs_confirmation';
		createdAt: string;
		resultCount?: number;
	}

	let { id, query, status, createdAt, resultCount = 0 }: Props = $props();

	const formattedDate = $derived(
		new Date(createdAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})
	);

	const truncatedQuery = $derived(
		query.length > 80 ? query.slice(0, 80) + '...' : query
	);
</script>

<a
	href="/search/{id}"
	class="scout-card block p-4 hover:shadow-grove-md transition-all duration-grove group"
>
	<div class="flex items-start justify-between gap-4">
		<div class="flex-1 min-w-0">
			<p class="font-medium text-bark dark:text-cream mb-1 group-hover:text-grove-600 dark:group-hover:text-grove-400 transition-colors">
				{truncatedQuery}
			</p>
			<div class="flex items-center gap-3 text-sm text-bark-400 dark:text-cream-500">
				<span class="flex items-center gap-1">
					<Icons name="clock" size="sm" />
					{formattedDate}
				</span>
				{#if status === 'completed' && resultCount > 0}
					<span class="flex items-center gap-1">
						<Icons name="shopping-bag" size="sm" />
						{resultCount} results
					</span>
				{/if}
			</div>
		</div>
		<StatusBadge {status} size="sm" />
	</div>

	{#if status === 'completed'}
		<div class="mt-3 pt-3 border-t border-cream-300 dark:border-bark-600 flex items-center justify-between">
			<span class="text-sm text-bark-500 dark:text-cream-500">View results</span>
			<Icons name="arrow-right" size="sm" class="text-grove-500 group-hover:translate-x-1 transition-transform" />
		</div>
	{/if}
</a>
