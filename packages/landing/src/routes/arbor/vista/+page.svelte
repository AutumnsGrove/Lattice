<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import {
		CheckCircle2,
		AlertTriangle,
		AlertCircle,
		Clock,
		Wifi,
		WifiOff,
		Info,
	} from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	function formatRelativeTime(epochSeconds: number | null): string {
		if (!epochSeconds) return "Never";
		const diffMs = Date.now() - epochSeconds * 1000;
		const minutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMs / 3600000);
		const days = Math.floor(diffMs / 86400000);

		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		return `${days} day${days !== 1 ? "s" : ""} ago`;
	}

	const severityColors: Record<string, string> = {
		critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
		warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
		info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
	};
</script>

<svelte:head>
	<title>Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Vista</h1>
	<p class="text-foreground-muted font-sans mt-1">Observability overview for all Grove services</p>
</div>

<!-- Token not configured notice -->
{#if !data.collectionTokenConfigured}
	<GlassCard class="mb-6 p-5 border-amber-200 dark:border-amber-800">
		<div class="flex items-start gap-3">
			<Info class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
			<div>
				<p class="text-sm font-sans font-medium text-amber-700 dark:text-amber-400">
					Vista is ready — connect your Cloudflare API token to start seeing live metrics.
				</p>
				<p class="text-xs font-sans text-foreground-muted mt-1">
					Apply <code class="font-mono text-xs bg-cream-100 dark:bg-cream-200 px-1 py-0.5 rounded"
						>CF_OBSERVABILITY_TOKEN</code
					> to the grove-vista-collector worker to begin collection.
				</p>
			</div>
		</div>
	</GlassCard>
{/if}

<!-- Last Collection + Alert Summary -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
	<GlassCard class="p-5">
		<div class="flex items-center gap-3">
			<Clock class="w-5 h-5 text-foreground-muted shrink-0" />
			<div>
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					Last Collection
				</p>
				<p class="text-sm font-sans font-medium text-foreground mt-0.5">
					{formatRelativeTime(data.overview?.lastCollectionAt ?? null)}
				</p>
			</div>
		</div>
	</GlassCard>

	<GlassCard class="p-5">
		<div class="flex items-center gap-3">
			{#if data.activeAlerts.length > 0}
				<AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
			{:else}
				<CheckCircle2 class="w-5 h-5 text-grove-600 dark:text-grove-400 shrink-0" />
			{/if}
			<div>
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Active Alerts</p>
				<p
					class="text-sm font-sans font-medium {data.activeAlerts.length > 0
						? 'text-amber-700 dark:text-amber-400'
						: 'text-grove-700 dark:text-grove-400'} mt-0.5"
				>
					{data.activeAlerts.length === 0
						? "None"
						: `${data.activeAlerts.length} alert${data.activeAlerts.length !== 1 ? "s" : ""}`}
				</p>
			</div>
		</div>
	</GlassCard>
</div>

<!-- Active Alerts -->
{#if data.activeAlerts.length > 0}
	<section class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">Active Alerts</h2>
		<div class="space-y-2">
			{#each data.activeAlerts as alert}
				<GlassCard class="p-4">
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-start gap-3">
							<AlertCircle
								class="w-4 h-4 mt-0.5 {alert.severity === 'critical'
									? 'text-red-600 dark:text-red-400'
									: alert.severity === 'warning'
										? 'text-amber-600 dark:text-amber-400'
										: 'text-blue-600 dark:text-blue-400'} shrink-0"
							/>
							<div>
								<p class="text-sm font-sans font-medium text-foreground">{alert.title}</p>
								<p class="text-xs font-sans text-foreground-muted">
									{alert.serviceName} · {formatRelativeTime(alert.triggeredAt)}
								</p>
							</div>
						</div>
						<span
							class="text-xs font-sans px-2 py-0.5 rounded shrink-0 {severityColors[
								alert.severity
							] ?? severityColors.info}"
						>
							{alert.severity}
						</span>
					</div>
				</GlassCard>
			{/each}
		</div>
	</section>
{/if}

<!-- Health Summary -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Service Health</h2>

	{#if !data.overview || data.overview.healthSummary.length === 0}
		<GlassCard class="p-6 text-center">
			{#if !data.collectionTokenConfigured}
				<WifiOff class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
				<p class="text-foreground-muted font-sans text-sm">
					Health checks will appear here once the CF observability token is connected and the first
					collection has run.
				</p>
			{:else}
				<Clock class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
				<p class="text-foreground-muted font-sans text-sm">
					Awaiting first collection run — check back in a few minutes.
				</p>
			{/if}
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-cream-300">
			<div class="divide-y divide-grove-100 dark:divide-cream-300/50">
				{#each data.overview.healthSummary as check}
					<div class="flex items-center justify-between px-6 py-3 bg-white dark:bg-cream-100/30">
						<div class="flex items-center gap-3">
							{#if check.isHealthy}
								<CheckCircle2
									class="w-4 h-4 text-green-600 dark:text-green-400 shrink-0"
									aria-label="Healthy"
								/>
							{:else}
								<AlertTriangle
									class="w-4 h-4 text-red-600 dark:text-red-400 shrink-0"
									aria-label="Unhealthy"
								/>
							{/if}
							<span class="text-sm font-sans text-foreground font-mono">{check.endpoint}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-xs font-sans text-foreground-muted">
								{formatRelativeTime(check.checkedAt)}
							</span>
							{#if check.isHealthy}
								<Wifi class="w-4 h-4 text-grove-600 dark:text-grove-400" aria-hidden="true" />
							{:else}
								<WifiOff class="w-4 h-4 text-red-600 dark:text-red-400" aria-hidden="true" />
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- Quick nav hint -->
<GlassCard class="p-5">
	<p class="text-sm font-sans text-foreground-muted">
		Use the sidebar to explore Workers, Databases, Storage, Costs, and service-specific dashboards.
		Collection runs automatically every 5 minutes via the grove-vista-collector cron worker.
	</p>
</GlassCard>
