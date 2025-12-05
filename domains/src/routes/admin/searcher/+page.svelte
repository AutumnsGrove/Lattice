<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let businessName = $state('');
	let domainIdea = $state('');
	let vibe = $state('professional');
	let keywords = $state('');
	let tldPreferences = $state<string[]>(['com', 'co']);

	// UI state
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let currentJob = $state(data.currentJob);
	let jobResults = $state(data.jobResults);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	// Timer state for live elapsed time
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const vibeOptions = [
		{ value: 'professional', label: 'Professional' },
		{ value: 'creative', label: 'Creative' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'bold', label: 'Bold' },
		{ value: 'personal', label: 'Personal' },
		{ value: 'playful', label: 'Playful' },
		{ value: 'tech', label: 'Tech-focused' }
	];

	const tldOptions = [
		{ value: 'com', label: '.com' },
		{ value: 'co', label: '.co' },
		{ value: 'io', label: '.io' },
		{ value: 'dev', label: '.dev' },
		{ value: 'app', label: '.app' },
		{ value: 'me', label: '.me' },
		{ value: 'net', label: '.net' },
		{ value: 'org', label: '.org' }
	];

	function toggleTld(tld: string) {
		if (tldPreferences.includes(tld)) {
			tldPreferences = tldPreferences.filter(t => t !== tld);
		} else {
			tldPreferences = [...tldPreferences, tld];
		}
	}

	async function startSearch() {
		if (!businessName.trim()) {
			errorMessage = 'Business name is required';
			return;
		}

		isSubmitting = true;
		errorMessage = '';

		try {
			const response = await fetch('/api/search/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					business_name: businessName.trim(),
					domain_idea: domainIdea.trim() || null,
					vibe,
					keywords: keywords.trim() || null,
					tld_preferences: tldPreferences
				})
			});

			const result = (await response.json()) as { success?: boolean; error?: string; job?: typeof currentJob };

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				jobResults = [];
				startPolling();
			} else {
				throw new Error(result.error || 'Failed to start search');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to start search';
		} finally {
			isSubmitting = false;
		}
	}

	function startPolling() {
		if (pollingInterval) clearInterval(pollingInterval);

		pollingInterval = setInterval(async () => {
			if (!currentJob) return;

			try {
				const response = await fetch(`/api/search/status?job_id=${currentJob.id}`);
				const result = (await response.json()) as { job?: typeof currentJob; results?: typeof jobResults };

				if (response.ok && result.job) {
					currentJob = result.job;
					jobResults = result.results || [];

					// Stop polling if job is complete or failed
					if (currentJob && (currentJob.status === 'complete' || currentJob.status === 'failed')) {
						stopPolling();
					}
				}
			} catch (err) {
				console.error('Polling error:', err);
			}
		}, 3000); // Poll every 3 seconds
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function startTimer() {
		// Calculate initial elapsed time from started_at
		if (currentJob?.started_at) {
			const startTime = new Date(currentJob.started_at).getTime();
			elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
		} else {
			elapsedSeconds = 0;
		}

		if (timerInterval) clearInterval(timerInterval);

		timerInterval = setInterval(() => {
			if (currentJob?.started_at) {
				const startTime = new Date(currentJob.started_at).getTime();
				elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function formatDuration(seconds: number | null): string {
		if (seconds === null || seconds === undefined) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatElapsed(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		if (mins < 60) return `${mins}m ${secs}s`;
		const hours = Math.floor(mins / 60);
		const remainingMins = mins % 60;
		return `${hours}h ${remainingMins}m ${secs}s`;
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return '-';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getPriceClass(category: string | null): string {
		switch (category) {
			case 'bundled': return 'text-grove-600';
			case 'recommended': return 'text-domain-600';
			case 'premium': return 'text-amber-600';
			default: return 'text-bark/60';
		}
	}

	// Start polling and timer if there's an active job
	$effect(() => {
		if (currentJob && (currentJob.status === 'running' || currentJob.status === 'pending')) {
			startPolling();
			startTimer();
		} else {
			stopTimer();
		}
		return () => {
			stopPolling();
			stopTimer();
		};
	});
</script>

<svelte:head>
	<title>Searcher - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-serif text-bark">Domain Searcher</h1>
		<p class="text-bark/60 font-sans mt-1">Start a new AI-powered domain search</p>
	</div>

	<div class="grid lg:grid-cols-2 gap-8">
		<!-- Search Form -->
		<div class="card p-6">
			<h2 class="font-serif text-lg text-bark mb-6">New Search</h2>

			{#if errorMessage}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					<p class="text-sm font-sans">{errorMessage}</p>
				</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); startSearch(); }} class="space-y-6">
				<!-- Business Name -->
				<div>
					<label for="business_name" class="block text-sm font-sans font-medium text-bark mb-2">
						Business / Project Name *
					</label>
					<input
						id="business_name"
						type="text"
						bind:value={businessName}
						placeholder="e.g., Sunrise Bakery"
						class="input-field"
						required
						disabled={isSubmitting || (currentJob?.status === 'running')}
					/>
				</div>

				<!-- Domain Idea -->
				<div>
					<label for="domain_idea" class="block text-sm font-sans font-medium text-bark mb-2">
						Domain Idea (optional)
					</label>
					<input
						id="domain_idea"
						type="text"
						bind:value={domainIdea}
						placeholder="e.g., sunrisebakery.com"
						class="input-field"
						disabled={isSubmitting || (currentJob?.status === 'running')}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">If you have a specific domain in mind, we'll check it and find similar alternatives</p>
				</div>

				<!-- Vibe -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark mb-2">
						Brand Vibe
					</label>
					<select
						bind:value={vibe}
						class="input-field"
						disabled={isSubmitting || (currentJob?.status === 'running')}
					>
						{#each vibeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- TLD Preferences -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark mb-2">
						Preferred TLDs
					</label>
					<div class="flex flex-wrap gap-2">
						{#each tldOptions as option}
							<button
								type="button"
								onclick={() => toggleTld(option.value)}
								class="px-3 py-1.5 rounded-full text-sm font-sans transition-colors {tldPreferences.includes(option.value) ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-bark/60 border border-transparent hover:bg-bark/10'}"
								disabled={isSubmitting || (currentJob?.status === 'running')}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Keywords -->
				<div>
					<label for="keywords" class="block text-sm font-sans font-medium text-bark mb-2">
						Keywords (optional)
					</label>
					<input
						id="keywords"
						type="text"
						bind:value={keywords}
						placeholder="e.g., artisan, local, organic"
						class="input-field"
						disabled={isSubmitting || (currentJob?.status === 'running')}
					/>
				</div>

				<!-- Submit -->
				<button
					type="submit"
					class="btn-primary w-full flex items-center justify-center gap-2"
					disabled={isSubmitting || !businessName.trim() || (currentJob?.status === 'running')}
				>
					{#if isSubmitting}
						<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Starting Search...
					{:else if currentJob?.status === 'running'}
						<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Search in Progress...
					{:else}
						Start Domain Search
					{/if}
				</button>
			</form>
		</div>

		<!-- Current Job Status -->
		<div class="space-y-6">
			{#if currentJob}
				<!-- Status Card -->
				<div class="card p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="font-serif text-lg text-bark">Search Status</h2>
						<div class="flex items-center gap-2">
							<div class="status-dot status-dot-{currentJob.status === 'running' ? 'running' : currentJob.status === 'complete' ? 'complete' : currentJob.status === 'failed' ? 'error' : 'pending'}"></div>
							<span class="text-sm font-sans capitalize {currentJob.status === 'running' ? 'text-domain-600' : currentJob.status === 'complete' ? 'text-grove-600' : currentJob.status === 'failed' ? 'text-red-600' : 'text-bark/60'}">
								{currentJob.status}
							</span>
						</div>
					</div>

					<div class="space-y-3">
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Business</span>
							<span class="text-bark font-medium">{currentJob.business_name}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Batch</span>
							<span class="text-bark">{currentJob.batch_num} / 6</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Domains Checked</span>
							<span class="text-bark">{currentJob.domains_checked}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">Good Results</span>
							<span class="text-grove-600 font-medium">{currentJob.good_results}</span>
						</div>
						<!-- Live elapsed time for running jobs, final duration for completed -->
						<div class="flex justify-between text-sm font-sans">
							<span class="text-bark/60">
								{currentJob.status === 'running' || currentJob.status === 'pending' ? 'Elapsed' : 'Duration'}
							</span>
							{#if currentJob.status === 'running' || currentJob.status === 'pending'}
								<span class="text-domain-600 font-medium font-mono tabular-nums">
									{formatElapsed(elapsedSeconds)}
								</span>
							{:else if currentJob.duration_seconds}
								<span class="text-bark font-mono tabular-nums">{formatDuration(currentJob.duration_seconds)}</span>
							{:else}
								<span class="text-bark/40">-</span>
							{/if}
						</div>
					</div>

					<!-- Progress bar -->
					{#if currentJob.status === 'running'}
						<div class="mt-4">
							<div class="h-2 bg-grove-100 rounded-full overflow-hidden">
								<div
									class="h-full bg-domain-500 transition-all duration-500"
									style="width: {Math.min((currentJob.batch_num / 6) * 100, 100)}%"
								></div>
							</div>
						</div>
					{/if}
				</div>

				<!-- Results -->
				{#if jobResults.length > 0}
					<div class="card">
						<div class="p-4 border-b border-grove-200 flex justify-between items-center">
							<h2 class="font-serif text-lg text-bark">Available Domains</h2>
							<span class="text-sm text-bark/60 font-sans">{jobResults.filter(r => r.status === 'available').length} available</span>
						</div>
						<div class="max-h-96 overflow-y-auto divide-y divide-grove-100">
							{#each jobResults.filter(r => r.status === 'available').sort((a, b) => b.score - a.score) as result}
								<div class="p-4 hover:bg-grove-50 transition-colors">
									<div class="flex items-center justify-between">
										<div>
											<span class="font-mono text-bark font-medium">{result.domain}</span>
											<div class="flex items-center gap-2 mt-1">
												<span class="text-xs font-sans text-bark/50">Score: {(result.score * 100).toFixed(0)}%</span>
												{#if result.price_category}
													<span class="badge {result.price_category === 'bundled' ? 'badge-success' : result.price_category === 'recommended' ? 'badge-info' : 'badge-warning'}">
														{result.price_category}
													</span>
												{/if}
											</div>
										</div>
										<div class="text-right">
											<span class="{getPriceClass(result.price_category)} font-sans font-medium">
												{formatPrice(result.price_cents)}
											</span>
											<span class="text-xs text-bark/40 font-sans block">/year</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			{:else}
				<div class="card p-8 text-center">
					<svg class="w-16 h-16 mx-auto text-bark/20 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
					<p class="text-bark/60 font-sans">No active search. Fill out the form to start finding domains.</p>
				</div>
			{/if}
		</div>
	</div>
</div>
