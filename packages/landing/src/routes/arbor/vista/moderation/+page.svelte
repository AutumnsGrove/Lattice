<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Shield } from "lucide-svelte";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Moderation — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Moderation</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Petal image moderation and Thorn text moderation
	</p>
</div>

<!-- Petal — Image Moderation -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Petal — Image Moderation</h2>

	{#if !data.petal}
		<GlassCard class="p-6 text-center">
			<Shield class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans text-sm">No Petal data available.</p>
		</GlassCard>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					Block Rate (24h)
				</p>
				<p class="text-xl font-serif text-foreground mt-1">{data.petal.blockRate24h.toFixed(2)}%</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					Total Checks (24h)
				</p>
				<p class="text-xl font-serif text-foreground mt-1">
					{data.petal.totalChecks24h.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">NCMEC Queue</p>
				<p
					class="text-xl font-serif {data.petal.ncmecQueueDepth > 0
						? 'text-amber-600 dark:text-amber-400'
						: 'text-foreground'} mt-1"
				>
					{data.petal.ncmecQueueDepth}
				</p>
			</GlassCard>
		</div>

		{#if data.petal.pendingFlagReviews > 0}
			<GlassCard class="p-4 mb-4 border-amber-200 dark:border-amber-800">
				<p class="text-sm font-sans text-amber-700 dark:text-amber-400">
					{data.petal.pendingFlagReviews} pending account flag review{data.petal
						.pendingFlagReviews !== 1
						? "s"
						: ""}
				</p>
			</GlassCard>
		{/if}

		{#if data.petal.recentBlocks.length > 0}
			<h3 class="text-sm font-sans font-medium text-foreground mb-2">Top Block Categories (24h)</h3>
			<div class="space-y-1">
				{#each data.petal.recentBlocks as block}
					<div
						class="flex items-center justify-between text-sm font-sans px-4 py-2 bg-white dark:bg-cream-100/30 rounded-lg border border-grove-100 dark:border-cream-300/30"
					>
						<span class="text-foreground font-mono text-xs">{block.category}</span>
						<span class="text-foreground-muted">{block.count}</span>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
</section>

<!-- Thorn — Text Moderation -->
<section>
	<h2 class="text-lg font-serif text-foreground mb-4">Thorn — Text Moderation</h2>

	{#if !data.thorn}
		<GlassCard class="p-6 text-center">
			<Shield class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans text-sm">No Thorn data available.</p>
		</GlassCard>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Allowed</p>
				<p class="text-xl font-serif text-grove-700 dark:text-grove-400 mt-1">
					{data.thorn.actionCounts24h.allowed.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Warned</p>
				<p class="text-xl font-serif text-amber-600 dark:text-amber-400 mt-1">
					{data.thorn.actionCounts24h.warned.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Flagged</p>
				<p class="text-xl font-serif text-orange-600 dark:text-orange-400 mt-1">
					{data.thorn.actionCounts24h.flagged.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Blocked</p>
				<p class="text-xl font-serif text-red-600 dark:text-red-400 mt-1">
					{data.thorn.actionCounts24h.blocked.toLocaleString()}
				</p>
			</GlassCard>
		</div>

		{#if data.thorn.flaggedQueueDepth > 0}
			<GlassCard class="p-4 mb-4 border-amber-200 dark:border-amber-800">
				<p class="text-sm font-sans text-amber-700 dark:text-amber-400">
					{data.thorn.flaggedQueueDepth} item{data.thorn.flaggedQueueDepth !== 1 ? "s" : ""} in the flagged
					content queue awaiting review
				</p>
			</GlassCard>
		{/if}
	{/if}
</section>
