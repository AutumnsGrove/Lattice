<script lang="ts">
	import { onMount } from 'svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { Sparkles, Shield, Loader2, AlertTriangle, RefreshCw } from 'lucide-svelte';
	import { LumenAnalytics, SafetyMonitoring } from '@autumnsgrove/groveengine';

	interface LumenData {
		today: Array<{
			task: string;
			count: number;
			input_tokens: number;
			output_tokens: number;
			total_cost: number;
			avg_latency: number;
		}>;
		week: Array<{
			task: string;
			count: number;
			input_tokens: number;
			output_tokens: number;
			total_cost: number;
			avg_latency: number;
		}>;
		recent: Array<{
			id: number;
			task: string;
			model: string;
			provider: string;
			input_tokens: number;
			output_tokens: number;
			cost: number;
			latency_ms: number;
			cached: number;
			created_at: string;
		}>;
		providers: Array<{
			provider: string;
			count: number;
			total_cost: number;
		}>;
		safety?: {
			thornStats: {
				total: number;
				allowed: number;
				warned: number;
				flagged: number;
				blocked: number;
				passRate: number;
				byCategory: Array<{ category: string; count: number }>;
				byContentType: Array<{ content_type: string; count: number }>;
			};
			petalBlocks: Array<{ category: string; count: number }>;
			thornFlagged: Array<{
				id: string;
				content_type: string;
				content_ref: string | null;
				action: string;
				categories: string | null;
				confidence: number | null;
				created_at: string;
			}>;
			thornRecent: Array<{
				content_type: string;
				content_ref: string | null;
				action: string;
				categories: string | null;
				timestamp: string;
			}>;
			petalFlags: Array<{
				id: string;
				user_id: string;
				flag_type: string;
				created_at: string;
			}>;
		};
	}

	let data = $state<LumenData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let activeTab = $state<'ai' | 'safety'>('ai');

	// Count of pending flagged items for badge display
	let pendingCount = $derived(data?.safety?.thornFlagged?.length ?? 0);

	async function fetchData() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/lumen'); // csrf-ok - GET request
			if (!res.ok) {
				throw new Error('Failed to fetch Lumen analytics');
			}
			data = await res.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	async function handleReview(flagId: string, action: 'cleared' | 'removed', notes?: string) {
		const res = await fetch('/api/admin/lumen/review', { // csrf-ok — Wayfinder-only, explicit server auth
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ flagId, action, notes }),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: 'Review failed' })) as { error?: string };
			throw new Error(body.error || 'Review failed');
		}

		// Re-fetch data to update the view
		await fetchData();
	}

	onMount(() => {
		fetchData();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-serif text-foreground flex items-center gap-2">
				<Sparkles class="w-6 h-6 text-violet-500" />
				Lumen
			</h1>
			<p class="text-foreground-muted mt-1">
				AI gateway & safety monitoring
			</p>
		</div>
		<button
			onclick={fetchData}
			disabled={loading}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-white/50 dark:bg-slate-800/50 border border-grove-200 dark:border-grove-700 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
		>
			<RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
			Refresh
		</button>
	</div>

	<!-- Tab Bar -->
	{#if data?.safety}
		<div class="flex gap-1 p-1 bg-white/30 dark:bg-slate-800/30 rounded-lg border border-grove-200 dark:border-grove-700 w-fit">
			<button
				class="tab-button {activeTab === 'ai' ? 'tab-active' : ''}"
				onclick={() => activeTab = 'ai'}
			>
				<Sparkles class="w-4 h-4" />
				AI Analytics
			</button>
			<button
				class="tab-button {activeTab === 'safety' ? 'tab-active' : ''}"
				onclick={() => activeTab = 'safety'}
			>
				<Shield class="w-4 h-4" />
				Safety Monitoring
				{#if pendingCount > 0}
					<span class="tab-badge">{pendingCount}</span>
				{/if}
			</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if loading && !data}
		<GlassCard variant="default" class="p-12">
			<div class="flex flex-col items-center justify-center text-foreground-subtle">
				<Loader2 class="w-8 h-8 animate-spin mb-4" />
				<p>Loading analytics...</p>
			</div>
		</GlassCard>
	{/if}

	<!-- Error State -->
	{#if error && !data}
		<GlassCard variant="default" class="p-8">
			<div class="flex flex-col items-center justify-center text-red-600 dark:text-red-400">
				<AlertTriangle class="w-8 h-8 mb-4" />
				<p class="font-medium">{error}</p>
				<button
					onclick={fetchData}
					class="mt-4 text-sm underline hover:no-underline"
				>
					Try again
				</button>
			</div>
		</GlassCard>
	{/if}

	<!-- Tab Content -->
	{#if data}
		{#if activeTab === 'ai'}
			<LumenAnalytics
				today={data.today}
				week={data.week}
				recent={data.recent}
				providers={data.providers}
			/>
		{:else if activeTab === 'safety' && data.safety}
			<SafetyMonitoring
				thornStats={data.safety.thornStats}
				petalBlocks={data.safety.petalBlocks}
				thornFlagged={data.safety.thornFlagged}
				thornRecent={data.safety.thornRecent}
				petalFlags={data.safety.petalFlags}
				onReview={handleReview}
			/>
		{/if}
	{/if}
</div>

<style>
	.tab-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text-muted, #6b7280);
		border-radius: 0.375rem;
		border: none;
		background: transparent;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab-button:hover {
		color: var(--color-text, #1f2937);
		background: rgba(255, 255, 255, 0.4);
	}

	:global(.dark) .tab-button:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.tab-active {
		color: var(--color-text, #1f2937);
		background: rgba(255, 255, 255, 0.6);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .tab-active {
		color: var(--grove-200, #bbf7d0);
		background: rgba(255, 255, 255, 0.1);
	}

	.tab-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		font-size: 0.7rem;
		font-weight: 600;
		border-radius: 9999px;
		background: rgba(249, 115, 22, 0.2);
		color: rgb(249, 115, 22);
	}
</style>
