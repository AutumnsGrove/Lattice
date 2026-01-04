<script lang="ts">
	import type { PageData } from './$types';
	import { SEARCH_DEFAULTS } from '$lib/config';
	import { untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Form state initialized from config - using untrack to capture initial values
	let maxBatches = $state(untrack(() => data.config?.max_batches || SEARCH_DEFAULTS.MAX_BATCHES));
	let candidatesPerBatch = $state(untrack(() => data.config?.candidates_per_batch || SEARCH_DEFAULTS.CANDIDATES_PER_BATCH));
	let targetGoodResults = $state(untrack(() => data.config?.target_good_results || SEARCH_DEFAULTS.TARGET_GOOD_RESULTS));
	let creativity = $state(untrack(() => data.config?.creativity || SEARCH_DEFAULTS.CREATIVITY));
	let rdapDelaySeconds = $state(untrack(() => data.config?.rdap_delay_seconds || SEARCH_DEFAULTS.RDAP_DELAY_SECONDS));

	// UI state
	let isSaving = $state(false);
	let successMessage = $state('');
	let errorMessage = $state('');

	async function saveConfig() {
		isSaving = true;
		successMessage = '';
		errorMessage = '';

		try {
			const response = await fetch('/api/config', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					max_batches: maxBatches,
					candidates_per_batch: candidatesPerBatch,
					target_good_results: targetGoodResults,
					creativity,
					rdap_delay_seconds: rdapDelaySeconds
				})
			});

			const result = (await response.json()) as { success?: boolean; error?: string };

			if (response.ok && result.success) {
				successMessage = 'Configuration saved successfully';
			} else {
				throw new Error(result.error || 'Failed to save configuration');
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
		} finally {
			isSaving = false;
		}
	}

	function resetToDefaults() {
		maxBatches = SEARCH_DEFAULTS.MAX_BATCHES;
		candidatesPerBatch = SEARCH_DEFAULTS.CANDIDATES_PER_BATCH;
		targetGoodResults = SEARCH_DEFAULTS.TARGET_GOOD_RESULTS;
		creativity = SEARCH_DEFAULTS.CREATIVITY;
		rdapDelaySeconds = SEARCH_DEFAULTS.RDAP_DELAY_SECONDS;
	}
</script>

<svelte:head>
	<title>Configuration - Domain Finder</title>
</svelte:head>

<div class="space-y-8">
	<!-- Page Header -->
	<div>
		<h1 class="text-2xl font-serif text-bark">Configuration</h1>
		<p class="text-bark/60 font-sans mt-1">Configure the domain search agent settings</p>
	</div>

	<!-- Messages -->
	{#if successMessage}
		<div class="bg-grove-50 border border-grove-200 text-grove-700 px-4 py-3 rounded-lg">
			<p class="text-sm font-sans">{successMessage}</p>
		</div>
	{/if}

	{#if errorMessage}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
			<p class="text-sm font-sans">{errorMessage}</p>
		</div>
	{/if}

	<form onsubmit={(e) => { e.preventDefault(); saveConfig(); }} class="space-y-8">
		<!-- Search Parameters Section -->
		<div class="glass-form-section">
			<h2 class="font-serif text-lg text-bark mb-6">Search Parameters</h2>

			<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Max Batches -->
				<div>
					<label for="max_batches" class="block text-sm font-sans font-medium text-bark mb-2">
						Max Batches
					</label>
					<input
						id="max_batches"
						type="number"
						bind:value={maxBatches}
						min="1"
						max="10"
						class="input-field"
						disabled={isSaving}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">
						Maximum number of search batches (1-10)
					</p>
				</div>

				<!-- Candidates Per Batch -->
				<div>
					<label for="candidates_per_batch" class="block text-sm font-sans font-medium text-bark mb-2">
						Candidates Per Batch
					</label>
					<input
						id="candidates_per_batch"
						type="number"
						bind:value={candidatesPerBatch}
						min="10"
						max="100"
						class="input-field"
						disabled={isSaving}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">
						Domains generated per batch (10-100)
					</p>
				</div>

				<!-- Target Good Results -->
				<div>
					<label for="target_good_results" class="block text-sm font-sans font-medium text-bark mb-2">
						Target Good Results
					</label>
					<input
						id="target_good_results"
						type="number"
						bind:value={targetGoodResults}
						min="5"
						max="100"
						class="input-field"
						disabled={isSaving}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">
						Stop when this many good domains are found
					</p>
				</div>
			</div>
		</div>

		<!-- Creativity & Rate Limiting -->
		<div class="glass-form-section">
			<h2 class="font-serif text-lg text-bark mb-6">Creativity & Rate Limiting</h2>

			<div class="grid md:grid-cols-2 gap-6">
				<!-- Creativity Slider -->
				<div>
					<label for="creativity" class="block text-sm font-sans font-medium text-bark mb-2">
						Creativity Level: {(creativity * 100).toFixed(0)}%
					</label>
					<input
						id="creativity"
						type="range"
						bind:value={creativity}
						min="0"
						max="1"
						step="0.05"
						class="w-full h-2 bg-grove-200 rounded-lg appearance-none cursor-pointer accent-domain-600"
						disabled={isSaving}
					/>
					<div class="flex justify-between text-xs text-bark/50 font-sans mt-1">
						<span>Conservative</span>
						<span>Experimental</span>
					</div>
					<p class="mt-2 text-xs text-bark/50 font-sans">
						Higher values = more creative/unusual domain suggestions
					</p>
				</div>

				<!-- RDAP Delay -->
				<div>
					<label for="rdap_delay" class="block text-sm font-sans font-medium text-bark mb-2">
						RDAP Check Delay (seconds)
					</label>
					<input
						id="rdap_delay"
						type="number"
						bind:value={rdapDelaySeconds}
						min="0.1"
						max="30"
						step="0.1"
						class="input-field"
						disabled={isSaving}
					/>
					<p class="mt-1 text-xs text-bark/50 font-sans">
						Delay between RDAP availability checks (rate limiting)
					</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							onclick={() => rdapDelaySeconds = 0.2}
							class="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
						>
							Fast (0.2s)
						</button>
						<button
							type="button"
							onclick={() => rdapDelaySeconds = 10}
							class="text-xs px-2 py-1 rounded bg-grove-100 text-grove-700 hover:bg-grove-200 transition-colors"
						>
							Production (10s)
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="flex gap-4 justify-between">
			<button
				type="button"
				onclick={resetToDefaults}
				class="btn-ghost"
				disabled={isSaving}
			>
				Reset to Defaults
			</button>
			<button
				type="submit"
				class="btn-primary"
				disabled={isSaving}
			>
				{isSaving ? 'Saving...' : 'Save Configuration'}
			</button>
		</div>
	</form>

	<!-- Info Box -->
	<div class="glass-card-accent p-6">
		<h3 class="font-serif text-bark mb-2">About Configuration</h3>
		<p class="text-sm text-bark/70 font-sans leading-relaxed">
			These settings control how the domain search agent operates. Changes take effect on the next search.
			For testing, use the "Fast" RDAP delay. In production, keep it at 10 seconds to avoid rate limiting from registries.
		</p>
	</div>
</div>
