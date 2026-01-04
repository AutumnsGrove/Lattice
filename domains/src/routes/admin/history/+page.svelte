<script lang="ts">
	import type { PageData } from './$types';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	let syncing = $state(false);
	let syncMessage = $state<string | null>(null);

	// Reactive jobs state for live updates
	let jobs = $state(untrack(() => data.jobs));
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let elapsedTimers = $state<Record<string, number>>({});
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Show auto-sync result notification
	$effect(() => {
		if (data.syncResult) {
			const { synced, updated } = data.syncResult;
			const parts = [];
			if (synced > 0) parts.push(`${synced} new`);
			if (updated > 0) parts.push(`${updated} updated`);
			syncMessage = `Synced: ${parts.join(', ')}`;
			setTimeout(() => (syncMessage = null), 5000);
		}
	});

	// Get running job IDs
	const runningJobIds = $derived(jobs.filter(j => j.status === 'running' || j.status === 'pending').map(j => j.id));

	// Start/stop polling based on running jobs
	$effect(() => {
		if (runningJobIds.length > 0) {
			startPolling();
			startElapsedTimers();
		} else {
			stopPolling();
			stopElapsedTimers();
		}
		return () => {
			stopPolling();
			stopElapsedTimers();
		};
	});

	function startPolling() {
		if (pollingInterval) return;
		pollingInterval = setInterval(pollRunningJobs, 3000);
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function startElapsedTimers() {
		if (timerInterval) return;

		// Initialize elapsed times for running jobs
		// Note: This is called only when runningJobIds.length > 0 (from $effect above),
		// which is derived from jobs (server-loaded data), so jobs should always be populated
		const newTimers: Record<string, number> = { ...elapsedTimers };
		const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'pending');

		// Defensive: Only initialize if we have jobs with valid start times
		if (runningJobs.length === 0) return;

		for (const job of runningJobs) {
			if (job.started_at) {
				newTimers[job.id] = Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000);
			}
		}
		elapsedTimers = newTimers;

		timerInterval = setInterval(() => {
			const updated: Record<string, number> = {};
			for (const jobId of runningJobIds) {
				updated[jobId] = (elapsedTimers[jobId] || 0) + 1;
			}
			elapsedTimers = { ...elapsedTimers, ...updated };
		}, 1000);
	}

	function stopElapsedTimers() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	async function pollRunningJobs() {
		for (const jobId of runningJobIds) {
			try {
				const response = await fetch(`/api/search/status?job_id=${jobId}`);
				if (response.ok) {
					const result = await response.json() as { job?: typeof jobs[0] };
					if (result.job) {
						// Update job in list
						const idx = jobs.findIndex(j => j.id === jobId);
						if (idx >= 0) {
							jobs[idx] = { ...jobs[idx], ...result.job };
							jobs = [...jobs]; // Trigger reactivity
						}
					}
				}
			} catch (err) {
				console.error(`Failed to poll job ${jobId}:`, err);
			}
		}
	}

	function formatElapsed(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	interface SyncResult {
		success: boolean;
		synced: number;
		updated: number;
		skipped: number;
		total: number;
	}

	async function manualSync() {
		syncing = true;
		syncMessage = null;
		try {
			const response = await fetch('/api/search/sync', { method: 'POST' });
			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				syncMessage = `Sync failed: ${(errData as {message?: string}).message || response.statusText}`;
				return;
			}
			const result = (await response.json()) as SyncResult;
			if (result.success) {
				const parts: string[] = [];
				if (result.synced > 0) parts.push(`${result.synced} new`);
				if (result.updated > 0) parts.push(`${result.updated} updated`);
				if (parts.length > 0) {
					syncMessage = `Synced: ${parts.join(', ')}`;
					// Reload the page to show updated data
					window.location.reload();
				} else {
					syncMessage = 'Already up to date';
				}
			} else {
				syncMessage = 'Sync failed';
			}
		} catch (err) {
			syncMessage = `Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			syncing = false;
			setTimeout(() => (syncMessage = null), 5000);
		}
	}

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatDate(dateStr: string): string {
		// Use toLocaleString for proper local timezone conversion
		return new Date(dateStr).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string): string {
		switch (status) {
			case 'running':
				return 'badge-info';
			case 'complete':
				return 'badge-success';
			case 'failed':
				return 'badge-error';
			case 'needs_followup':
				return 'badge-warning';
			default:
				return 'bg-bark/10 text-bark/60';
		}
	}

	function isRunning(status: string): boolean {
		return status === 'running' || status === 'pending';
	}
</script>

<svelte:head>
	<title>History - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Sync notification -->
	{#if syncMessage}
		<div
			class="fixed top-4 right-4 z-50 bg-grove-600 text-white px-4 py-2 rounded-lg shadow-lg font-sans text-sm animate-fade-in"
		>
			{syncMessage}
		</div>
	{/if}

	<!-- Page Header -->
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-2xl font-serif text-bark">Search History</h1>
			<p class="text-bark/60 font-sans mt-1">All previous domain searches ({data.total} total)</p>
		</div>
		<div class="flex gap-3">
			<button onclick={manualSync} disabled={syncing} class="btn-secondary">
				{#if syncing}
					<svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Syncing...
				{:else}
					Sync
				{/if}
			</button>
			<a href="/admin/searcher" class="btn-primary"> New Search </a>
		</div>
	</div>

	<!-- Jobs List -->
	{#if jobs.length === 0}
		<div class="glass-card-muted p-12 text-center">
			<svg class="w-16 h-16 mx-auto text-bark/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
			</svg>
			<p class="text-bark/60 font-sans mb-4">No search history yet</p>
			<a href="/admin/searcher" class="btn-primary inline-block">
				Start Your First Search
			</a>
		</div>
	{:else}
		<div class="card overflow-hidden">
			<table class="w-full">
				<thead class="bg-grove-50 border-b border-grove-200">
					<tr>
						<th class="text-left px-4 py-3 text-sm font-sans font-medium text-bark/70">Business</th>
						<th class="text-left px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden sm:table-cell">Status</th>
						<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden md:table-cell">Checked</th>
						<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70">Found</th>
						<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden lg:table-cell">Tokens</th>
						<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden md:table-cell">Date</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-grove-100">
					{#each jobs as job (job.id)}
						<tr class="hover:bg-grove-50 transition-colors {isRunning(job.status) ? 'bg-domain-50/30' : ''}">
							<td class="px-4 py-4">
								<div class="font-sans font-medium text-bark">{job.business_name}</div>
								<div class="text-sm text-bark/50 font-sans">{job.client_email}</div>
								<div class="sm:hidden mt-1">
									<span class="badge {getStatusBadge(job.status)} {isRunning(job.status) ? 'animate-pulse' : ''}">{job.status}</span>
								</div>
							</td>
							<td class="px-4 py-4 hidden sm:table-cell">
								<div class="flex items-center gap-2">
									{#if isRunning(job.status)}
										<span class="w-2 h-2 bg-domain-500 rounded-full animate-pulse"></span>
									{/if}
									<span class="badge {getStatusBadge(job.status)}">{job.status}</span>
								</div>
								{#if isRunning(job.status) && elapsedTimers[job.id]}
									<div class="text-xs text-domain-600 font-mono mt-1">
										{formatElapsed(elapsedTimers[job.id])}
									</div>
								{/if}
							</td>
							<td class="px-4 py-4 text-right text-sm font-sans text-bark/70 hidden md:table-cell">
								<span class="{isRunning(job.status) ? 'font-medium text-domain-600' : ''}">
									{job.domains_checked}
								</span>
							</td>
							<td class="px-4 py-4 text-right">
								<span class="font-sans font-medium {job.good_results > 0 ? 'text-grove-600' : 'text-bark/60'}">
									{job.good_results}
								</span>
							</td>
							<td class="px-4 py-4 text-right text-sm font-sans text-bark/70 hidden lg:table-cell">
								{#if job.input_tokens || job.output_tokens}
									{((job.input_tokens ?? 0) + (job.output_tokens ?? 0)).toLocaleString()}
								{:else}
									-
								{/if}
							</td>
							<td class="px-4 py-4 text-right text-sm font-sans text-bark/50 hidden md:table-cell">
								{formatDate(job.created_at)}
							</td>
							<td class="px-4 py-4 text-right">
								<a
									href="/admin/history/{job.id}"
									class="text-domain-600 hover:text-domain-700 font-sans text-sm transition-colors"
								>
									View
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination could go here -->
		{#if data.total > jobs.length}
			<div class="text-center text-sm text-bark/50 font-sans">
				Showing {jobs.length} of {data.total} searches
			</div>
		{/if}
	{/if}
</div>
