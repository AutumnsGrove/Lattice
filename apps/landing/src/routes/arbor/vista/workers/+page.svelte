<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Server, Info } from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	function formatRelativeTime(epochSeconds: number): string {
		const diffMs = Date.now() - epochSeconds * 1000;
		const minutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMs / 3600000);
		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		return `${hours}h ago`;
	}

	function formatErrorRate(requests: number, errors: number): string {
		if (requests === 0) return "—";
		return ((errors / requests) * 100).toFixed(2) + "%";
	}

	function formatLatency(ms: number | null): string {
		if (ms === null) return "—";
		return Math.round(ms) + "ms";
	}
</script>

<svelte:head>
	<title>Workers — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Workers</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Request rates, error rates, and latency per worker (last 24h)
	</p>
</div>

{#if !data.collectionStatus?.hasCompleted}
	<GlassCard class="mb-6 p-5 border-warning dark:border-warning">
		<div class="flex items-start gap-3">
			<Info class="w-5 h-5 text-warning dark:text-warning mt-0.5 shrink-0" />
			<p class="text-sm font-sans text-warning dark:text-warning">
				Awaiting first collection run — ensure the grove-vista-collector worker is deployed.
			</p>
		</div>
	</GlassCard>
{/if}

{#if !data.workers || data.workers.length === 0}
	<GlassCard class="p-8 text-center">
		<Server class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans">
			No worker metrics collected yet — check back after the next collection run.
		</p>
	</GlassCard>
{:else}
	<div class="overflow-hidden rounded-xl border border-border dark:border-border">
		<table class="w-full text-sm font-sans" aria-label="Worker metrics — last 24 hours">
			<thead>
				<tr
					class="bg-surface-subtle dark:bg-surface-subtle text-xs text-foreground-muted uppercase tracking-wide"
				>
					<th scope="col" class="px-5 py-3 text-left font-medium">Worker</th>
					<th scope="col" class="px-5 py-3 text-right font-medium">Last Seen</th>
					<th scope="col" class="px-5 py-3 text-right font-medium">Requests (24h)</th>
					<th scope="col" class="px-5 py-3 text-right font-medium">Error Rate</th>
					<th scope="col" class="px-5 py-3 text-right font-medium">p50</th>
					<th scope="col" class="px-5 py-3 text-right font-medium">p95</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-border dark:divide-border">
				{#each data.workers as worker}
					<tr
						class="bg-surface dark:bg-surface hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
					>
						<td class="px-5 py-3 font-mono text-xs text-foreground">{worker.serviceName}</td>
						<td class="px-5 py-3 text-right text-foreground-muted"
							>{formatRelativeTime(worker.lastSeen)}</td
						>
						<td class="px-5 py-3 text-right text-foreground">{worker.requests.toLocaleString()}</td>
						<td
							class="px-5 py-3 text-right {worker.requests > 0 &&
							worker.errors / worker.requests > 0.05
								? 'text-error dark:text-error'
								: worker.requests > 0 && worker.errors / worker.requests > 0.01
									? 'text-warning dark:text-warning'
									: 'text-foreground-muted'}"
						>
							{formatErrorRate(worker.requests, worker.errors)}
						</td>
						<td class="px-5 py-3 text-right text-foreground-muted">{formatLatency(worker.p50)}</td>
						<td class="px-5 py-3 text-right text-foreground-muted">{formatLatency(worker.p95)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
