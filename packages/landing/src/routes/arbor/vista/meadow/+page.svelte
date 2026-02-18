<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/groveengine/ui";
	import { Flower2 } from "lucide-svelte";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Meadow — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Meadow</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Community feed — note creation, engagement, and reports
	</p>
</div>

{#if !data.meadow || !data.meadow.available}
	<GlassCard class="p-8 text-center">
		<Flower2 class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans">No Meadow data available yet.</p>
		<p class="text-xs font-sans text-foreground-muted mt-2">
			Meadow tables will populate this page once the community feed is active.
		</p>
	</GlassCard>
{:else}
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
				Notes Created (24h)
			</p>
			<p class="text-xl font-serif text-foreground mt-1">
				{data.meadow.postCreationRate24h.toLocaleString()}
			</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Total Notes</p>
			<p class="text-xl font-serif text-foreground mt-1">
				{data.meadow.totalPosts.toLocaleString()}
			</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Report Queue</p>
			<p
				class="text-xl font-serif {data.meadow.reportQueueDepth > 0
					? 'text-amber-600 dark:text-amber-400'
					: 'text-foreground'} mt-1"
			>
				{data.meadow.reportQueueDepth}
			</p>
		</GlassCard>
	</div>

	<section>
		<h2 class="text-lg font-serif text-foreground mb-4">Engagement (24h)</h2>
		<div class="grid grid-cols-2 gap-4">
			<GlassCard class="p-5">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Votes</p>
				<p class="text-xl font-serif text-foreground mt-1">
					{data.meadow.engagement24h.votes.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-5">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Reactions</p>
				<p class="text-xl font-serif text-foreground mt-1">
					{data.meadow.engagement24h.reactions.toLocaleString()}
				</p>
			</GlassCard>
		</div>
	</section>
{/if}
