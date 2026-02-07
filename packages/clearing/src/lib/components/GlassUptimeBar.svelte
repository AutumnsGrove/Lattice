<script lang="ts">
	/**
	 * GlassUptimeBar - 90-day uptime visualization
	 *
	 * Displays a horizontal bar chart showing daily status for the past 90 days.
	 * Each day is a thin vertical bar colored by the worst status of that day.
	 * Hover reveals details about specific days.
	 */
	import { cn } from '@autumnsgrove/groveengine/ui/utils';
	import { formatDateShort } from '$lib/utils/date';
	import type { ComponentStatus, DailyStatus } from '$lib/types/status';
	import { getStatusLabel } from '$lib/types/status';

	interface Props {
		componentName: string;
		days: DailyStatus[];
		uptimePercentage: number;
		class?: string;
	}

	let { componentName, days, uptimePercentage, class: className }: Props = $props();

	// State for tooltip
	let hoveredDay = $state<DailyStatus | null>(null);
	let tooltipPosition = $state({ x: 0, y: 0 });

	// Status to color mapping
	function getStatusColor(status: ComponentStatus): string {
		const colors: Record<ComponentStatus, string> = {
			operational: 'bg-green-500',
			degraded: 'bg-yellow-500',
			partial_outage: 'bg-orange-500',
			major_outage: 'bg-red-500',
			maintenance: 'bg-blue-500'
		};
		return colors[status];
	}

	// Handle mouse events for tooltip
	function handleMouseEnter(day: DailyStatus, event: MouseEvent) {
		hoveredDay = day;
		const rect = (event.target as HTMLElement).getBoundingClientRect();
		tooltipPosition = {
			x: rect.left + rect.width / 2,
			y: rect.top - 8
		};
	}

	function handleMouseLeave() {
		hoveredDay = null;
	}

	// Uptime color based on percentage
	const uptimeColor = $derived(
		uptimePercentage >= 99.9 ? 'text-green-500' :
		uptimePercentage >= 99 ? 'text-green-400' :
		uptimePercentage >= 95 ? 'text-yellow-500' :
		'text-red-500'
	);
</script>

<div class={cn('glass-card p-4', className)}>
	<!-- Header with component name and uptime percentage -->
	<div class="flex items-center justify-between mb-3">
		<h4 class="font-medium text-foreground">{componentName}</h4>
		<span class={cn('text-sm font-medium', uptimeColor)}>
			{uptimePercentage.toFixed(2)}% uptime
		</span>
	</div>

	<!-- 90-day bar chart -->
	<div class="relative overflow-hidden">
		<div class="flex gap-px h-8 items-end">
			{#each days as day, i (day.date)}
				<button
					type="button"
					class={cn(
						'flex-1 rounded-sm transition-all duration-150',
						'hover:opacity-80 hover:scale-y-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-grove-500',
						getStatusColor(day.status)
					)}
					style="height: 100%"
					aria-label={`${formatDateShort(day.date)}: ${getStatusLabel(day.status)}`}
					onmouseenter={(e) => handleMouseEnter(day, e)}
					onmouseleave={handleMouseLeave}
					onfocus={(e) => handleMouseEnter(day, e as unknown as MouseEvent)}
					onblur={handleMouseLeave}
				></button>
			{/each}
		</div>

		<!-- Date labels -->
		<div class="flex justify-between mt-2 text-xs text-foreground-subtle">
			<span>90 days ago</span>
			<span>Today</span>
		</div>
	</div>
</div>

<!-- Tooltip (fixed position, portal-like) -->
{#if hoveredDay}
	<div
		class="fixed z-50 px-3 py-2 text-sm bg-bark-900 dark:bg-bark-800 text-white rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full"
		style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
	>
		<div class="font-medium">{formatDateShort(hoveredDay.date)}</div>
		<div class="text-cream-300">{getStatusLabel(hoveredDay.status)}</div>
		{#if hoveredDay.incidentCount > 0}
			<div class="text-cream-400 text-xs mt-0.5">
				{hoveredDay.incidentCount} incident{hoveredDay.incidentCount > 1 ? 's' : ''}
			</div>
		{/if}
		<!-- Arrow -->
		<div class="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-bark-900 dark:bg-bark-800 rotate-45"></div>
	</div>
{/if}
