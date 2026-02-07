<script lang="ts">
	/**
	 * GlassStatusWidget - Live status indicator from The Clearing
	 *
	 * Fetches and displays current platform status from the Clearing API.
	 * Auto-refreshes every 60 seconds for live updates.
	 *
	 * @example Minimal widget
	 * ```svelte
	 * <GlassStatusWidget />
	 * ```
	 *
	 * @example With custom refresh and expanded view
	 * ```svelte
	 * <GlassStatusWidget
	 *   clearingUrl="https://status.grove.place"
	 *   refreshInterval={30}
	 *   showComponents
	 * />
	 * ```
	 */
	import { cn } from '$lib/ui/utils';
	import {
		CheckCircle,
		AlertTriangle,
		AlertCircle,
		XCircle,
		Wrench,
		RefreshCw,
		ExternalLink
	} from 'lucide-svelte';

	type OverallStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'unknown';

	interface StatusResponse {
		status: OverallStatus;
		message: string;
		components?: Array<{
			id: string;
			name: string;
			slug: string;
			status: string;
		}>;
		activeIncidents?: Array<{
			id: string;
			title: string;
			slug: string;
			status: string;
		}>;
		updatedAt: string;
	}

	interface Props {
		/** The Clearing API URL (defaults to status.grove.place) */
		clearingUrl?: string;
		/** Refresh interval in seconds (default: 60, min: 10) */
		refreshInterval?: number;
		/** Show individual component statuses */
		showComponents?: boolean;
		/** Show active incidents */
		showIncidents?: boolean;
		/** Compact mode (icon + text only) */
		compact?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		clearingUrl = 'https://status.grove.place',
		refreshInterval = 60,
		showComponents = false,
		showIncidents = false,
		compact = false,
		class: className
	}: Props = $props();

	let statusData = $state<StatusResponse | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Status configuration
	const statusConfig: Record<OverallStatus, {
		icon: typeof CheckCircle;
		label: string;
		color: string;
		bg: string;
		border: string;
	}> = {
		operational: {
			icon: CheckCircle,
			label: 'All Systems Operational',
			color: 'text-green-500',
			bg: 'bg-green-500/10',
			border: 'border-green-500/20'
		},
		degraded: {
			icon: AlertTriangle,
			label: 'Degraded Performance',
			color: 'text-yellow-500',
			bg: 'bg-yellow-500/10',
			border: 'border-yellow-500/20'
		},
		partial_outage: {
			icon: AlertCircle,
			label: 'Partial Outage',
			color: 'text-orange-500',
			bg: 'bg-orange-500/10',
			border: 'border-orange-500/20'
		},
		major_outage: {
			icon: XCircle,
			label: 'Major Outage',
			color: 'text-red-500',
			bg: 'bg-red-500/10',
			border: 'border-red-500/20'
		},
		maintenance: {
			icon: Wrench,
			label: 'Under Maintenance',
			color: 'text-blue-500',
			bg: 'bg-blue-500/10',
			border: 'border-blue-500/20'
		},
		unknown: {
			icon: RefreshCw,
			label: 'Status Unknown',
			color: 'text-foreground-muted',
			bg: 'bg-foreground/10',
			border: 'border-foreground/20'
		}
	};

	const currentConfig = $derived(
		statusData ? statusConfig[statusData.status] : statusConfig.unknown
	);
	const StatusIcon = $derived(currentConfig.icon);

	async function fetchStatus() {
		try {
			const response = await fetch(`${clearingUrl}/api/status`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			statusData = await response.json();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch status';
			// Keep old data if available, just show error
		} finally {
			loading = false;
		}
	}

	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSec = Math.floor(diffMs / 1000);
		const diffMin = Math.floor(diffSec / 60);

		if (diffSec < 60) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		return `${Math.floor(diffMin / 60)}h ago`;
	}

	// Setup status fetching with auto-refresh
	$effect(() => {
		fetchStatus();

		// Ensure minimum refresh interval of 10 seconds
		const interval = Math.max(refreshInterval, 10) * 1000;
		const timer = setInterval(fetchStatus, interval);

		return () => clearInterval(timer);
	});
