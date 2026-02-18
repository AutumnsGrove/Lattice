<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Lock } from "lucide-svelte";

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Warden — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Warden</h1>
	<p class="text-foreground-muted font-sans mt-1">
		API gateway — auth failures, per-service latency, security signals
	</p>
</div>

{#if !data.warden || !data.warden.available}
	<GlassCard class="p-8 text-center border-cream-200 dark:border-cream-300">
		<Lock class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans font-medium">
			Warden isn't deployed yet — metrics will appear here once it's running.
		</p>
		<p class="text-xs font-sans text-foreground-muted mt-2">
			Once grove-warden is deployed and its audit log tables are created, this page will fill in
			automatically.
		</p>
	</GlassCard>
{:else}
	<!-- Request volume and auth -->
	<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
				Request Volume (24h)
			</p>
			<p class="text-xl font-serif text-foreground mt-1">
				{data.warden.requestVolume24h.toLocaleString()}
			</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
				Auth Failure Rate
			</p>
			<p
				class="text-xl font-serif {data.warden.authFailureRate24h > 5
					? 'text-red-600 dark:text-red-400'
					: data.warden.authFailureRate24h > 1
						? 'text-amber-600 dark:text-amber-400'
						: 'text-foreground'} mt-1"
			>
				{data.warden.authFailureRate24h.toFixed(2)}%
			</p>
		</GlassCard>
		<GlassCard class="p-5">
			<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
				Nonce Reuse Attempts
			</p>
			<p
				class="text-xl font-serif {data.warden.nonceReuseAttempts24h > 0
					? 'text-red-600 dark:text-red-400'
					: 'text-foreground'} mt-1"
			>
				{data.warden.nonceReuseAttempts24h}
			</p>
		</GlassCard>
	</div>

	<!-- Auth breakdown -->
	<section class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">Auth Breakdown (24h)</h2>
		<div class="grid grid-cols-3 gap-4">
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted">Service Binding</p>
				<p class="text-lg font-serif text-foreground mt-1">
					{data.warden.authBreakdown24h.serviceBinding.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted">Challenge Response</p>
				<p class="text-lg font-serif text-foreground mt-1">
					{data.warden.authBreakdown24h.challengeResponse.toLocaleString()}
				</p>
			</GlassCard>
			<GlassCard class="p-4">
				<p class="text-xs font-sans text-foreground-muted">Failed</p>
				<p class="text-lg font-serif text-red-600 dark:text-red-400 mt-1">
					{data.warden.authBreakdown24h.failed.toLocaleString()}
				</p>
			</GlassCard>
		</div>
	</section>

	<!-- Per-service latency -->
	{#if data.warden.perServiceLatency.length > 0}
		<section>
			<h2 class="text-lg font-serif text-foreground mb-4">Per-Service Latency (24h)</h2>
			<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
				<table class="w-full text-sm font-sans" aria-label="Per-service latency — last 24 hours">
					<thead>
						<tr
							class="bg-grove-50 dark:bg-cream-200/20 text-xs text-foreground-muted uppercase tracking-wide"
						>
							<th scope="col" class="px-5 py-3 text-left font-medium">Service</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Avg Latency</th>
							<th scope="col" class="px-5 py-3 text-right font-medium">Requests</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-grove-100 dark:divide-cream-300/40">
						{#each data.warden.perServiceLatency as svc}
							<tr class="bg-white dark:bg-cream-100/30">
								<td class="px-5 py-3 font-mono text-xs text-foreground">{svc.service}</td>
								<td class="px-5 py-3 text-right text-foreground">{Math.round(svc.avgMs)}ms</td>
								<td class="px-5 py-3 text-right text-foreground-muted"
									>{svc.count.toLocaleString()}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/if}
