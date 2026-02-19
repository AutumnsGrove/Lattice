<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { HardDrive, Info, CheckCircle2, AlertTriangle } from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
		return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
	}
</script>

<svelte:head>
	<title>Storage — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Storage</h1>
	<p class="text-foreground-muted font-sans mt-1">R2 bucket sizes and KV namespace health</p>
</div>

{#if !data.collectorConnected}
	<GlassCard class="mb-6 p-5 border-amber-200 dark:border-amber-800">
		<div class="flex items-start gap-3">
			<Info class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
			<p class="text-sm font-sans text-amber-700 dark:text-amber-400">
				Awaiting first collection run — ensure the grove-vista-collector worker is deployed.
			</p>
		</div>
	</GlassCard>
{/if}

<!-- R2 Buckets -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">R2 Buckets</h2>

	{#if data.r2.length === 0}
		<GlassCard class="p-6 text-center">
			<HardDrive class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans text-sm">No R2 metrics collected yet.</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
			<table class="w-full text-sm font-sans" aria-label="R2 bucket metrics">
				<thead>
					<tr
						class="bg-grove-50 dark:bg-cream-200/20 text-xs text-foreground-muted uppercase tracking-wide"
					>
						<th scope="col" class="px-5 py-3 text-left font-medium">Bucket</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Objects</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Total Size</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Class A Ops</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Class B Ops</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-grove-100 dark:divide-cream-300/40">
					{#each data.r2 as bucket}
						<tr class="bg-white dark:bg-cream-100/30">
							<td class="px-5 py-3 font-mono text-xs text-foreground">{bucket.bucketName}</td>
							<td class="px-5 py-3 text-right text-foreground"
								>{bucket.objectCount.toLocaleString()}</td
							>
							<td class="px-5 py-3 text-right text-foreground"
								>{formatBytes(bucket.totalSizeBytes)}</td
							>
							<td class="px-5 py-3 text-right text-foreground-muted"
								>{bucket.classAOps.toLocaleString()}</td
							>
							<td class="px-5 py-3 text-right text-foreground-muted"
								>{bucket.classBOps.toLocaleString()}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<!-- KV Namespaces -->
<section>
	<h2 class="text-lg font-serif text-foreground mb-4">KV Namespaces</h2>

	{#if data.kv.length === 0}
		<GlassCard class="p-6 text-center">
			<HardDrive class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans text-sm">No KV metrics collected yet.</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
			<table class="w-full text-sm font-sans" aria-label="KV namespace metrics">
				<thead>
					<tr
						class="bg-grove-50 dark:bg-cream-200/20 text-xs text-foreground-muted uppercase tracking-wide"
					>
						<th scope="col" class="px-5 py-3 text-left font-medium">Namespace</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Health</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Reads</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Writes</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Deletes</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-grove-100 dark:divide-cream-300/40">
					{#each data.kv as ns}
						<tr class="bg-white dark:bg-cream-100/30">
							<td class="px-5 py-3 font-mono text-xs text-foreground">{ns.namespaceName}</td>
							<td class="px-5 py-3 text-right">
								<span
									class="inline-flex items-center gap-1 text-xs font-sans px-2 py-0.5 rounded {ns.healthStatus ===
									'healthy'
										? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
										: ns.healthStatus === 'degraded'
											? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
											: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}"
								>
									{#if ns.healthStatus === "healthy"}
										<CheckCircle2 class="w-3 h-3" />
									{:else}
										<AlertTriangle class="w-3 h-3" />
									{/if}
									{ns.healthStatus}
								</span>
							</td>
							<td class="px-5 py-3 text-right text-foreground">{ns.reads.toLocaleString()}</td>
							<td class="px-5 py-3 text-right text-foreground">{ns.writes.toLocaleString()}</td>
							<td class="px-5 py-3 text-right text-foreground-muted"
								>{ns.deletes.toLocaleString()}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>
