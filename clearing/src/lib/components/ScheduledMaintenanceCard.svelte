<script lang="ts">
	/**
	 * ScheduledMaintenanceCard - Display upcoming maintenance
	 *
	 * Shows scheduled maintenance window with affected components.
	 */
	import { cn } from '$lib/utils/cn';
	import type { ScheduledMaintenance, StatusComponent } from '$lib/types/status';
	import { Calendar, Clock, Wrench } from 'lucide-svelte';

	interface Props {
		maintenance: ScheduledMaintenance;
		components: StatusComponent[];
		class?: string;
	}

	let { maintenance, components, class: className }: Props = $props();

	// Format date/time range
	function formatDateRange(start: string, end: string): { date: string; time: string } {
		const startDate = new Date(start);
		const endDate = new Date(end);

		const dateStr = startDate.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});

		const startTime = startDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});

		const endTime = endDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		});

		return {
			date: dateStr,
			time: `${startTime} - ${endTime}`
		};
	}

	const { date, time } = formatDateRange(maintenance.scheduled_start, maintenance.scheduled_end);

	// Check if maintenance is happening soon (within 24 hours)
	const isSoon = $derived(() => {
		const start = new Date(maintenance.scheduled_start);
		const now = new Date();
		const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
		return hoursUntil <= 24 && hoursUntil > 0;
	});
</script>

<div class={cn(
	'glass-card p-4 border-l-4 border-blue-500',
	className
)}>
	<div class="flex items-start gap-3">
		<div class="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
			<Wrench class="w-5 h-5 text-blue-500" />
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<h3 class="font-medium text-foreground">{maintenance.title}</h3>
				{#if maintenance.status === 'in_progress'}
					<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 whitespace-nowrap">
						In Progress
					</span>
				{:else if isSoon}
					<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 whitespace-nowrap">
						Coming Soon
					</span>
				{/if}
			</div>

			{#if maintenance.description}
				<p class="text-sm text-foreground-muted mt-1">{maintenance.description}</p>
			{/if}

			<div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-foreground-muted">
				<span class="inline-flex items-center gap-1.5">
					<Calendar class="w-4 h-4" />
					{date}
				</span>
				<span class="inline-flex items-center gap-1.5">
					<Clock class="w-4 h-4" />
					{time}
				</span>
			</div>

			{#if components.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-3">
					{#each components as component}
						<span class="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-300">
							{component.name}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
