<script lang="ts">
	import type { PageData } from './$types';
	import { untrack } from 'svelte';
	import { GlassCard, GlassButton } from '@autumnsgrove/groveengine/ui';

	let { data }: { data: PageData } = $props();

	// Types for worker responses
	interface EvaluationData {
		pronounceable?: boolean;
		memorable?: boolean;
		brand_fit?: boolean;
		email_friendly?: boolean;
		notes?: string;
		rdap_registrar?: string;
		rdap_expiration?: string;
		pricing_category?: 'bundled' | 'recommended' | 'standard' | 'premium';
		renewal_cents?: number;
	}

	interface DomainResult {
		domain: string;
		tld: string;
		status: 'available' | 'registered' | 'unknown';
		price_cents?: number;
		score: number;
		flags: string[];
		evaluation_data?: EvaluationData;
		price_display?: string;
		pricing_category?: string;
	}

	interface PricingSummary {
		bundled: number;
		recommended: number;
		standard: number;
		premium: number;
	}

	interface TokenUsage {
		input_tokens: number;
		output_tokens: number;
		total_tokens: number;
	}

	interface ResultsResponse {
		job_id: string;
		status: string;
		batch_num: number;
		domains: DomainResult[];
		total_checked: number;
		pricing_summary: PricingSummary;
		usage: TokenUsage;
	}

	interface QuizQuestion {
		id: string;
		type: 'text' | 'single_select' | 'multi_select';
		prompt: string;
		required: boolean;
		placeholder?: string;
		options?: { value: string; label: string }[];
		default?: string | string[];
	}

	interface FollowupResponse {
		job_id: string;
		questions: QuizQuestion[];
		context: {
			batches_completed: number;
			domains_checked: number;
			good_found: number;
			target: number;
		};
	}

	// SSE status event from worker
	interface SSEStatusEvent {
		event: 'status';
		job_id: string;
		status: string;
		batch_num: number;
		domains_checked: number;
		domains_available: number;
		good_results: number;
	}

	// Search mode: 'detailed' or 'vibe' (vibe is default - quick and easy!)
	type SearchMode = 'detailed' | 'vibe';
	let searchMode = $state<SearchMode>('vibe');

	// Form state
	let businessName = $state('');
	let domainIdea = $state('');
	let vibe = $state('professional');
	let keywords = $state('');
	let tldPreferences = $state<string[]>(['com', 'co']);
	// Fixed to OpenRouter for zero-data-retention compliance
	const aiProvider = 'openrouter';

	// Vibe mode state
	let vibeText = $state('');
	let isParsingVibe = $state(false);
	let parsedVibe = $state<{
		business_name: string;
		vibe: string;
		keywords: string;
		tld_preferences: string[];
		domain_idea: string | null;
	} | null>(null);
	let pendingJobId = $state<string | null>(null);
	let vibeError = $state('');

	// Example prompts for vibe mode
	const vibeExamples = [
		"A modern tech startup called Quantum Labs focusing on AI and machine learning",
		"Cozy coffee shop called Morning Bloom with artisan, local, and organic vibes",
		"Freelance graphic designer Jane Smith, creative and minimal aesthetic"
	];

	// Word count for vibe text
	const vibeWordCount = $derived(vibeText.trim().split(/\s+/).filter(Boolean).length);

	// UI state
	let isSubmitting = $state(false);
	let isCancelling = $state(false);
	let isLoadingResults = $state(false);
	let isSubmittingFollowup = $state(false);
	let errorMessage = $state('');
	let currentJob = $state(untrack(() => data.currentJob));
	let jobResults = $state<DomainResult[]>([]);
	let pricingSummary = $state<PricingSummary | null>(null);
	let tokenUsage = $state<TokenUsage | null>(null);
	let followupQuiz = $state<FollowupResponse | null>(null);
	let followupAnswers = $state<Record<string, string | string[]>>({});
	let pollingInterval: ReturnType<typeof setInterval> | null = null;
	let eventSource: EventSource | null = null;
	let useSSE = $state(true); // Try SSE first, fallback to polling

	// Timer state for live elapsed time
	let elapsedSeconds = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Expanded result state for showing evaluation details
	let expandedDomains = $state<Set<string>>(new Set());

	const vibeOptions = [
		{ value: 'professional', label: 'Professional' },
		{ value: 'creative', label: 'Creative' },
		{ value: 'minimal', label: 'Minimal' },
		{ value: 'bold', label: 'Bold' },
		{ value: 'personal', label: 'Personal' },
		{ value: 'playful', label: 'Playful' },
		{ value: 'tech', label: 'Tech-focused' }
	];

	// TLD Groups for categorized selection
	interface TldGroup {
		id: string;
		label: string;
		description: string;
		tlds: { value: string; label: string }[];
	}

	const tldGroups: TldGroup[] = [
		{
			id: 'classic',
			label: 'Classic',
			description: 'Traditional and widely recognized',
			tlds: [
				{ value: 'com', label: '.com' },
				{ value: 'net', label: '.net' },
				{ value: 'org', label: '.org' }
			]
		},
		{
			id: 'tech',
			label: 'Tech',
			description: 'Perfect for startups and developers',
			tlds: [
				{ value: 'io', label: '.io' },
				{ value: 'dev', label: '.dev' },
				{ value: 'app', label: '.app' },
				{ value: 'tech', label: '.tech' },
				{ value: 'ai', label: '.ai' },
				{ value: 'software', label: '.software' }
			]
		},
		{
			id: 'creative',
			label: 'Creative',
			description: 'For designers, artists, and makers',
			tlds: [
				{ value: 'design', label: '.design' },
				{ value: 'studio', label: '.studio' },
				{ value: 'space', label: '.space' },
				{ value: 'art', label: '.art' },
				{ value: 'gallery', label: '.gallery' }
			]
		},
		{
			id: 'nature',
			label: 'Nature',
			description: 'Earthy and organic vibes',
			tlds: [
				{ value: 'garden', label: '.garden' },
				{ value: 'earth', label: '.earth' },
				{ value: 'green', label: '.green' },
				{ value: 'place', label: '.place' },
				{ value: 'life', label: '.life' },
				{ value: 'land', label: '.land' }
			]
		},
		{
			id: 'business',
			label: 'Business',
			description: 'Professional and corporate',
			tlds: [
				{ value: 'co', label: '.co' },
				{ value: 'biz', label: '.biz' },
				{ value: 'company', label: '.company' },
				{ value: 'agency', label: '.agency' },
				{ value: 'consulting', label: '.consulting' }
			]
		},
		{
			id: 'personal',
			label: 'Personal',
			description: 'Great for personal brands',
			tlds: [
				{ value: 'me', label: '.me' },
				{ value: 'name', label: '.name' },
				{ value: 'blog', label: '.blog' },
				{ value: 'page', label: '.page' }
			]
		}
	];

	// State for expanded groups (Classic and Tech expanded by default)
	let expandedGroups = $state<Set<string>>(new Set(['classic', 'tech']));

	// Diverse TLDs toggle
	let diverseTlds = $state(false);

	function toggleGroup(groupId: string) {
		const newSet = new Set(expandedGroups);
		if (newSet.has(groupId)) {
			newSet.delete(groupId);
		} else {
			newSet.add(groupId);
		}
		expandedGroups = newSet;
	}

	function selectAllInGroup(groupId: string) {
		const group = tldGroups.find(g => g.id === groupId);
		if (!group) return;
		const groupTlds = group.tlds.map(t => t.value);
		tldPreferences = [...new Set([...tldPreferences, ...groupTlds])];
	}

	function deselectAllInGroup(groupId: string) {
		const group = tldGroups.find(g => g.id === groupId);
		if (!group) return;
		const groupTldSet = new Set(group.tlds.map(t => t.value));
		tldPreferences = tldPreferences.filter(t => !groupTldSet.has(t));
	}

	function getSelectedCountInGroup(groupId: string): number {
		const group = tldGroups.find(g => g.id === groupId);
		if (!group) return 0;
		return group.tlds.filter(t => tldPreferences.includes(t.value)).length;
	}

	// Provider locked to OpenRouter for ZDR compliance with DeepSeek v3.2
	const aiProviderInfo = {
		provider: 'OpenRouter',
		model: 'DeepSeek v3.2',
		description: 'Zero data retention, great quality, low cost'
	};

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
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;

		try {
			const response = await fetch('/api/search/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					business_name: businessName.trim(),
					domain_idea: domainIdea.trim() || null,
					vibe,
					keywords: keywords.trim() || null,
					tld_preferences: tldPreferences,
					diverse_tlds: diverseTlds,
					// Only include provider if not the default (openrouter)
					...(aiProvider !== 'openrouter' && { ai_provider: aiProvider })
				})
			});

			const result = (await response.json()) as { success?: boolean; error?: string; job?: typeof currentJob };

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				startMonitoring();
			} else {
				throw new Error(result.error || 'Failed to start search');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to start search';
		} finally {
			isSubmitting = false;
		}
	}

	function startSSEStream() {
		if (!currentJob) return;
		if (eventSource) {
			eventSource.close();
		}

		try {
			eventSource = new EventSource(`/api/search/stream?job_id=${currentJob.id}`);

			eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data) as SSEStatusEvent;
					if (data.event === 'status' && currentJob) {
						// Update job state from SSE
						currentJob = {
							...currentJob,
							status: data.status as typeof currentJob.status,
							batch_num: data.batch_num,
							domains_checked: data.domains_checked,
							domains_available: data.domains_available,
							good_results: data.good_results,
						};

						// Check for terminal states
						if (['complete', 'failed', 'cancelled', 'needs_followup'].includes(data.status)) {
							stopSSE();
							stopTimer();
							handleJobComplete(data.status);
						}
					}
				} catch (err) {
					console.error('SSE parse error:', err);
				}
			};

			eventSource.onerror = () => {
				console.warn('SSE connection error, falling back to polling');
				stopSSE();
				useSSE = false;
				startPolling();
			};
		} catch (err) {
			console.error('Failed to start SSE:', err);
			useSSE = false;
			startPolling();
		}
	}

	function stopSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	async function handleJobComplete(status: string) {
		console.log(`[Frontend] Job completed with status: ${status}`);
		
		// Fetch full results for complete or needs_followup
		if (status === 'complete' || status === 'needs_followup') {
			console.log(`[Frontend] Fetching results for status: ${status}`);
			await fetchResults();
		}
		// Fetch followup quiz if needed
		if (status === 'needs_followup') {
			console.log(`[Frontend] Job needs followup, fetching quiz...`);
			await fetchFollowup();
		}
	}

	function startPolling() {
		if (pollingInterval) clearInterval(pollingInterval);

		pollingInterval = setInterval(async () => {
			if (!currentJob) return;

			try {
				const response = await fetch(`/api/search/status?job_id=${currentJob.id}`);
				const result = (await response.json()) as { job?: typeof currentJob };

				if (response.ok && result.job) {
					currentJob = result.job;

					// Stop polling and fetch results if job is terminal
					if (currentJob && ['complete', 'failed', 'cancelled', 'needs_followup'].includes(currentJob.status)) {
						stopPolling();
						stopTimer();
						await handleJobComplete(currentJob.status);
					}
				}
			} catch (err) {
				console.error('Polling error:', err);
			}
		}, 2000); // Poll every 2 seconds
	}

	function stopPolling() {
		if (pollingInterval) {
			clearInterval(pollingInterval);
			pollingInterval = null;
		}
	}

	function startMonitoring() {
		if (useSSE) {
			startSSEStream();
		} else {
			startPolling();
		}
	}

	function stopMonitoring() {
		stopSSE();
		stopPolling();
	}

	async function fetchResults() {
		if (!currentJob) return;

		isLoadingResults = true;
		try {
			const response = await fetch(`/api/search/results?job_id=${currentJob.id}`);
			if (response.ok) {
				const results = (await response.json()) as ResultsResponse;
				jobResults = results.domains || [];
				pricingSummary = results.pricing_summary || null;
				tokenUsage = results.usage || null;
			}
		} catch (err) {
			console.error('Failed to fetch results:', err);
		} finally {
			isLoadingResults = false;
		}
	}

	async function fetchFollowup() {
		if (!currentJob) {
			console.log(`[Frontend] No current job, skipping followup fetch`);
			return;
		}

		console.log(`[Frontend] Fetching followup quiz for job_id: ${currentJob.id}`);
		console.log(`[Frontend] Current job status: ${currentJob.status}`);
		
		try {
			const response = await fetch(`/api/search/followup?job_id=${currentJob.id}`);
			console.log(`[Frontend] Followup response status: ${response.status}`);
			
			if (response.ok) {
				const data = (await response.json()) as { questions?: unknown };
				console.log(`[Frontend] Followup quiz data received:`, data);

				// Validate the response data
				if (!data || !data.questions || !Array.isArray(data.questions)) {
					console.error(`[Frontend] Invalid followup quiz data structure:`, data);
					errorMessage = 'Invalid followup quiz data received from server';
					return;
				}
				
				followupQuiz = data as FollowupResponse;
				
				// Initialize answers with defaults
				followupQuiz.questions.forEach(q => {
					if (q.default) {
						followupAnswers[q.id] = q.default;
					}
				});
				console.log(`[Frontend] Followup quiz loaded with ${followupQuiz.questions?.length || 0} questions`);
			} else {
				const errorText = await response.text();
				console.error(`[Frontend] Followup API error: ${response.status} - ${errorText}`);
				errorMessage = `Failed to load followup quiz: ${errorText}`;
			}
		} catch (err) {
			console.error('[Frontend] Failed to fetch followup:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load followup quiz';
		}
	}

	async function submitFollowup() {
		if (!currentJob || !followupQuiz) return;

		console.log(`[Frontend] Submitting followup answers for job_id: ${currentJob.id}`);
		console.log(`[Frontend] Followup answers:`, followupAnswers);
		
		isSubmittingFollowup = true;
		errorMessage = ''; // Clear any previous errors
		
		try {
			const response = await fetch(`/api/search/resume?job_id=${currentJob.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ followup_responses: followupAnswers })
			});

			console.log(`[Frontend] Resume search response status: ${response.status}`);
			
			if (response.ok) {
				console.log(`[Frontend] Successfully resumed search`);
				const result = await response.json();
				console.log(`[Frontend] Resume result:`, result);
				
				// Reset followup state
				followupQuiz = null;
				followupAnswers = {};
				
				// Update job status and restart monitoring
				currentJob = { ...currentJob, status: 'running' };
				startMonitoring();
				startTimer();
			} else {
				const errorText = await response.text();
				console.error(`[Frontend] Resume search API error: ${response.status} - ${errorText}`);
				errorMessage = `Failed to resume search: ${errorText}`;
			}
		} catch (err) {
			console.error('Failed to resume search:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to resume search';
		} finally {
			isSubmittingFollowup = false;
		}
	}

	async function cancelSearch() {
		if (!currentJob) return;

		isCancelling = true;
		try {
			const response = await fetch('/api/search/cancel', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ job_id: currentJob.id })
			});

			if (response.ok) {
				currentJob = { ...currentJob, status: 'cancelled', error: 'Cancelled by user' };
				stopMonitoring();
				stopTimer();
			}
		} catch (err) {
			console.error('Cancel error:', err);
		} finally {
			isCancelling = false;
		}
	}

	function startNewSearch() {
		currentJob = null;
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;
		followupAnswers = {};
		errorMessage = '';
		// Also reset vibe mode state
		parsedVibe = null;
		pendingJobId = null;
		vibeError = '';
	}

	// Vibe API response types
	interface VibeErrorResponse {
		success: false;
		error: string;
		hint?: string;
		word_count?: number;
	}

	interface VibeSuccessResponse {
		success: true;
		job_id: string;
		status: string;
		parsed: {
			business_name: string;
			vibe: string;
			keywords: string;
			tld_preferences: string[];
			domain_idea: string | null;
		};
	}

	type VibeResponse = VibeErrorResponse | VibeSuccessResponse;

	// Vibe Mode Functions
	async function submitVibe() {
		if (vibeWordCount < 5) {
			vibeError = `Please add more detail - we need at least 5 words. You have ${vibeWordCount}.`;
			return;
		}

		isParsingVibe = true;
		vibeError = '';
		parsedVibe = null;
		pendingJobId = null;

		try {
			const response = await fetch('/api/vibe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					vibe_text: vibeText.trim()
				})
			});

			const result = (await response.json()) as VibeResponse;

			if (!response.ok || !result.success) {
				const errorResult = result as VibeErrorResponse;
				if (errorResult.error === 'word_count_too_low') {
					vibeError = errorResult.hint || 'Please add more detail.';
				} else if (errorResult.error === 'parsing_failed') {
					vibeError = errorResult.hint || "We couldn't understand that. Try adding more detail about your business.";
				} else {
					vibeError = errorResult.error || 'Something went wrong. Please try again.';
				}
				return;
			}

			// Success! Store parsed results and job_id
			parsedVibe = result.parsed;
			pendingJobId = result.job_id;
		} catch (err) {
			vibeError = err instanceof Error ? err.message : 'Failed to process your description';
		} finally {
			isParsingVibe = false;
		}
	}

	async function startSearchFromVibe() {
		if (!parsedVibe || !pendingJobId) return;

		isSubmitting = true;
		errorMessage = '';
		jobResults = [];
		pricingSummary = null;
		tokenUsage = null;
		followupQuiz = null;

		try {
			// Use the regular search start endpoint with parsed values
			const response = await fetch('/api/search/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					business_name: parsedVibe.business_name,
					domain_idea: parsedVibe.domain_idea || null,
					vibe: parsedVibe.vibe,
					keywords: parsedVibe.keywords || null,
					tld_preferences: parsedVibe.tld_preferences,
					diverse_tlds: false,
					...(aiProvider !== 'openrouter' && { ai_provider: aiProvider })
				})
			});

			const result = (await response.json()) as { success?: boolean; error?: string; job?: typeof currentJob };

			if (response.ok && result.success) {
				currentJob = result.job ?? null;
				// Clear vibe mode state since we're now in search mode
				parsedVibe = null;
				pendingJobId = null;
				vibeText = '';
				startMonitoring();
			} else {
				throw new Error(result.error || 'Failed to start search');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to start search';
		} finally {
			isSubmitting = false;
		}
	}

	function clearVibeResults() {
		parsedVibe = null;
		pendingJobId = null;
		vibeError = '';
	}

	function useExample(example: string) {
		vibeText = example;
		// Clear any previous results when using a new example
		parsedVibe = null;
		pendingJobId = null;
		vibeError = '';
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

	function formatPrice(cents: number | null | undefined): string {
		if (!cents) return '-';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getPriceClass(category: string | null | undefined): string {
		switch (category) {
			case 'bundled': return 'text-grove-600 dark:text-grove-400';
			case 'recommended': return 'text-domain-600 dark:text-domain-400';
			case 'premium': return 'text-amber-600 dark:text-amber-400';
			default: return 'text-foreground-muted';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'running': return 'text-domain-600 dark:text-domain-400';
			case 'pending': return 'text-foreground-muted';
			case 'complete': return 'text-grove-600 dark:text-grove-400';
			case 'needs_followup': return 'text-amber-600 dark:text-amber-400';
			case 'failed': return 'text-red-600 dark:text-red-400';
			case 'cancelled': return 'text-red-500 dark:text-red-400';
			default: return 'text-foreground-muted';
		}
	}

	function getStatusDot(status: string): string {
		switch (status) {
			case 'running': return 'status-dot-running';
			case 'pending': return 'status-dot-pending';
			case 'complete': return 'status-dot-complete';
			case 'needs_followup': return 'status-dot-warning';
			case 'failed':
			case 'cancelled': return 'status-dot-error';
			default: return 'status-dot-pending';
		}
	}

	function getStatusLabel(status: string): string {
		switch (status) {
			case 'needs_followup': return 'Needs Follow-up';
			default: return status;
		}
	}

	// Check if form should be disabled
	const isFormDisabled = $derived(isSubmitting || currentJob?.status === 'running');

	// Start monitoring and timer if there's an active job
	$effect(() => {
		if (currentJob && (currentJob.status === 'running' || currentJob.status === 'pending')) {
			startMonitoring();
			startTimer();
		} else {
			stopTimer();
		}
		return () => {
			stopMonitoring();
			stopTimer();
		};
	});

	// Toggle expanded state for domain details
	function toggleExpanded(domain: string) {
		const newSet = new Set(expandedDomains);
		if (newSet.has(domain)) {
			newSet.delete(domain);
		} else {
			newSet.add(domain);
		}
		expandedDomains = newSet;
	}

	// DeepSeek v3.2 pricing via OpenRouter per million tokens [input, output]
	const MODEL_PRICING: [number, number] = [0.28, 0.42];

	// Estimate cost based on token usage
	function estimateCost(usage: TokenUsage): string {
		const [inputRate, outputRate] = MODEL_PRICING;
		const inputCost = (usage.input_tokens / 1_000_000) * inputRate;
		const outputCost = (usage.output_tokens / 1_000_000) * outputRate;
		const total = inputCost + outputCost;
		return `$${total.toFixed(3)}`;
	}

	// Format expiration date
	function formatExpiration(dateStr?: string): string {
		if (!dateStr) return '';
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		} catch {
			return dateStr;
		}
	}
</script>

<svelte:head>
	<title>Searcher - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-serif text-bark dark:text-neutral-100">Domain Searcher</h1>
		<p class="text-foreground-muted font-sans mt-1">AI-powered domain discovery with live pricing</p>
	</div>

	<div class="grid lg:grid-cols-2 gap-8">
		<!-- Search Form -->
		<GlassCard class="p-4 sm:p-6">
			<div class="flex items-center justify-between mb-4 sm:mb-6">
				<h2 class="font-serif text-base sm:text-lg text-bark dark:text-neutral-100">New Search</h2>
				{#if currentJob && !['running', 'pending'].includes(currentJob.status)}
					<button
						type="button"
						onclick={startNewSearch}
						class="text-sm font-sans text-domain-600 hover:text-domain-700"
					>
						Clear & Start New
					</button>
				{/if}
			</div>

			<!-- Search Mode Tabs -->
			<div class="flex gap-1 p-1 bg-bark/5 rounded-lg mb-6">
				<button
					type="button"
					onclick={() => searchMode = 'vibe'}
					class="flex-1 px-4 py-2 text-sm font-sans font-medium rounded-md transition-all {searchMode === 'vibe' ? 'bg-white dark:bg-neutral-800 text-bark dark:text-neutral-100 shadow-sm' : 'text-foreground-muted hover:text-foreground'}"
					disabled={isFormDisabled}
				>
					Vibe Mode
				</button>
				<button
					type="button"
					onclick={() => searchMode = 'detailed'}
					class="flex-1 px-4 py-2 text-sm font-sans font-medium rounded-md transition-all {searchMode === 'detailed' ? 'bg-white dark:bg-neutral-800 text-bark dark:text-neutral-100 shadow-sm' : 'text-foreground-muted hover:text-foreground'}"
					disabled={isFormDisabled}
				>
					Detailed
				</button>
			</div>

			{#if errorMessage}
				<div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					<p class="text-sm font-sans">{errorMessage}</p>
				</div>
			{/if}

			<!-- Vibe Mode -->
			{#if searchMode === 'vibe'}
				<div class="space-y-4">
					{#if !parsedVibe}
						<!-- Vibe Input Form -->
						<div>
							<label for="vibe_text" class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
								Describe your business or project
							</label>
							<textarea
								id="vibe_text"
								bind:value={vibeText}
								placeholder="Tell us about your business in a few sentences... What's it called? What does it do? What vibe are you going for?"
								class="input-field min-h-[120px] resize-y"
								disabled={isParsingVibe || isFormDisabled}
							></textarea>

							<!-- Word count indicator -->
							<div class="flex items-center justify-between mt-2">
								<span class="text-xs font-sans {vibeWordCount >= 5 ? 'text-grove-600' : 'text-foreground-subtle'}">
									{vibeWordCount} word{vibeWordCount === 1 ? '' : 's'}
									{#if vibeWordCount < 5}
										<span class="text-foreground-faint">· need {5 - vibeWordCount} more</span>
									{:else}
										<span class="text-grove-500">· ready!</span>
									{/if}
								</span>
								{#if vibeText.length > 0}
									<button
										type="button"
										onclick={() => { vibeText = ''; vibeError = ''; }}
										class="text-xs text-foreground-faint hover:text-foreground-muted font-sans"
										disabled={isParsingVibe}
									>
										Clear
									</button>
								{/if}
							</div>
						</div>

						<!-- Error message -->
						{#if vibeError}
							<div class="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
								<p class="text-sm font-sans">{vibeError}</p>
							</div>
						{/if}

						<!-- Example prompts -->
						<div class="pt-2">
							<p class="text-xs font-sans text-foreground-subtle mb-2">Try an example:</p>
							<div class="flex flex-col gap-2">
								{#each vibeExamples as example}
									<button
										type="button"
										onclick={() => useExample(example)}
										class="text-left px-3 py-2 text-sm font-sans text-foreground-muted bg-bark/5 hover:bg-bark/10 dark:hover:bg-white/10 rounded-lg transition-colors line-clamp-2"
										disabled={isParsingVibe || isFormDisabled}
									>
										"{example}"
									</button>
								{/each}
							</div>
						</div>

						<!-- Submit button -->
						<button
							type="button"
							onclick={submitVibe}
							class="btn-primary w-full flex items-center justify-center gap-2"
							disabled={isParsingVibe || vibeWordCount < 5 || isFormDisabled}
						>
							{#if isParsingVibe}
								<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								Understanding your vibe...
							{:else}
								Find Domains
							{/if}
						</button>
					{:else}
						<!-- Parsed Results - Editable -->
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<h3 class="text-sm font-sans font-medium text-bark dark:text-neutral-100">Here's what we understood:</h3>
								<button
									type="button"
									onclick={clearVibeResults}
									class="text-xs text-foreground-subtle hover:text-foreground-muted font-sans"
								>
									Start over
								</button>
							</div>

							<div class="bg-grove-50 border border-grove-200 rounded-lg p-4 space-y-3">
								<!-- Business Name -->
								<div>
									<label for="business_name_parsed" class="block text-xs font-sans text-foreground-muted mb-1">Business Name</label>
									<input
										id="business_name_parsed"
										type="text"
										bind:value={parsedVibe.business_name}
										class="input-field text-sm"
										disabled={isSubmitting}
									/>
								</div>

								<!-- Vibe -->
								<div>
									<label for="vibe_parsed" class="block text-xs font-sans text-foreground-muted mb-1">Vibe</label>
									<select
										id="vibe_parsed"
										bind:value={parsedVibe.vibe}
										class="input-field text-sm"
										disabled={isSubmitting}
									>
										{#each vibeOptions as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
								</div>

								<!-- Keywords -->
								<div>
									<label for="keywords_parsed" class="block text-xs font-sans text-foreground-muted mb-1">Keywords</label>
									<input
										id="keywords_parsed"
										type="text"
										bind:value={parsedVibe.keywords}
										placeholder="comma, separated, keywords"
										class="input-field text-sm"
										disabled={isSubmitting}
									/>
								</div>

								<!-- Domain Idea -->
								<div>
									<label for="domain_idea_parsed" class="block text-xs font-sans text-foreground-muted mb-1">Domain Idea (optional)</label>
									<input
										id="domain_idea_parsed"
										type="text"
										value={parsedVibe.domain_idea || ''}
										oninput={(e) => { if (parsedVibe) parsedVibe.domain_idea = e.currentTarget.value || null; }}
										placeholder="e.g., mybusiness.com"
										class="input-field text-sm"
										disabled={isSubmitting}
									/>
								</div>

								<!-- TLD Preferences -->
								<div>
									<label class="block text-xs font-sans text-foreground-muted mb-1">TLD Preferences</label>
									<div class="flex flex-wrap gap-1.5">
										{#each ['com', 'co', 'io', 'dev', 'app', 'net', 'org', 'ai', 'studio', 'design', 'place'] as tld}
											<button
												type="button"
												onclick={() => {
													if (!parsedVibe) return;
													if (parsedVibe.tld_preferences.includes(tld)) {
														parsedVibe.tld_preferences = parsedVibe.tld_preferences.filter(t => t !== tld);
													} else {
														parsedVibe.tld_preferences = [...parsedVibe.tld_preferences, tld];
													}
												}}
												class="px-2 py-1 rounded-full text-xs font-sans transition-colors {parsedVibe.tld_preferences.includes(tld) ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-white/10'}"
												disabled={isSubmitting}
											>
												.{tld}
											</button>
										{/each}
									</div>
								</div>
							</div>

							<!-- AI Provider Info (locked) -->
							<div class="bg-grove-50 border border-grove-200 rounded-lg p-3">
								<div class="text-xs font-sans text-foreground-muted mb-1">AI Model</div>
								<div class="text-sm font-sans text-bark dark:text-neutral-100 font-medium">{aiProviderInfo.model} via {aiProviderInfo.provider}</div>
								<div class="text-xs font-sans text-foreground-subtle mt-1">{aiProviderInfo.description}</div>
							</div>

							<!-- Start Search button -->
							<button
								type="button"
								onclick={startSearchFromVibe}
								class="btn-primary w-full flex items-center justify-center gap-2"
								disabled={isSubmitting || !parsedVibe.business_name.trim()}
							>
								{#if isSubmitting}
									<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Starting Search...
								{:else}
									Start Domain Search
								{/if}
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Detailed Mode (original form) -->
				<form onsubmit={(e) => { e.preventDefault(); startSearch(); }} class="space-y-6">
				<!-- Business Name -->
				<div>
					<label for="business_name" class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						Business / Project Name *
					</label>
					<input
						id="business_name"
						type="text"
						bind:value={businessName}
						placeholder="e.g., Sunrise Bakery"
						class="input-field"
						required
						disabled={isFormDisabled}
					/>
				</div>

				<!-- Domain Idea -->
				<div>
					<label for="domain_idea" class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						Domain Idea (optional)
					</label>
					<input
						id="domain_idea"
						type="text"
						bind:value={domainIdea}
						placeholder="e.g., sunrisebakery.com"
						class="input-field"
						disabled={isFormDisabled}
					/>
					<p class="mt-1 text-xs text-foreground-subtle font-sans">If you have a specific domain in mind, we'll check it and find similar alternatives</p>
				</div>

				<!-- Vibe -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						Brand Vibe
					</label>
					<select
						bind:value={vibe}
						class="input-field"
						disabled={isFormDisabled}
					>
						{#each vibeOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>

				<!-- TLD Preferences - Grouped -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						Preferred TLDs
					</label>
					<div class="space-y-2 border border-grove-200 rounded-lg overflow-hidden">
						{#each tldGroups as group}
							{@const isExpanded = expandedGroups.has(group.id)}
							{@const selectedCount = getSelectedCountInGroup(group.id)}
							<div class="border-b border-grove-100 last:border-b-0">
								<!-- Group Header -->
								<button
									type="button"
									onclick={() => toggleGroup(group.id)}
									disabled={isFormDisabled}
									class="w-full px-3 py-2 flex items-center justify-between bg-grove-50 hover:bg-grove-100 transition-colors disabled:opacity-50"
								>
									<div class="flex items-center gap-2">
										<svg
											class="w-4 h-4 text-foreground-subtle transition-transform {isExpanded ? 'rotate-90' : ''}"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
										</svg>
										<span class="font-sans font-medium text-bark dark:text-neutral-100 text-sm">{group.label}</span>
										<span class="text-xs text-foreground-subtle font-sans">{group.description}</span>
									</div>
									{#if selectedCount > 0}
										<span class="px-2 py-0.5 text-xs font-sans bg-domain-100 text-domain-700 rounded-full">
											{selectedCount} selected
										</span>
									{/if}
								</button>

								<!-- Group Content -->
								{#if isExpanded}
									<div class="px-3 py-2 bg-white">
										<div class="flex items-center justify-between mb-2">
											<div class="flex gap-2">
												<button
													type="button"
													onclick={() => selectAllInGroup(group.id)}
													disabled={isFormDisabled}
													class="text-xs text-domain-600 hover:text-domain-700 font-sans disabled:opacity-50"
												>
													Select all
												</button>
												<span class="text-foreground-faint">|</span>
												<button
													type="button"
													onclick={() => deselectAllInGroup(group.id)}
													disabled={isFormDisabled}
													class="text-xs text-foreground-subtle hover:text-foreground-muted font-sans disabled:opacity-50"
												>
													Clear
												</button>
											</div>
										</div>
										<div class="flex flex-wrap gap-1.5">
											{#each group.tlds as tld}
												<button
													type="button"
													onclick={() => toggleTld(tld.value)}
													class="px-2.5 py-1 rounded-full text-xs font-sans transition-colors {tldPreferences.includes(tld.value) ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-white/10'}"
													disabled={isFormDisabled}
												>
													{tld.label}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- Diverse TLDs Toggle -->
					<div class="flex items-center justify-between mt-3 pt-3 border-t border-grove-100">
						<div>
							<span class="text-sm font-sans font-medium text-bark dark:text-neutral-100">Diverse TLDs</span>
							<p class="text-xs text-foreground-subtle font-sans">Encourage variety in TLD suggestions</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={diverseTlds}
							aria-label="Toggle diverse TLDs"
							onclick={() => diverseTlds = !diverseTlds}
							disabled={isFormDisabled}
							class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 {diverseTlds ? 'bg-domain-600' : 'bg-bark/20'}"
						>
							<span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {diverseTlds ? 'translate-x-6' : 'translate-x-1'}" />
						</button>
					</div>
				</div>

				<!-- Keywords -->
				<div>
					<label for="keywords" class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						Keywords (optional)
					</label>
					<input
						id="keywords"
						type="text"
						bind:value={keywords}
						placeholder="e.g., artisan, local, organic"
						class="input-field"
						disabled={isFormDisabled}
					/>
				</div>

				<!-- AI Provider Info (locked) -->
				<div>
					<label class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
						AI Model
					</label>
					<div class="card p-4 bg-grove-50">
						<div class="text-base font-sans text-bark dark:text-neutral-100 font-medium">{aiProviderInfo.model} via {aiProviderInfo.provider}</div>
						<p class="mt-1 text-sm text-foreground-muted font-sans">
							{aiProviderInfo.description}
						</p>
					</div>
				</div>

				<!-- Submit -->
				<button
					type="submit"
					class="btn-primary w-full flex items-center justify-center gap-2"
					disabled={isSubmitting || !businessName.trim() || currentJob?.status === 'running'}
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
			{/if}
		</GlassCard>

		<!-- Current Job Status -->
		<div class="space-y-6">
			{#if currentJob}
				<!-- Status Card -->
				<GlassCard class="p-4 sm:p-6">
					<div class="flex items-center justify-between mb-3 sm:mb-4">
						<h2 class="font-serif text-base sm:text-lg text-bark dark:text-neutral-100">Search Status</h2>
						<div class="flex items-center gap-2">
							<div class="status-dot {getStatusDot(currentJob.status)}"></div>
							<span class="text-sm font-sans capitalize {getStatusColor(currentJob.status)}">
								{getStatusLabel(currentJob.status)}
							</span>
						</div>
					</div>

					<div class="space-y-3">
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">Business</span>
							<span class="text-bark dark:text-neutral-100 font-medium">{currentJob.business_name}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">Batch</span>
							<span class="text-bark dark:text-neutral-100">{currentJob.batch_num} / 6</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">Domains Checked</span>
							<span class="text-bark dark:text-neutral-100">{currentJob.domains_checked}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">Available Found</span>
							<span class="text-domain-600 font-medium">{currentJob.domains_available ?? 0}</span>
						</div>
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">Good Results</span>
							<span class="text-grove-600 font-medium">{currentJob.good_results}</span>
						</div>
						<!-- Live elapsed time for running jobs, final duration for completed -->
						<div class="flex justify-between text-sm font-sans">
							<span class="text-foreground-muted">
								{currentJob.status === 'running' || currentJob.status === 'pending' ? 'Elapsed' : 'Duration'}
							</span>
							{#if currentJob.status === 'running' || currentJob.status === 'pending'}
								<span class="text-domain-600 font-medium font-mono tabular-nums">
									{formatElapsed(elapsedSeconds)}
								</span>
							{:else if currentJob.duration_seconds}
								<span class="text-bark dark:text-neutral-100 font-mono tabular-nums">{formatDuration(currentJob.duration_seconds)}</span>
							{:else}
								<span class="text-foreground-faint">-</span>
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

						<!-- Cancel button -->
						<button
							type="button"
							onclick={cancelSearch}
							disabled={isCancelling}
							class="mt-4 w-full px-4 py-2 text-sm font-sans font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
						>
							{isCancelling ? 'Cancelling...' : 'Cancel Search'}
						</button>
					{/if}

					<!-- Error/cancelled message -->
					{#if (currentJob.status === 'failed' || currentJob.status === 'cancelled') && currentJob.error}
						<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<p class="text-sm text-red-700 font-sans">{currentJob.error}</p>
						</div>
					{/if}
				</GlassCard>

				<!-- Follow-up Quiz -->
				{#if currentJob.status === 'needs_followup' && followupQuiz}
					<GlassCard variant="accent" class="p-4 sm:p-6">
						<h2 class="font-serif text-base sm:text-lg text-bark dark:text-neutral-100 mb-2">Refine Your Search</h2>
						<p class="text-sm text-foreground-muted font-sans mb-4">
							We found {followupQuiz.context.good_found} good domains out of {followupQuiz.context.target} target.
							Answer these questions to help us find more.
						</p>

						<div class="space-y-4">
							{#each followupQuiz.questions as question}
								<div>
									<label class="block text-sm font-sans font-medium text-bark dark:text-neutral-100 mb-2">
										{question.prompt}
										{#if question.required}<span class="text-red-500">*</span>{/if}
									</label>

									{#if question.type === 'text'}
										<input
											type="text"
											class="input-field"
											placeholder={question.placeholder}
											bind:value={followupAnswers[question.id]}
										/>
									{:else if question.type === 'single_select' && question.options}
										<select
											class="input-field"
											bind:value={followupAnswers[question.id]}
										>
											<option value="">Select...</option>
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
													class="px-3 py-1.5 rounded-full text-sm font-sans transition-colors {selected ? 'bg-domain-100 text-domain-700 border border-domain-300' : 'bg-bark/5 text-foreground-muted border border-transparent hover:bg-bark/10 dark:hover:bg-white/10'}"
												>
													{opt.label}
												</button>
											{/each}
										</div>
									{/if}
								</div>
							{/each}

							<button
								type="button"
								onclick={submitFollowup}
								disabled={isSubmittingFollowup}
								class="btn-primary w-full flex items-center justify-center gap-2"
							>
								{#if isSubmittingFollowup}
									<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Resuming...
								{:else}
									Continue Search
								{/if}
							</button>
						</div>
					</GlassCard>
				{/if}

				<!-- Pricing Summary -->
				{#if pricingSummary && (currentJob.status === 'complete' || currentJob.status === 'needs_followup')}
					<GlassCard class="p-4 sm:p-6">
						<h2 class="font-serif text-base sm:text-lg text-bark dark:text-neutral-100 mb-3 sm:mb-4">Pricing Summary</h2>
						<div class="grid grid-cols-2 gap-2 sm:gap-4">
							<div class="text-center p-2 sm:p-3 bg-grove-50 rounded-lg">
								<div class="text-xl sm:text-2xl font-mono font-bold text-grove-600">{pricingSummary.bundled}</div>
								<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">Bundled (&le;$30/yr)</div>
							</div>
							<div class="text-center p-2 sm:p-3 bg-domain-50 rounded-lg">
								<div class="text-xl sm:text-2xl font-mono font-bold text-domain-600">{pricingSummary.recommended}</div>
								<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">Recommended (&le;$50/yr)</div>
							</div>
							<div class="text-center p-2 sm:p-3 bg-bark/5 rounded-lg">
								<div class="text-xl sm:text-2xl font-mono font-bold text-foreground-muted">{pricingSummary.standard}</div>
								<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">Standard</div>
							</div>
							<div class="text-center p-2 sm:p-3 bg-amber-50 rounded-lg">
								<div class="text-xl sm:text-2xl font-mono font-bold text-amber-600">{pricingSummary.premium}</div>
								<div class="text-[10px] sm:text-xs text-foreground-muted font-sans">Premium (&gt;$50/yr)</div>
							</div>
						</div>

						{#if tokenUsage}
							<div class="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-grove-200 space-y-1.5 sm:space-y-2">
								<div class="flex justify-between text-[10px] sm:text-xs font-sans text-foreground-subtle">
									<span>API Usage</span>
									<span class="font-mono">{tokenUsage.total_tokens.toLocaleString()} tokens</span>
								</div>
								<div class="grid grid-cols-2 gap-2 text-[10px] sm:text-xs font-sans">
									<div class="flex justify-between text-foreground-faint">
										<span>Input</span>
										<span class="font-mono">{tokenUsage.input_tokens.toLocaleString()}</span>
									</div>
									<div class="flex justify-between text-foreground-faint">
										<span>Output</span>
										<span class="font-mono">{tokenUsage.output_tokens.toLocaleString()}</span>
									</div>
								</div>
								<div class="flex justify-between text-[10px] sm:text-xs font-sans pt-1 border-t border-grove-100">
									<span class="text-foreground-subtle">Est. Cost (DeepSeek v3.2)</span>
									<span class="font-mono text-domain-600 font-medium">{estimateCost(tokenUsage)}</span>
								</div>
							</div>
						{/if}
					</GlassCard>
				{/if}

				<!-- Results -->
				{#if jobResults.length > 0}
					<GlassCard>
						<div class="px-3 py-3 sm:p-4 border-b border-grove-200 flex justify-between items-center">
							<h2 class="font-serif text-base sm:text-lg text-bark dark:text-neutral-100">Available Domains</h2>
							<span class="text-xs sm:text-sm text-foreground-muted font-sans">
								{#if isLoadingResults}
									Loading...
								{:else}
									{jobResults.filter(r => r.status === 'available').length} available
								{/if}
							</span>
						</div>
						<div class="max-h-[600px] overflow-y-auto divide-y divide-grove-100">
							{#each jobResults.filter(r => r.status === 'available').sort((a, b) => b.score - a.score) as result}
								{@const isExpanded = expandedDomains.has(result.domain)}
								{@const evalData = result.evaluation_data}
								<div class="hover:bg-grove-50 transition-colors">
									<!-- Main row - clickable to expand -->
									<button
										type="button"
										onclick={() => toggleExpanded(result.domain)}
										class="w-full px-3 py-3 sm:p-4 text-left flex items-start sm:items-center justify-between gap-2"
									>
										<div class="flex-1 min-w-0">
											<div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
												<span class="font-mono text-bark dark:text-neutral-100 font-medium text-sm sm:text-base break-all">{result.domain}</span>
												{#if result.pricing_category || evalData?.pricing_category}
													{@const category = result.pricing_category || evalData?.pricing_category}
													<span class="flex-shrink-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-sans rounded-full
														{category === 'bundled' ? 'bg-grove-100 text-grove-700' :
														 category === 'recommended' ? 'bg-domain-100 text-domain-700' :
														 category === 'premium' ? 'bg-amber-100 text-amber-700' :
														 'bg-bark/10 dark:bg-white/10 text-foreground-muted'}">
														{category}
													</span>
												{/if}
											</div>
											<div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
												<span class="text-[11px] sm:text-xs font-sans text-foreground-subtle">Score: {(result.score * 100).toFixed(0)}%</span>
												<!-- Evaluation indicators -->
												{#if evalData}
													<div class="flex items-center gap-1">
														{#if evalData.pronounceable}
															<span class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-grove-100 text-grove-600" title="Easy to pronounce">
																<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"/><path d="M10 5a1 1 0 011 1v4a1 1 0 01-2 0V6a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z"/></svg>
															</span>
														{/if}
														{#if evalData.memorable}
															<span class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-domain-100 text-domain-600" title="Memorable">
																<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
															</span>
														{/if}
														{#if evalData.brand_fit}
															<span class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-600" title="Good brand fit">
																<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
															</span>
														{/if}
														{#if evalData.email_friendly}
															<span class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600" title="Email-friendly">
																<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
															</span>
														{/if}
													</div>
												{/if}
											</div>
										</div>
										<div class="text-right flex-shrink-0 ml-3 sm:ml-4 flex items-center gap-2 sm:gap-3">
											<span class="{getPriceClass(result.pricing_category || evalData?.pricing_category)} font-sans font-medium text-sm sm:text-base whitespace-nowrap">
												{result.price_display || formatPrice(result.price_cents)}/yr
											</span>
											<svg class="w-5 h-5 text-foreground-faint transition-transform flex-shrink-0 {isExpanded ? 'rotate-180' : ''}" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
											</svg>
										</div>
									</button>

									<!-- Expanded details -->
									{#if isExpanded && evalData}
										<div class="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-grove-100 bg-grove-50/50">
											<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
												<!-- Evaluation scores -->
												<div class="space-y-2">
													<h4 class="text-xs font-sans font-medium text-foreground-muted uppercase tracking-wide">Evaluation</h4>
													<div class="space-y-1.5">
														<div class="flex items-center justify-between text-sm font-sans">
															<span class="text-foreground-muted">Pronounceable</span>
															<span class="{evalData.pronounceable ? 'text-grove-600' : 'text-foreground-faint'}">{evalData.pronounceable ? 'Yes' : 'No'}</span>
														</div>
														<div class="flex items-center justify-between text-sm font-sans">
															<span class="text-foreground-muted">Memorable</span>
															<span class="{evalData.memorable ? 'text-grove-600' : 'text-foreground-faint'}">{evalData.memorable ? 'Yes' : 'No'}</span>
														</div>
														<div class="flex items-center justify-between text-sm font-sans">
															<span class="text-foreground-muted">Brand Fit</span>
															<span class="{evalData.brand_fit ? 'text-grove-600' : 'text-foreground-faint'}">{evalData.brand_fit ? 'Yes' : 'No'}</span>
														</div>
														<div class="flex items-center justify-between text-sm font-sans">
															<span class="text-foreground-muted">Email Friendly</span>
															<span class="{evalData.email_friendly ? 'text-grove-600' : 'text-foreground-faint'}">{evalData.email_friendly ? 'Yes' : 'No'}</span>
														</div>
													</div>
												</div>

												<!-- Pricing & RDAP info -->
												<div class="space-y-2">
													<h4 class="text-xs font-sans font-medium text-foreground-muted uppercase tracking-wide">Details</h4>
													<div class="space-y-1.5">
														{#if evalData.renewal_cents}
															<div class="flex items-center justify-between text-sm font-sans">
																<span class="text-foreground-muted">Renewal</span>
																<span class="text-bark dark:text-neutral-100">{formatPrice(evalData.renewal_cents)}/yr</span>
															</div>
														{/if}
														{#if evalData.rdap_registrar}
															<div class="flex items-center justify-between text-sm font-sans">
																<span class="text-foreground-muted">Registrar</span>
																<span class="text-bark dark:text-neutral-100 truncate max-w-[150px]" title={evalData.rdap_registrar}>{evalData.rdap_registrar}</span>
															</div>
														{/if}
														{#if evalData.rdap_expiration}
															<div class="flex items-center justify-between text-sm font-sans">
																<span class="text-foreground-muted">Expires</span>
																<span class="text-bark dark:text-neutral-100">{formatExpiration(evalData.rdap_expiration)}</span>
															</div>
														{/if}
													</div>
												</div>
											</div>

											<!-- AI Notes -->
											{#if evalData.notes}
												<div class="mt-3 pt-3 border-t border-grove-200">
													<p class="text-sm text-foreground-muted font-sans italic">&ldquo;{evalData.notes}&rdquo;</p>
												</div>
											{/if}

											<!-- Flags -->
											{#if result.flags && result.flags.length > 0}
												<div class="mt-3 flex flex-wrap gap-1">
													{#each result.flags as flag}
														<span class="px-2 py-0.5 text-xs font-sans bg-bark/10 dark:bg-white/10 text-foreground-muted rounded">{flag}</span>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</GlassCard>
				{:else if currentJob.status === 'complete' && !isLoadingResults}
					<GlassCard variant="muted" class="p-8 text-center">
						<p class="text-foreground-muted font-sans">No available domains found. Try adjusting your search criteria.</p>
					</GlassCard>
				{/if}
			{:else}
				<GlassCard variant="muted" class="p-8 text-center">
					<svg class="w-16 h-16 mx-auto text-foreground-faint mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
					</svg>
					<p class="text-foreground-muted font-sans">No active search. Fill out the form to start finding domains.</p>
				</GlassCard>
			{/if}
		</div>
	</div>
</div>
