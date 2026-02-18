<script lang="ts">
	/**
	 * Activity Heatmap Component
	 *
	 * GitHub-style contribution heatmap for Timeline Curio.
	 * Displays commit activity as a grid of colored squares.
	 */

	interface ActivityDay {
		date: string;
		commits: number;
	}

	interface Props {
		activity?: ActivityDay[];
		days?: number;
	}

	// svelte-ignore custom_element_props_identifier
	const props: Props = $props();

	// Derived props for proper Svelte 5 reactivity
	let activity = $derived(props.activity ?? []);
	let days = $derived(props.days ?? 365);

	// Format date as YYYY-MM-DD in local timezone
	function formatDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	interface GridDay {
		date: string;
		count: number;
		dayOfWeek: number;
	}

	// Generate dates for the grid
	function generateDateGrid(activityData: ActivityDay[], numDays: number): GridDay[][] {
		const grid: GridDay[][] = [];
		const today = new Date();
		const startDate = new Date(today);
		startDate.setDate(startDate.getDate() - numDays);

		// Adjust to start on Sunday
		const dayOfWeek = startDate.getDay();
		startDate.setDate(startDate.getDate() - dayOfWeek);

		// Build activity map for quick lookup
		const activityMap: Record<string, number> = {};
		for (const item of activityData) {
			activityMap[item.date] = item.commits;
		}

		// Generate weeks
		let currentDate = new Date(startDate);
		let week: GridDay[] = [];

		while (currentDate <= today) {
			const dateStr = formatDateKey(currentDate);
			const count = activityMap[dateStr] || 0;

			week.push({
				date: dateStr,
				count,
				dayOfWeek: currentDate.getDay(),
			});

			if (week.length === 7) {
				grid.push(week);
				week = [];
			}

			currentDate.setDate(currentDate.getDate() + 1);
		}

		// Push remaining days
		if (week.length > 0) {
			grid.push(week);
		}

		return grid;
	}

	function getColorClass(count: number): string {
		if (count === 0) return "level-0";
		if (count <= 2) return "level-1";
		if (count <= 5) return "level-2";
		if (count <= 10) return "level-3";
		return "level-4";
	}

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + "T00:00:00");
		return date.toLocaleDateString("en-US", {
			weekday: "short",
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	}

	// Derived values that react to prop changes
	let grid = $derived(generateDateGrid(activity, days));
	let totalCommits = $derived(activity.reduce((sum, item) => sum + item.commits, 0));
</script>

<div class="heatmap-container">
	<div class="heatmap-header">
		<h3>Commit Activity</h3>
		<span class="total-commits">{totalCommits} commits in the last {days} days</span>
	</div>

	<div class="heatmap-wrapper">
		<div class="day-labels">
			<span></span>
			<span>Mon</span>
			<span></span>
			<span>Wed</span>
			<span></span>
			<span>Fri</span>
			<span></span>
		</div>

		<div class="heatmap-grid">
			{#each grid as week, weekIndex (weekIndex)}
				<div class="week">
					{#each week as day (day.date)}
						<div
							class="day {getColorClass(day.count)}"
							title="{day.count} commits on {formatDate(day.date)}"
						></div>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div class="heatmap-legend">
		<span>Less</span>
		<div class="legend-boxes">
			<div class="day level-0"></div>
			<div class="day level-1"></div>
			<div class="day level-2"></div>
			<div class="day level-3"></div>
			<div class="day level-4"></div>
		</div>
		<span>More</span>
	</div>
</div>

<style>
	.heatmap-container {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		margin-bottom: 1.5rem;
	}
	:global(.dark) .heatmap-container {
		background: var(--cream-300, #2a2a2a);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}
	.heatmap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.heatmap-header h3 {
		margin: 0;
		color: #2c5f2d;
		font-size: 1rem;
	}
	:global(.dark) .heatmap-header h3 {
		color: var(--grove-500, #4ade80);
	}
	.total-commits {
		font-size: 0.85rem;
		color: #666;
	}
	:global(.dark) .total-commits {
		color: #999;
	}
	.heatmap-wrapper {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}
	.day-labels {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-size: 0.65rem;
		color: #666;
		padding-top: 2px;
	}
	:global(.dark) .day-labels {
		color: #888;
	}
	.day-labels span {
		height: 12px;
		line-height: 12px;
	}
	.heatmap-grid {
		display: flex;
		gap: 3px;
	}
	.week {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.day {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		cursor: pointer;
		transition: outline 0.1s ease;
	}
	.day:hover {
		outline: 1px solid #666;
	}
	/* Light mode colors - GitHub green */
	.level-0 {
		background: #ebedf0;
	}
	.level-1 {
		background: #9be9a8;
	}
	.level-2 {
		background: #40c463;
	}
	.level-3 {
		background: #30a14e;
	}
	.level-4 {
		background: #216e39;
	}
	/* Dark mode colors */
	:global(.dark) .level-0 {
		background: #161b22;
	}
	:global(.dark) .level-1 {
		background: #0e4429;
	}
	:global(.dark) .level-2 {
		background: #006d32;
	}
	:global(.dark) .level-3 {
		background: #26a641;
	}
	:global(.dark) .level-4 {
		background: #39d353;
	}
	.heatmap-legend {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.75rem;
		font-size: 0.75rem;
		color: #666;
	}
	:global(.dark) .heatmap-legend {
		color: #888;
	}
	.legend-boxes {
		display: flex;
		gap: 3px;
	}
</style>
