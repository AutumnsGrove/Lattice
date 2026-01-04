<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Calculate stats
	const totalJobs = $derived(data.jobs.length);
	const runningJobs = $derived(data.jobs.filter(j => j.status === 'running').length);
	const completedJobs = $derived(data.jobs.filter(j => j.status === 'complete').length);
	const totalDomainsFound = $derived(data.jobs.reduce((sum, j) => sum + j.good_results, 0));

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusBadge(status: string): string {
		switch (status) {
			case 'running': return 'badge-info';
			case 'complete': return 'badge-success';
			case 'failed': return 'badge-error';
			case 'needs_followup': return 'badge-warning';
			default: return 'bg-bark/10 text-bark/60';
		}
	}
</script>

<svelte:head>
	<title>Dashboard - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-serif text-bark dark:text-neutral-100">Dashboard</h1>
		<p class="text-bark/60 dark:text-neutral-400 font-sans mt-1">Overview of domain search activity</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
		<div class="glass-stat p-6">
			<div class="text-sm font-sans text-bark/60 dark:text-neutral-400 mb-1">Total Searches</div>
			<div class="text-3xl font-serif text-bark dark:text-neutral-100">{totalJobs}</div>
		</div>
		<div class="glass-stat p-6">
			<div class="text-sm font-sans text-bark/60 dark:text-neutral-400 mb-1">Currently Running</div>
			<div class="text-3xl font-serif text-domain-600 dark:text-domain-400">{runningJobs}</div>
			{#if runningJobs > 0}
				<div class="mt-2 flex items-center gap-1.5">
					<span class="w-2 h-2 bg-domain-500 dark:bg-domain-400 rounded-full animate-pulse"></span>
					<span class="text-xs text-domain-600 dark:text-domain-400 font-sans">Active</span>
				</div>
			{/if}
		</div>
		<div class="glass-stat p-6">
			<div class="text-sm font-sans text-bark/60 dark:text-neutral-400 mb-1">Completed</div>
			<div class="text-3xl font-serif text-grove-600 dark:text-grove-400">{completedJobs}</div>
		</div>
		<div class="glass-stat p-6">
			<div class="text-sm font-sans text-bark/60 dark:text-neutral-400 mb-1">Domains Found</div>
			<div class="text-3xl font-serif text-bark dark:text-neutral-100">{totalDomainsFound}</div>
		</div>
	</div>

	<!-- Quick Actions -->
	<div class="flex gap-4">
		<a href="/admin/searcher" class="btn-primary">
			Start New Search
		</a>
		<a href="/admin/history" class="btn-ghost">
			View All History
		</a>
	</div>

	<!-- Recent Jobs -->
	<div class="glass-card">
		<div class="p-4 border-b glass-divider">
			<h2 class="font-serif text-lg text-bark dark:text-neutral-100">Recent Searches</h2>
		</div>
		{#if data.jobs.length === 0}
			<div class="p-8 text-center">
				<p class="text-bark/60 dark:text-neutral-400 font-sans">No searches yet. Start your first domain search!</p>
			</div>
		{:else}
			<div class="divide-y glass-divide">
				{#each data.jobs.slice(0, 5) as job}
					<a href="/admin/history/{job.id}" class="block p-4 hover:bg-white/40 dark:hover:bg-neutral-800/40 transition-colors">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="status-dot status-dot-{job.status === 'running' ? 'running' : job.status === 'complete' ? 'complete' : job.status === 'failed' ? 'error' : 'pending'}"></div>
								<div>
									<div class="font-sans font-medium text-bark dark:text-neutral-100">{job.business_name}</div>
									<div class="text-sm text-bark/60 dark:text-neutral-400 font-sans">{job.client_email}</div>
								</div>
							</div>
							<div class="text-right">
								<span class="badge {getStatusBadge(job.status)}">{job.status}</span>
								<div class="text-xs text-bark/50 dark:text-neutral-500 font-sans mt-1">
									{formatDate(job.created_at)}
								</div>
							</div>
						</div>
						<div class="mt-2 flex gap-4 text-sm text-bark/60 dark:text-neutral-400 font-sans">
							<span>{job.domains_checked} checked</span>
							<span>{job.good_results} found</span>
							{#if job.duration_seconds}
								<span>{formatDuration(job.duration_seconds)}</span>
							{/if}
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
