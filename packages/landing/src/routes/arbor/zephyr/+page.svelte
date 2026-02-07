<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { Wind, Send, Check, AlertTriangle, ExternalLink, Clock } from 'lucide-svelte';

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

	// Format relative time
	function timeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	function statusBadge(status: string): { text: string; class: string } {
		switch (status) {
			case 'delivered':
				return { text: 'Delivered', class: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
			case 'partial':
				return { text: 'Partial', class: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' };
			case 'failed':
				return { text: 'Failed', class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
			default:
				return { text: status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
		}
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-serif text-foreground">Zephyr Social</h1>
			<p class="text-foreground-muted font-sans mt-1">
				Scatter content on the wind
			</p>
		</div>
		<div class="flex items-center gap-2 text-foreground-subtle text-sm">
			<Wind class="w-4 h-4" />
			<span>
				{data.broadcasts?.length || 0} recent post{data.broadcasts?.length !== 1 ? 's' : ''}
			</span>
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

	<!-- Compose Card -->
	<GlassCard variant="frosted">
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

	<!-- Recent Broadcasts -->
	{#if data.broadcasts && data.broadcasts.length > 0}
		<div>
			<h2 class="text-lg font-serif text-foreground mb-4">Recent Posts</h2>
			<div class="space-y-3">
				{#each data.broadcasts as broadcast}
					{@const badge = statusBadge(broadcast.status)}
					{@const platforms = JSON.parse(broadcast.platforms) as string[]}
					<GlassCard variant="default">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1 min-w-0">
								<p class="text-foreground font-sans text-sm whitespace-pre-wrap break-words">
									{broadcast.content}
								</p>
								<div class="flex items-center gap-3 mt-2 text-xs text-foreground-subtle">
									<span class="inline-flex items-center gap-1">
										<Clock class="w-3 h-3" />
										{timeAgo(broadcast.created_at)}
									</span>
									<span>{platforms.join(', ')}</span>
								</div>
							</div>
							<span class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium {badge.class} shrink-0">
								{badge.text}
							</span>
						</div>
					</GlassCard>
				{/each}
			</div>
		</div>
	{/if}
</div>
