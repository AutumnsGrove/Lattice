<script lang="ts">
	import type { PageData } from './$types';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Reactive state for live updates
	let job = $state(untrack(() => data.job));
	let results = $state(untrack(() => data.results));
	let eventSource: EventSource | null = null;
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let elapsedSeconds = $state(0);
	let seenDomainIds = $state<Set<string>>(untrack(() => new Set(data.results.map(r => r.domain))));
	let newDomainIds = $state<Set<string>>(new Set());
	let domainIdeaStatus = $state<{ available: boolean; checked: boolean; price_cents?: number } | null>(null);

	// Follow-up quiz state
	let followupQuiz = $state<{
		job_id: string;
		questions: Array<{
			id: string;
			type: 'text' | 'single_select' | 'multi_select';
			prompt: string;
			required: boolean;
			placeholder?: string;
			options?: { value: string; label: string }[];
			default?: string | string[];
		}>;
		context: {
			batches_completed: number;
			domains_checked: number;
			good_found: number;
			target: number;
		};
	} | null>(null);
	let followupAnswers = $state<Record<string, string | string[]>>({});
	let isFetchingFollowup = $state(false);
	let isSubmittingFollowup = $state(false);
	let followupError = $state<string | null>(null);

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
							handleJobCompletion();
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
							handleJobCompletion();
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
				const data = (await response.json()) as { domains?: unknown };
				if (Array.isArray(data.domains)) {
					results = data.domains;
				}
			}
		} catch (err) {
			console.error('Failed to fetch results:', err);
		}
	}

	async function handleJobCompletion() {
		await fetchFullResults();
		if (job?.status === 'needs_followup') {
			await fetchFollowupQuiz();
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
		// Use toLocaleString for proper local timezone conversion
		return new Date(dateStr).toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
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

	// Fetch follow-up quiz when job status is needs_followup
	async function fetchFollowupQuiz() {
		console.log(`[History Page] fetchFollowupQuiz called for job_id: ${job?.id}, status: ${job?.status}`);
		
		if (!job || job.status !== 'needs_followup') {
			console.log(`[History Page] Skipping fetch - job missing or status not needs_followup`);
			return;
		}

		isFetchingFollowup = true;
		followupError = null;

		// Set a timeout for the fetch request
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

		try {
			console.log(`[History Page] Making followup request for job_id: ${job.id}`);
			const response = await fetch(`/api/search/followup?job_id=${job.id}`, {
				signal: controller.signal
			});
			
			console.log(`[History Page] Followup response status: ${response.status}`);
			
			if (response.ok) {
				const data = (await response.json()) as { questions?: unknown };
				console.log(`[History Page] Followup data received:`, data);
				
				// Check if the worker returned a valid quiz
				if (!data || !data.questions || !Array.isArray(data.questions)) {
					console.error(`[History Page] Invalid followup quiz data structure:`, data);
					followupError = 'No follow-up questions available for this search. The search may continue without additional input.';
					return;
				}
				
				followupQuiz = data as typeof followupQuiz;
				// Initialize answers with defaults
				if (data.questions) {
					data.questions.forEach((q: any) => {
						if (q.default) {
							followupAnswers[q.id] = q.default;
						} else if (q.type === 'multi_select') {
							followupAnswers[q.id] = [];
						} else {
							followupAnswers[q.id] = '';
						}
					});
				}
				console.log(`[History Page] Followup quiz loaded successfully with ${data.questions?.length || 0} questions`);
			} else {
				const errorText = await response.text();
				console.error(`[History Page] Followup API error: ${response.status} - ${errorText}`);
				
				// Handle specific worker errors more gracefully
				if (errorText.includes('No follow-up quiz available')) {
					followupError = 'No additional questions are needed for this search. You can continue the search as-is or try different search parameters.';
				} else {
					throw new Error(`Failed to fetch follow-up quiz: ${response.status} ${errorText}`);
				}
			}
		} catch (err) {
			console.error('[History Page] Failed to fetch follow-up quiz:', err);
			if (err instanceof Error && err.name === 'AbortError') {
				followupError = 'Request timed out. Please check your connection and try again.';
			} else {
				followupError = err instanceof Error ? err.message : 'Unknown error occurred while loading questions.';
			}
		} finally {
			clearTimeout(timeoutId);
			isFetchingFollowup = false;
			console.log(`[History Page] fetchFollowupQuiz completed, isFetchingFollowup: ${isFetchingFollowup}`);
		}
	}

	// Validate required fields
	function validateFollowupAnswers(): boolean {
		if (!followupQuiz) return false;

		for (const question of followupQuiz.questions) {
			if (question.required) {
				const answer = followupAnswers[question.id];
				if (!answer || (Array.isArray(answer) && answer.length === 0)) {
					followupError = `Please answer required question: "${question.prompt}"`;
					return false;
				}
			}
		}
		return true;
	}

	// Submit follow-up answers and resume search
	async function submitFollowupAnswers() {
		console.log(`[History Page] submitFollowupAnswers called for job_id: ${job?.id}`);
		
		if (!job || !followupQuiz) {
			console.log(`[History Page] Cannot submit - missing job or followupQuiz`);
			return;
		}

		if (!validateFollowupAnswers()) {
			console.log(`[History Page] Validation failed, not submitting`);
			return;
		}

		console.log(`[History Page] Submitting followup answers:`, followupAnswers);

		isSubmittingFollowup = true;
		followupError = null;

		// Set a timeout for the resume request
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

		try {
			const response = await fetch(`/api/search/resume?job_id=${job.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ followup_responses: followupAnswers }),
				signal: controller.signal
			});

			console.log(`[History Page] Resume response status: ${response.status}`);

			if (response.ok) {
				console.log(`[History Page] Successfully resumed search`);
				// Update job status to running
				job = { ...job, status: 'running' };
				followupQuiz = null;
				followupAnswers = {};
				// Restart monitoring
				startPolling();
				startTimer();
			} else {
				const errorText = await response.text();
				console.error(`[History Page] Resume API error: ${response.status} - ${errorText}`);
				let errorMessage = `Failed to resume search (${response.status})`;
				try {
					const errorJson = JSON.parse(errorText);
					if (errorJson.error) errorMessage = errorJson.error;
				} catch {
					if (errorText) errorMessage = errorText;
				}
				throw new Error(errorMessage);
			}
		} catch (err) {
			console.error('[History Page] Failed to submit follow-up answers:', err);
			if (err instanceof Error && err.name === 'AbortError') {
				followupError = 'Request timed out. The search may still resume - please check the job status in a moment.';
			} else {
				followupError = err instanceof Error ? err.message : 'Unknown error occurred while resuming search.';
			}
		} finally {
			clearTimeout(timeoutId);
			isSubmittingFollowup = false;
			console.log(`[History Page] submitFollowupAnswers completed, isSubmittingFollowup: ${isSubmittingFollowup}`);
		}
	}

	// Automatically fetch follow-up quiz when job status changes to needs_followup
	$effect(() => {
		if (job?.status === 'needs_followup' && !followupQuiz && !isFetchingFollowup) {
			fetchFollowupQuiz();
		}
	});

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
	<div class="glass-card-muted p-12 text-center">
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
			<div class="glass-stat p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Domains Checked</div>
				<div class="text-2xl font-serif {isRunning ? 'text-domain-600' : 'text-bark'}">{job.domains_checked}</div>
			</div>
			<div class="glass-stat p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Available Found</div>
				<div class="text-2xl font-serif text-grove-600">{job.good_results}</div>
			</div>
			<div class="glass-stat p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">{isRunning ? 'Elapsed' : 'Duration'}</div>
				<div class="text-2xl font-serif {isRunning ? 'text-domain-600' : 'text-bark'}">
					{isRunning ? formatElapsed(elapsedSeconds) : formatDuration(job.duration_seconds)}
				</div>
			</div>
			<div class="glass-stat p-4">
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
		<div class="glass-card p-6">
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

		<!-- Follow-up Quiz -->
		{#if job.status === 'needs_followup'}
			<div class="glass-card p-6 border-2 border-amber-200/60 bg-gradient-to-br from-amber-50/40 to-white/60 backdrop-blur-md">
				<div class="flex items-start gap-3 mb-4">
					<div class="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
						<svg class="w-5 h-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="font-serif text-lg text-bark">Refine Your Search</h2>
						<p class="text-sm text-bark/60 font-sans mt-1">We need a bit more information to find the perfect domains for you.</p>
					</div>
				</div>
				
				{#if isFetchingFollowup}
					<div class="text-center py-8">
						<svg class="w-10 h-10 mx-auto animate-spin text-domain-600" viewBox="0 0 24 24" fill="none">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<p class="mt-3 text-bark/60 font-sans">Loading follow-up questions...</p>
					</div>
				{:else if followupError}
					<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
						<p class="text-sm font-sans">{followupError}</p>
					</div>
					<button
						type="button"
						onclick={fetchFollowupQuiz}
						class="btn-primary w-full flex items-center justify-center gap-2"
					>
						<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
						</svg>
						Retry Loading Questions
					</button>
				{:else if followupQuiz}
					<div class="space-y-6">
						<!-- Context summary -->
						<div class="bg-gradient-to-r from-grove-50 to-domain-50 p-4 rounded-lg border border-grove-200">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-sans text-bark/70">
										We found <span class="font-bold text-grove-700">{followupQuiz.context.good_found}</span> good domains out of <span class="font-bold text-domain-700">{followupQuiz.context.target}</span> target.
									</p>
									<p class="text-xs text-bark/50 font-sans mt-1">Answer these questions to help us find more.</p>
								</div>
								<div class="text-right">
									<div class="text-xs font-sans text-bark/50">Batches completed</div>
									<div class="text-lg font-mono font-bold text-domain-600">{followupQuiz.context.batches_completed}/6</div>
								</div>
							</div>
						</div>

						<!-- Questions -->
						<div class="space-y-5">
							{#each followupQuiz.questions as question, idx}
								<div class="bg-white p-4 rounded-lg border border-grove-100 shadow-sm">
									<div class="flex items-start gap-3 mb-3">
										<div class="flex-shrink-0 w-6 h-6 rounded-full bg-domain-100 text-domain-700 text-xs font-sans font-bold flex items-center justify-center">
											{idx + 1}
										</div>
										<div class="flex-1">
											<label class="block text-sm font-sans font-medium text-bark mb-1">
												{question.prompt}
												{#if question.required}<span class="text-red-500 ml-1">*</span>{/if}
											</label>
											{#if question.placeholder}
												<p class="text-xs text-bark/50 font-sans mb-2">{question.placeholder}</p>
											{/if}
										</div>
									</div>

									{#if question.type === 'text'}
										<input
											type="text"
											class="input-field w-full"
											placeholder={question.placeholder || 'Type your answer...'}
											bind:value={followupAnswers[question.id]}
										/>
									{:else if question.type === 'single_select' && question.options}
										<select
											class="input-field w-full"
											bind:value={followupAnswers[question.id]}
										>
											<option value="">Select an option...</option>
											{#each question.options as opt}
												<option value={opt.value}>{opt.label}</option>
											{/each}
										</select>
									{:else if question.type === 'multi_select' && question.options}
										<div class="flex flex-wrap gap-2">
											{#each question.options as opt}
												{@const currentVal = followupAnswers[question.id]}
												{@const currentArr = Array.isArray(currentVal) ? currentVal : []}
												{@const selected = currentArr.includes(opt.value)}
												<button
													type="button"
													onclick={() => {
														const arr = Array.isArray(followupAnswers[question.id]) ? [...followupAnswers[question.id] as string[]] : [];
														if (arr.includes(opt.value)) {
															followupAnswers[question.id] = arr.filter((v: string) => v !== opt.value);
														} else {
															followupAnswers[question.id] = [...arr, opt.value];
														}
													}}
													class="px-3 py-2 rounded-lg text-sm font-sans transition-all {selected ? 'bg-domain-100 text-domain-700 border-2 border-domain-300 shadow-sm' : 'bg-bark/5 text-bark/60 border border-transparent hover:bg-bark/10 hover:border-bark/20'}"
												>
													{opt.label}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>

						<!-- Submit button -->
						<div class="pt-4 border-t border-grove-200">
							<button
								type="button"
								onclick={submitFollowupAnswers}
								disabled={isSubmittingFollowup}
								class="btn-primary w-full flex items-center justify-center gap-3 py-3 text-base font-medium"
							>
								{#if isSubmittingFollowup}
									<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Resuming Search...
								{:else}
									<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
									Continue Search with Refinements
								{/if}
							</button>
							<p class="text-xs text-center text-bark/50 font-sans mt-3">
								Your search will resume with the additional information you provide.
							</p>
						</div>
					</div>
				{/if}
			</div>
		{/if}

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
