<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard, GlassButton } from "@autumnsgrove/lattice/ui";
	import { api, formatRelativeTime as _frt } from "@autumnsgrove/lattice/utils";
	import { invalidateAll } from "$app/navigation";
	import {
		CheckCircle2,
		AlertTriangle,
		AlertCircle,
		Clock,
		Wifi,
		WifiOff,
		Info,
		RefreshCw,
		Loader2,
	} from "@lucide/svelte";

	let { data }: { data: PageData } = $props();

	let collecting = $state(false);
	let collectMessage = $state("");

	/** Wrapper to provide "Never" fallback for null timestamps */
	const formatRelativeTime = (v: number | null) => _frt(v, "Never");

	async function triggerCollection() {
		collecting = true;
		collectMessage = "";
		try {
			const result = await api.post<{ success: boolean; message?: string }>(
				"/api/admin/observability/collect",
				{},
			);
			if (result?.success !== false) {
				collectMessage = "Collection complete — refreshing data...";
				await invalidateAll();
				collectMessage = "";
			} else {
				collectMessage = result?.message || "Collection failed.";
			}
		} catch (err) {
			collectMessage = err instanceof Error ? err.message : "Could not reach the collector.";
		} finally {
			collecting = false;
		}
	}

	const severityColors: Record<string, string> = {
		critical: "bg-error-bg text-error-foreground",
		warning: "bg-warning-bg text-warning-foreground",
		info: "bg-info-bg text-info-foreground",
	};
</script>

<svelte:head>
	<title>Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Vista</h1>
	<p class="text-foreground-muted font-sans mt-1">Observability overview for all Grove services</p>
</div>

<!-- Collection status banners — priority: token missing → never attempted → attempted but failed -->
{#if data.collectionStatus?.tokenMissing}
	<GlassCard class="mb-6 p-5 border-warning">
		<div class="flex items-start gap-3">
			<AlertTriangle class="w-5 h-5 text-warning mt-0.5 shrink-0" />
			<div>
				<p class="text-sm font-sans font-medium text-warning-foreground">
					The observability API token isn't configured yet.
				</p>
				<p class="text-xs font-sans text-foreground-muted mt-1">
					Set <code class="font-mono text-xs bg-cream-100 dark:bg-cream-200 px-1 py-0.5 rounded"
						>CF_OBSERVABILITY_TOKEN</code
					>
					in the
					<code class="font-mono text-xs bg-cream-100 dark:bg-cream-200 px-1 py-0.5 rounded"
						>grove-vista-collector</code
					> worker's environment to enable metrics collection.
				</p>
			</div>
		</div>
	</GlassCard>
{:else if !data.collectionStatus?.hasAttempted}
	<GlassCard class="mb-6 p-5 border-warning">
		<div class="flex items-start gap-3">
			<Info class="w-5 h-5 text-warning mt-0.5 shrink-0" />
			<div>
				<p class="text-sm font-sans font-medium text-warning-foreground">
					Vista is ready — awaiting the first collection run.
				</p>
				<p class="text-xs font-sans text-foreground-muted mt-1">
					Ensure the <code
						class="font-mono text-xs bg-cream-100 dark:bg-cream-200 px-1 py-0.5 rounded"
						>grove-vista-collector</code
					> worker is deployed with its cron trigger, or trigger a run manually below.
				</p>
			</div>
		</div>
	</GlassCard>
{:else if data.collectionStatus?.hasAttempted && !data.collectionStatus?.hasCompleted}
	<GlassCard class="mb-6 p-5 border-warning">
		<div class="flex items-start gap-3">
			<AlertTriangle class="w-5 h-5 text-warning mt-0.5 shrink-0" />
			<div>
				<p class="text-sm font-sans font-medium text-warning-foreground">
					Collection runs have started but haven't completed successfully.
				</p>
				<p class="text-xs font-sans text-foreground-muted mt-1">
					Last attempted {formatRelativeTime(data.collectionStatus.lastAttemptedAt)}.
					{#if data.collectionStatus.lastCollectorsFailed}
						{data.collectionStatus.lastCollectorsFailed} collector{data.collectionStatus
							.lastCollectorsFailed !== 1
							? "s"
							: ""} failed.
					{/if}
				</p>
			</div>
		</div>
	</GlassCard>
{/if}

<!-- Last Collection + Alert Summary + Manual Trigger -->
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
	<GlassCard class="p-5">
		<div class="flex items-center gap-3">
			<Clock class="w-5 h-5 text-foreground-muted shrink-0" />
			<div>
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					Last Collection
				</p>
				<p class="text-sm font-sans font-medium text-foreground mt-0.5">
					{formatRelativeTime(data.collectionStatus?.lastCompletedAt ?? null)}
				</p>
				{#if data.collectionStatus?.lastAttemptedAt && data.collectionStatus.lastAttemptedAt !== data.collectionStatus.lastCompletedAt}
					<p class="text-xs font-sans text-foreground-muted mt-0.5">
						Last attempted {formatRelativeTime(data.collectionStatus.lastAttemptedAt)}
					</p>
				{/if}
			</div>
		</div>
	</GlassCard>

	<GlassCard class="p-5">
		<div class="flex items-center gap-3">
			{#if data.activeAlerts.length > 0}
				<AlertTriangle class="w-5 h-5 text-warning shrink-0" />
			{:else}
				<CheckCircle2 class="w-5 h-5 text-success shrink-0" />
			{/if}
			<div>
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">Active Alerts</p>
				<p
					class="text-sm font-sans font-medium {data.activeAlerts.length > 0
						? 'text-warning-foreground'
						: 'text-success-foreground'} mt-0.5"
				>
					{data.activeAlerts.length === 0
						? "None"
						: `${data.activeAlerts.length} alert${data.activeAlerts.length !== 1 ? "s" : ""}`}
				</p>
			</div>
		</div>
	</GlassCard>

	<GlassCard class="p-5">
		<div class="flex items-center gap-3">
			<RefreshCw class="w-5 h-5 text-foreground-muted shrink-0" />
			<div class="flex-1">
				<p class="text-xs font-sans text-foreground-muted uppercase tracking-wide">
					Manual Trigger
				</p>
				<div class="mt-1.5">
					<GlassButton
						variant="outline"
						size="sm"
						onclick={triggerCollection}
						disabled={collecting}
					>
						{#if collecting}
							<Loader2 class="w-3.5 h-3.5 mr-1.5 animate-spin" />
							Collecting...
						{:else}
							<RefreshCw class="w-3.5 h-3.5 mr-1.5" />
							Run Collection Now
						{/if}
					</GlassButton>
				</div>
				{#if collectMessage}
					<p class="text-xs font-sans text-foreground-muted mt-1.5">{collectMessage}</p>
				{/if}
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
									? 'text-error'
									: alert.severity === 'warning'
										? 'text-warning'
										: 'text-info'} shrink-0"
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
			<WifiOff class="w-10 h-10 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans text-sm">
				No health check data yet — the collector hasn't completed a run.
			</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border">
			<div class="divide-y divide-border">
				{#each data.overview.healthSummary as check}
					<div class="flex items-center justify-between px-6 py-3 bg-surface">
						<div class="flex items-center gap-3">
							{#if check.isHealthy}
								<CheckCircle2
									class="w-4 h-4 text-success shrink-0"
									aria-label="Healthy"
								/>
							{:else}
								<AlertTriangle
									class="w-4 h-4 text-error shrink-0"
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
								<Wifi class="w-4 h-4 text-success" aria-hidden="true" />
							{:else}
								<WifiOff class="w-4 h-4 text-error" aria-hidden="true" />
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
