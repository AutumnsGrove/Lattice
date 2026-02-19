<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Brain } from "lucide-svelte";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>AI Usage — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">AI Usage</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Lumen AI gateway — costs, tokens, and provider breakdown
	</p>
</div>

{#if !data.lumen}
	<GlassCard class="p-8 text-center">
		<Brain class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans">
			No AI usage data yet — metrics appear once Lumen requests are being tracked.
		</p>
	</GlassCard>
{:else}
	<!-- Cost summary -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">24h Cost</p>
			<p class="text-xl font-serif text-foreground mt-1">${data.lumen.cost24h.toFixed(4)}</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">30d Cost</p>
			<p class="text-xl font-serif text-foreground mt-1">${data.lumen.cost30d.toFixed(4)}</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">24h Requests</p>
			<p class="text-xl font-serif text-foreground mt-1">
				{data.lumen.requests24h.toLocaleString()}
			</p>
		</GlassCard>
	</div>

	<!-- Token usage -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide mb-2">
				Tokens (24h)
			</p>
			<div class="flex gap-4">
				<div>
					<p class="text-xs font-sans text-foreground-muted">Input</p>
					<p class="text-sm font-sans font-medium text-foreground mt-0.5">
						{data.lumen.tokens24h.input.toLocaleString()}
					</p>
				</div>
				<div>
					<p class="text-xs font-sans text-foreground-muted">Output</p>
					<p class="text-sm font-sans font-medium text-foreground mt-0.5">
						{data.lumen.tokens24h.output.toLocaleString()}
					</p>
				</div>
			</div>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
				Avg Latency (24h)
			</p>
			<p class="text-xl font-serif text-foreground mt-1">
				{Math.round(data.lumen.avgLatencyMs24h)}ms
			</p>
		</GlassCard>
	</div>

	<!-- By provider -->
	{#if data.lumen.byProvider.length > 0}
		<section class="mb-8">
			<h2 class="text-lg font-serif text-foreground mb-4">By Provider (30d)</h2>
			<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
				<table class="w-full text-sm font-sans" aria-label="AI usage by provider — last 30 days">
					<thead>
						<tr
							class="bg-grove-50 dark:bg-cream-200/20 text-xs text-foreground-muted uppercase tracking-wide"
						>
							<th scope="col" class="px-5 py-3 text-left font-medium">Provider</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Requests</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Total Cost</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-grove-100 dark:divide-cream-300/40">
						{#each data.lumen.byProvider as provider}
							<tr class="bg-white dark:bg-cream-100/30">
								<td class="px-5 py-3 text-foreground font-mono text-xs">{provider.provider}</td>
								<td class="px-5 py-3 text-right text-foreground"
									>{provider.count.toLocaleString()}</td
								>
								<td class="px-5 py-3 text-right text-foreground"
									>${provider.totalCost.toFixed(4)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}

	<!-- By model -->
	{#if data.lumen.byModel.length > 0}
		<section>
			<h2 class="text-lg font-serif text-foreground mb-4">By Model (30d)</h2>
			<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
				<table class="w-full text-sm font-sans" aria-label="AI usage by model — last 30 days">
					<thead>
						<tr
							class="bg-grove-50 dark:bg-cream-200/20 text-xs text-foreground-muted uppercase tracking-wide"
						>
							<th scope="col" class="px-5 py-3 text-left font-medium">Model</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Requests</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Total Cost</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-grove-100 dark:divide-cream-300/40">
						{#each data.lumen.byModel as model}
							<tr class="bg-white dark:bg-cream-100/30">
								<td class="px-5 py-3 text-foreground font-mono text-xs">{model.model}</td>
								<td class="px-5 py-3 text-right text-foreground">{model.count.toLocaleString()}</td>
								<td class="px-5 py-3 text-right text-foreground">${model.totalCost.toFixed(4)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/if}
