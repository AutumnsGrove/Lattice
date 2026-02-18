<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { DollarSign, Clock } from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	// Group rows by date and compute daily totals
	type CostRow = (typeof data.costs)[number];
	const byDate = $derived(() => {
		const map = new Map<string, { date: string; services: CostRow[]; total: number }>();
		for (const row of data.costs) {
			if (!map.has(row.date)) {
				map.set(row.date, { date: row.date, services: [] as CostRow[], total: 0 });
			}
			const entry = map.get(row.date)!;
			entry.services.push(row);
			entry.total += row.estimatedCostUsd;
		}
		return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
	});

	const grandTotal = $derived(data.costs.reduce((sum, row) => sum + row.estimatedCostUsd, 0));
</script>

<svelte:head>
	<title>Costs — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Costs</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Estimated Cloudflare costs per service (last 30 days)
	</p>
</div>

{#if data.costs.length === 0}
	<GlassCard class="p-8 text-center">
		<Clock class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans">
			Cost data appears after the first daily collection run (midnight UTC).
		</p>
		<p class="text-xs font-sans text-foreground-muted mt-2">
			The vista-collector runs at midnight to aggregate daily costs from collected metrics.
		</p>
	</GlassCard>
{:else}
	<!-- Grand Total -->
	<GlassCard class="mb-6 p-5">
		<div class="flex items-center gap-3">
			<DollarSign class="w-5 h-5 text-foreground-muted shrink-0" />
			<div>
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					30-Day Total (estimated)
				</p>
				<p class="text-xl font-serif text-foreground mt-0.5">${grandTotal.toFixed(4)}</p>
			</div>
		</div>
	</GlassCard>

	<!-- Daily breakdown -->
	<div class="space-y-4">
		{#each byDate() as day}
			<GlassCard class="p-5">
				<div class="flex items-center justify-between mb-3">
					<p class="text-sm font-sans font-medium text-foreground">{day.date}</p>
					<p class="text-sm font-sans font-medium text-foreground">${day.total.toFixed(4)}</p>
				</div>
				<div class="space-y-1">
					{#each day.services as row}
						<div class="flex items-center justify-between text-xs font-sans">
							<span class="text-foreground-muted font-mono">{row.serviceName}</span>
							<span class="text-foreground">${row.estimatedCostUsd.toFixed(5)}</span>
						</div>
					{/each}
				</div>
			</GlassCard>
		{/each}
	</div>

	<p class="text-xs font-sans text-foreground-muted mt-6 text-right">
		Pricing last verified: {data.pricingLastVerified} · Estimates only, not billing data
	</p>
{/if}
