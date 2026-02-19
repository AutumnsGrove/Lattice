<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import { Wind, Send, Check, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-svelte';
	import { ZephyrAnalytics } from '@autumnsgrove/lattice';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Compose state
	let content = $state('');
	let posting = $state(false);

	// Grapheme counter (Bluesky limit: 300)
	const GRAPHEME_LIMIT = 300;

	let graphemeCount = $derived.by(() => {
		if (!content) return 0;
		try {
			const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
			return [...segmenter.segment(content)].length;
		} catch {
			return content.length;
		}
	});

	let isOverLimit = $derived(graphemeCount > GRAPHEME_LIMIT);
	let graphemesRemaining = $derived(GRAPHEME_LIMIT - graphemeCount);

	// Counter color classes
	let counterClass = $derived.by(() => {
		if (isOverLimit) return 'text-red-600 font-semibold';
		if (graphemesRemaining <= 20) return 'text-amber-600';
		return 'text-foreground-subtle';
	});

	// Platform state
	let blueskyEnabled = $state(true);

	// Platform info from server
	let blueskyPlatform = $derived(
		data.platforms?.find((p) => p.id === 'bluesky')
	);
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-serif text-foreground flex items-center gap-2">
				<Wind class="w-6 h-6 text-blue-500" />
				Zephyr Social
			</h1>
			<p class="text-foreground-muted font-sans mt-1">
				Scatter content on the wind — with full observability
			</p>
		</div>
	</div>

	<!-- Success/Error Feedback -->
	{#if form?.success}
		<GlassCard variant="default">
			<div class="flex items-start gap-3">
				<Check class="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
				<div>
					<p class="text-foreground font-medium">{form.message}</p>
					{#if form.postUrl}
						<a
							href={form.postUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-sm text-grove-600 hover:text-grove-700 mt-1"
						>
							View on Bluesky <ExternalLink class="w-3 h-3" />
						</a>
					{/if}
				</div>
			</div>
		</GlassCard>
	{/if}

	{#if form?.error}
		<GlassCard variant="default">
			<div class="flex items-start gap-3">
				<AlertTriangle class="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
				<p class="text-red-700 dark:text-red-400">{form.error}</p>
			</div>
		</GlassCard>
	{/if}

	<!-- Analytics Section -->
	<ZephyrAnalytics broadcasts={data.broadcasts || []} stats={data.stats} />

	<!-- Compose Card -->
	<GlassCard variant="frosted" class="mt-8">
		<h2 class="text-lg font-semibold text-foreground mb-4">Compose Post</h2>
		<form
			method="POST"
			action="?/post"
			use:enhance={() => {
				posting = true;
				return async ({ update }) => {
					await update();
					posting = false;
					if (form?.success) {
						content = '';
					}
				};
			}}
		>
			<div class="space-y-4">
				<!-- Textarea -->
				<div>
					<label for="compose-content" class="sr-only">Post content</label>
					<textarea
						id="compose-content"
						name="content"
						bind:value={content}
						placeholder="What's on your mind? Share it with the wind..."
						rows="4"
						class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-grove-700 bg-white/50 dark:bg-slate-800/50 text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent resize-none font-sans"
						disabled={posting}
					></textarea>

					<!-- Grapheme counter -->
					<div class="flex items-center justify-between mt-1.5">
						<div class="text-xs text-foreground-subtle">
							Bluesky limit: 300 graphemes
						</div>
						<div class="text-sm {counterClass}">
							{graphemeCount}/{GRAPHEME_LIMIT}
						</div>
					</div>
				</div>

				<!-- Platform toggles -->
				<div class="flex flex-wrap gap-3">
					<label
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors
							{blueskyEnabled
								? 'border-grove-500 bg-grove-50 dark:bg-grove-900/20 text-grove-700 dark:text-grove-300'
								: 'border-gray-300 dark:border-gray-600 text-foreground-muted'}"
					>
						<input
							type="checkbox"
							name="platforms"
							value="bluesky"
							bind:checked={blueskyEnabled}
							class="sr-only"
						/>
						<span class="w-2 h-2 rounded-full {blueskyEnabled ? 'bg-grove-500' : 'bg-gray-300'}"></span>
						Bluesky
						{#if blueskyPlatform?.healthy}
							<span class="text-green-500 text-xs">●</span>
						{/if}
					</label>

					<!-- Coming soon platforms -->
					<span
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-foreground-subtle cursor-not-allowed opacity-50"
					>
						<span class="w-2 h-2 rounded-full bg-gray-300"></span>
						Mastodon
						<span class="text-[10px] uppercase tracking-wide">soon</span>
					</span>

					<span
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-foreground-subtle cursor-not-allowed opacity-50"
					>
						<span class="w-2 h-2 rounded-full bg-gray-300"></span>
						DEV.to
						<span class="text-[10px] uppercase tracking-wide">soon</span>
					</span>
				</div>

				<!-- Post button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={posting || !content.trim() || isOverLimit || !blueskyEnabled}
						class="inline-flex items-center gap-2 px-5 py-2.5 bg-grove-600 text-white rounded-lg text-sm font-sans font-medium hover:bg-grove-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if posting}
							<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
							Posting...
						{:else}
							<Send class="w-4 h-4" />
							Post
						{/if}
					</button>
				</div>
			</div>
		</form>
	</GlassCard>
</div>