</script>

{#if compact}
	<!-- Compact mode: just icon + status text -->
	<a
		href="{clearingUrl}"
		target="_blank"
		rel="noopener noreferrer"
		class={cn(
			'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
			'glass-card transition-all duration-200 hover:shadow-md',
			currentConfig.bg,
			currentConfig.border,
			'border',
			className
		)}
	>
		{#if loading}
			<RefreshCw class="w-4 h-4 text-foreground-muted animate-spin" />
			<span class="text-sm text-foreground-muted">Loading...</span>
		{:else}
			<StatusIcon class={cn('w-4 h-4', currentConfig.color)} />
			<span class={cn('text-sm font-medium', currentConfig.color)}>
				{statusData?.status === 'operational' ? 'All Systems Go' : currentConfig.label}
			</span>
		{/if}
	</a>
{:else}
	<!-- Full widget -->
	<div
		class={cn(
			'glass-card rounded-xl overflow-hidden',
			'bg-white/80 dark:bg-bark-800/50 backdrop-blur-md',
			'border border-white/40 dark:border-bark-700/40',
			className
		)}
	>
		<!-- Header -->
		<div class={cn('px-4 py-3', currentConfig.bg)}>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if loading}
						<RefreshCw class="w-5 h-5 text-foreground-muted animate-spin" />
						<span class="font-medium text-foreground-muted dark:text-foreground-subtle">
							Checking status...
						</span>
					{:else}
						<StatusIcon class={cn('w-5 h-5', currentConfig.color)} />
						<span class={cn('font-medium', currentConfig.color)}>
							{currentConfig.label}
						</span>
					{/if}
				</div>

				<a
					href={clearingUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-foreground-muted hover:text-foreground transition-colors"
					title="View full status page"
				>
					<ExternalLink class="w-4 h-4" />
				</a>
			</div>

			{#if error}
				<p class="text-xs text-red-500 mt-1">{error}</p>
			{/if}
		</div>

		<!-- Components (if enabled) -->
		{#if showComponents && statusData?.components?.length}
			<div class="px-4 py-3 border-t border-white/20 dark:border-bark-700/30">
				<h4 class="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">
					Components
				</h4>
				<div class="space-y-1.5">
					{#each statusData.components as component}
						{@const compConfig = statusConfig[component.status as OverallStatus] || statusConfig.unknown}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground">{component.name}</span>
							<span class={cn('text-xs', compConfig.color)}>
								{component.status === 'operational' ? '✓' : component.status}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Active Incidents (if enabled) -->
		{#if showIncidents && statusData?.activeIncidents?.length}
			<div class="px-4 py-3 border-t border-white/20 dark:border-bark-700/30">
				<h4 class="text-xs font-medium text-foreground-muted uppercase tracking-wide mb-2">
					Active Incidents
				</h4>
				<div class="space-y-2">
					{#each statusData.activeIncidents as incident}
						<a
							href="{clearingUrl}/incidents/{incident.slug}"
							target="_blank"
							rel="noopener noreferrer"
							class="block text-sm text-foreground hover:text-accent transition-colors"
						>
							{incident.title}
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Footer -->
		<div class="px-4 py-2 bg-white/50 dark:bg-bark-900/30 border-t border-white/20 dark:border-bark-700/30">
			<div class="flex items-center justify-between text-xs text-foreground-muted">
				<span>
					{#if statusData?.updatedAt}
						Updated {formatRelativeTime(statusData.updatedAt)}
					{:else}
						--
					{/if}
				</span>
				<button
					onclick={fetchStatus}
					class="hover:text-foreground transition-colors"
					title="Refresh status"
				>
					<RefreshCw class={cn('w-3 h-3', loading && 'animate-spin')} />
				</button>
			</div>
		</div>
	</div>
{/if}
