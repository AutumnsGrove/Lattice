<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Reactive state for live updates
	let job = $state(data.job);
	let results = $state(data.results);
	let eventSource: EventSource | null = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let elapsedSeconds = $state(0);
	let seenDomainIds = $state<Set<string>>(new Set(data.results.map(r => r.domain)));
	let newDomainIds = $state<Set<string>>(new Set());
	let domainIdeaStatus = $state<{ available: boolean; checked: boolean; price_cents?: number } | null>(null);

	// Check if job is running
	const isRunning = $derived(job && (job.status === 'running' || job.status === 'pending'));

	// Group results by status
	const availableResults = $derived(results.filter(r => r.status === 'available').sort((a, b) => b.score - a.score));
	const unavailableResults = $derived(results.filter(r => r.status !== 'available'));

	// Start/stop monitoring based on job status
	$effect(() => {
		if (isRunning) {
			startSSEStream();
			startTimer();
		} else {
			stopMonitoring();
		}
		return () => stopMonitoring();
	});

	function startSSEStream() {
		if (!job || eventSource) return;

		try {
			eventSource = new EventSource(`/api/search/stream?job_id=${job.id}`);

			eventSource.onmessage = (event) => {
				try {
					const eventData = JSON.parse(event.data);

					if (eventData.event === 'status' && job) {
						// Update job status
						job = {
							...job,
							status: eventData.status,
							batch_num: eventData.batch_num,
							domains_checked: eventData.domains_checked,
							domains_available: eventData.domains_available,
							good_results: eventData.good_results,
						};

						// Process recent domains for live streaming
						if (eventData.recent_domains) {
							for (const domain of eventData.recent_domains) {
								if (!seenDomainIds.has(domain.domain)) {
									seenDomainIds.add(domain.domain);
									newDomainIds.add(domain.domain);
									results = [domain, ...results];

									// Remove from "new" after animation
									setTimeout(() => {
										newDomainIds.delete(domain.domain);
										newDomainIds = new Set(newDomainIds);
									}, 3000);
								}
							}
							seenDomainIds = new Set(seenDomainIds);
							newDomainIds = new Set(newDomainIds);
						}

						// Update domain_idea status
						if (eventData.domain_idea_status) {
							domainIdeaStatus = eventData.domain_idea_status;
						}

						// Check for terminal state
						if (['complete', 'failed', 'cancelled', 'needs_followup'].includes(eventData.status)) {
							stopMonitoring();
							fetchFullResults();
						}
					}
				} catch (err) {
					console.error('SSE parse error:', err);
				}
			};

			eventSource.onerror = () => {
				console.warn('SSE error, falling back to polling');
				stopSSE();
				startPolling();
			};
		} catch (err) {
			console.error('Failed to start SSE:', err);
			startPolling();
		}
	}

	function stopSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	function startPolling() {
		if (pollingInterval || !job) return;

		pollingInterval = setInterval(async () => {
			if (!job) return;
			try {
				const response = await fetch(`/api/search/status?job_id=${job.id}`);
				if (response.ok) {
					const result = await response.json() as { job?: typeof job };
					if (result.job) {
						job = { ...job, ...result.job };
						if (['complete', 'failed', 'cancelled', 'needs_followup'].includes(job.status)) {
							stopMonitoring();
							fetchFullResults();
						}
					}
				}
			} catch (err) {
				console.error('Polling error:', err);
			}
		}, 3000);
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function startTimer() {
		if (timerInterval) return;
		// Initialize elapsed time - use started_at or fall back to created_at
		const startTime = job?.started_at || job?.created_at;
		if (startTime) {
			const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
			// Prevent negative elapsed times (can happen with timezone differences)
			elapsedSeconds = Math.max(0, elapsed);
		}
		timerInterval = setInterval(() => {
			elapsedSeconds++;
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function stopMonitoring() {
		stopSSE();
		stopPolling();
		stopTimer();
	}

	async function fetchFullResults() {
		if (!job) return;
		try {
			const response = await fetch(`/api/search/results?job_id=${job.id}`);
			if (response.ok) {
				const data = await response.json();
				if (data.domains) {
					results = data.domains;
				}
			}
		} catch (err) {
			console.error('Failed to fetch results:', err);
		}
	}

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatElapsed(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return '-';
		return `$${(cents / 100).toFixed(2)}`;
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

	function getPriceClass(category: string | null): string {
		switch (category) {
			case 'bundled': return 'text-grove-600';
			case 'recommended': return 'text-domain-600';
			case 'premium': return 'text-amber-600';
			default: return 'text-bark/60';
		}
	}

	function formatTldPreferences(tldPrefs: string | string[] | null | undefined): string {
		if (!tldPrefs) return 'None specified';
		try {
			const prefs = typeof tldPrefs === 'string' ? JSON.parse(tldPrefs) : tldPrefs;
			if (Array.isArray(prefs) && prefs.length > 0) {
				return prefs.map((t: string) => `.${t}`).join(', ');
			}
			return 'None specified';
		} catch {
			return 'None specified';
		}
	}
</script>

<style>
	@keyframes slide-in {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>

<svelte:head>
	<title>{data.job?.business_name || 'Job'} - History - Domain Finder</title>
</svelte:head>

{#if !job}
	<div class="card p-12 text-center">
		<p class="text-bark/60 font-sans">Job not found</p>
		<a href="/admin/history" class="btn-primary inline-block mt-4">
			Back to History
		</a>
	</div>
{:else}
	<div class="space-y-8">
		<!-- Page Header -->
		<div class="flex items-start justify-between">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<a href="/admin/history" class="text-bark/50 hover:text-bark transition-colors" aria-label="Back to history">
						<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" />
						</svg>
					</a>
					<h1 class="text-2xl font-serif text-bark">{job.business_name}</h1>
					<div class="flex items-center gap-2">
						{#if isRunning}
							<span class="w-2 h-2 bg-domain-500 rounded-full animate-pulse"></span>
						{/if}
						<span class="badge {getStatusBadge(job.status)}">{job.status}</span>
					</div>
				</div>
				<p class="text-bark/60 font-sans">{job.client_email}</p>
			</div>
			{#if isRunning}
				<div class="text-right">
					<div class="text-sm text-bark/60 font-sans">Elapsed</div>
					<div class="text-lg font-mono text-domain-600">{formatElapsed(elapsedSeconds)}</div>
				</div>
			{/if}
		</div>

		<!-- Job Details -->
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Domains Checked</div>
				<div class="text-2xl font-serif {isRunning ? 'text-domain-600' : 'text-bark'}">{job.domains_checked}</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Available Found</div>
				<div class="text-2xl font-serif text-grove-600">{job.good_results}</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">{isRunning ? 'Elapsed' : 'Duration'}</div>
				<div class="text-2xl font-serif {isRunning ? 'text-domain-600' : 'text-bark'}">
					{isRunning ? formatElapsed(elapsedSeconds) : formatDuration(job.duration_seconds)}
				</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Batches</div>
				<div class="text-2xl font-serif text-bark">{job.batch_num} / 6</div>
				{#if isRunning}
					<div class="mt-2 h-1.5 bg-grove-100 rounded-full overflow-hidden">
						<div class="h-full bg-domain-500 transition-all" style="width: {(job.batch_num / 6) * 100}%"></div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Search Parameters -->
		<div class="card p-6">
			<h2 class="font-serif text-lg text-bark mb-4">Search Parameters</h2>
			<div class="grid sm:grid-cols-2 gap-4 text-sm font-sans">
				<div>
					<span class="text-bark/60">Vibe:</span>
					<span class="text-bark ml-2 capitalize">{job.vibe}</span>
				</div>
				{#if job.domain_idea}
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-bark/60">Domain Idea:</span>
						<span class="text-bark font-mono">{job.domain_idea}</span>
						{#if domainIdeaStatus}
							{#if domainIdeaStatus.checked}
								{#if domainIdeaStatus.available}
									<span class="inline-flex items-center gap-1 text-grove-600 text-xs">
										<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
										</svg>
										Available
									</span>
								{:else}
									<span class="inline-flex items-center gap-1 text-red-500 text-xs">
										<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
										</svg>
										Taken
									</span>
								{/if}
							{:else if isRunning}
								<span class="text-bark/40 text-xs">Checking...</span>
							{/if}
						{:else if isRunning}
							<span class="text-bark/40 text-xs">Checking...</span>
						{/if}
					</div>
				{/if}
				<div>
					<span class="text-bark/60">TLD Preferences:</span>
					<span class="text-bark ml-2">{formatTldPreferences(job.tld_preferences)}</span>
				</div>
				{#if job.keywords}
					<div>
						<span class="text-bark/60">Keywords:</span>
						<span class="text-bark ml-2">{job.keywords}</span>
					</div>
				{/if}
				<div>
					<span class="text-bark/60">Created:</span>
					<span class="text-bark ml-2">{formatDate(job.created_at)}</span>
				</div>
				{#if job.completed_at}
					<div>
						<span class="text-bark/60">Completed:</span>
						<span class="text-bark ml-2">{formatDate(job.completed_at)}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Available Domains -->
		{#if availableResults.length > 0 || isRunning}
			<div class="card">
				<div class="p-4 border-b border-grove-200 flex justify-between items-center">
					<h2 class="font-serif text-lg text-bark">Available Domains</h2>
					<div class="flex items-center gap-2">
						{#if isRunning}
							<span class="inline-flex items-center gap-1.5 text-sm text-domain-600 font-sans">
								<span class="w-2 h-2 bg-domain-500 rounded-full animate-pulse"></span>
								Live
							</span>
						{/if}
						<span class="text-sm text-grove-600 font-sans">{availableResults.length} found</span>
					</div>
				</div>
				{#if availableResults.length > 0}
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-grove-50 border-b border-grove-200">
								<tr>
									<th class="text-left px-4 py-3 text-sm font-sans font-medium text-bark/70">Domain</th>
									<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70">Score</th>
									<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70">Category</th>
									<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70">Price</th>
									<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden md:table-cell">Batch</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grove-100">
								{#each availableResults as result (result.domain)}
									<tr class="hover:bg-grove-50 transition-colors {newDomainIds.has(result.domain) ? 'animate-slide-in bg-grove-50/50' : ''}">
										<td class="px-4 py-3">
											<span class="font-mono text-bark font-medium">{result.domain}</span>
										</td>
										<td class="px-4 py-3 text-center">
											<div class="w-full bg-grove-100 rounded-full h-2 max-w-[60px] mx-auto">
												<div
													class="bg-domain-500 h-2 rounded-full"
													style="width: {result.score * 100}%"
												></div>
											</div>
											<span class="text-xs text-bark/50 font-sans">{(result.score * 100).toFixed(0)}%</span>
										</td>
										<td class="px-4 py-3 text-center">
											{#if result.price_category}
												<span class="badge {result.price_category === 'bundled' ? 'badge-success' : result.price_category === 'recommended' ? 'badge-info' : 'badge-warning'}">
													{result.price_category}
												</span>
											{:else}
												<span class="text-bark/40">-</span>
											{/if}
										</td>
										<td class="px-4 py-3 text-right">
											<span class="{getPriceClass(result.price_category)} font-sans font-medium">
												{formatPrice(result.price_cents)}
											</span>
										</td>
										<td class="px-4 py-3 text-center text-sm text-bark/50 font-sans hidden md:table-cell">
											{result.batch_num}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="p-8 text-center text-bark/50 font-sans">
						{#if isRunning}
							Waiting for available domains...
						{:else}
							No available domains found.
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Checked (Unavailable) Domains - Collapsed by default -->
		{#if unavailableResults.length > 0}
			<details class="card">
				<summary class="p-4 cursor-pointer hover:bg-grove-50 transition-colors flex justify-between items-center">
					<h2 class="font-serif text-lg text-bark">Checked Domains (Unavailable)</h2>
					<span class="text-sm text-bark/50 font-sans">{unavailableResults.length} domains</span>
				</summary>
				<div class="border-t border-grove-200 p-4">
					<div class="flex flex-wrap gap-2">
						{#each unavailableResults as result}
							<span class="px-2 py-1 bg-bark/5 rounded text-sm font-mono text-bark/50">
								{result.domain}
							</span>
						{/each}
					</div>
				</div>
			</details>
		{/if}
	</div>
{/if}
