<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { Bell, AlertCircle, CheckCircle2, Info } from "lucide-svelte";
	let { data }: { data: PageData } = $props();

	// Threshold form state
	let newThreshold = $state({
		serviceName: "",
		metricType: "",
		operator: "gt" as "gt" | "lt" | "gte" | "lte" | "eq",
		thresholdValue: "",
		severity: "warning" as "info" | "warning" | "critical",
	});
	let saving = $state(false);
	let saveMessage = $state("");

	const severityColors: Record<string, string> = {
		critical: "bg-error-bg text-error",
		warning: "bg-warning-bg text-warning",
		info: "bg-info-bg text-info",
	};

	function formatRelativeTime(epochSeconds: number): string {
		const diffMs = Date.now() - epochSeconds * 1000;
		const minutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMs / 3600000);
		const days = Math.floor(diffMs / 86400000);
		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		return `${days}d ago`;
	}

	async function handleSaveThreshold(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		saveMessage = "";

		try {
			const res = await fetch("/api/admin/observability/thresholds", {
				// csrf-ok
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					serviceName: newThreshold.serviceName,
					metricType: newThreshold.metricType,
					operator: newThreshold.operator,
					thresholdValue: parseFloat(newThreshold.thresholdValue),
					severity: newThreshold.severity,
				}),
			});
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as { error_description?: string };
				throw new Error(body.error_description ?? "Failed to save threshold.");
			}
			saveMessage = "Threshold saved.";
			newThreshold = {
				serviceName: "",
				metricType: "",
				operator: "gt",
				thresholdValue: "",
				severity: "warning",
			};
		} catch (err) {
			saveMessage = err instanceof Error ? err.message : "Failed to save threshold.";
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Alerts — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Alerts</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Active alerts, alert history, and threshold configuration
	</p>
</div>

<!-- Active alerts -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Active Alerts</h2>

	{#if data.active.length === 0}
		<GlassCard class="p-6 text-center">
			<CheckCircle2 class="w-10 h-10 mx-auto mb-3 text-success" />
			<p class="text-foreground-muted font-sans text-sm">No active alerts — all clear.</p>
		</GlassCard>
	{:else}
		<div class="space-y-2">
			{#each data.active as alert}
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
								{#if alert.description}
									<p class="text-xs font-sans text-foreground-muted mt-0.5">{alert.description}</p>
								{/if}
								<p class="text-xs font-sans text-foreground-muted mt-0.5">
									{alert.serviceName} · {formatRelativeTime(alert.triggeredAt)}
									{#if alert.acknowledged}
										· Acknowledged{/if}
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
	{/if}
</section>

<!-- Alert history -->
{#if data.recent.length > 0}
	<section class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">Recent History</h2>
		<div class="overflow-hidden rounded-xl border border-border">
			<table class="w-full text-sm font-sans" aria-label="Recent alert history">
				<thead>
					<tr
						class="bg-surface-subtle text-xs text-foreground-muted uppercase tracking-wide"
					>
						<th scope="col" class="px-5 py-3 text-left font-medium">Alert</th>
						<th scope="col" class="px-5 py-3 text-left font-medium">Service</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Severity</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Triggered</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-divider">
					{#each data.recent as alert}
						<tr class="bg-surface">
							<td class="px-5 py-3 text-foreground text-xs">{alert.title}</td>
							<td class="px-5 py-3 font-mono text-xs text-foreground-muted">{alert.serviceName}</td>
							<td class="px-5 py-3 text-right">
								<span
									class="text-xs px-2 py-0.5 rounded {severityColors[alert.severity] ??
										severityColors.info}"
								>
									{alert.severity}
								</span>
							</td>
							<td class="px-5 py-3 text-right text-foreground-muted text-xs"
								>{formatRelativeTime(alert.triggeredAt)}</td
							>
							<td class="px-5 py-3 text-right">
								{#if alert.resolvedAt}
									<span class="text-xs text-success">Resolved</span>
								{:else}
									<span class="text-xs text-warning">Active</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<!-- Thresholds -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Alert Thresholds</h2>

	{#if data.thresholds.length > 0}
		<div class="overflow-hidden rounded-xl border border-border mb-6">
			<table class="w-full text-sm font-sans" aria-label="Configured alert thresholds">
				<thead>
					<tr
						class="bg-surface-subtle text-xs text-foreground-muted uppercase tracking-wide"
					>
						<th scope="col" class="px-5 py-3 text-left font-medium">Service</th>
						<th scope="col" class="px-5 py-3 text-left font-medium">Metric</th>
						<th scope="col" class="px-5 py-3 text-left font-medium">Rule</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Severity</th>
						<th scope="col" class="px-5 py-3 text-right font-medium">Status</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-divider">
					{#each data.thresholds as threshold}
						<tr class="bg-surface {threshold.enabled ? '' : 'opacity-50'}">
							<td class="px-5 py-3 font-mono text-xs text-foreground">{threshold.serviceName}</td>
							<td class="px-5 py-3 font-mono text-xs text-foreground-muted"
								>{threshold.metricType}</td
							>
							<td class="px-5 py-3 text-xs text-foreground-muted"
								>{threshold.operator} {threshold.thresholdValue}</td
							>
							<td class="px-5 py-3 text-right">
								<span
									class="text-xs px-2 py-0.5 rounded {severityColors[threshold.severity] ??
										severityColors.info}"
								>
									{threshold.severity}
								</span>
							</td>
							<td class="px-5 py-3 text-right text-xs text-foreground-muted">
								{threshold.enabled ? "Active" : "Disabled"}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<!-- Add new threshold -->
	<GlassCard class="p-5">
		<h3 class="text-sm font-sans font-medium text-foreground mb-4 flex items-center gap-2">
			<Bell class="w-4 h-4 text-foreground-muted" />
			Add / Update Threshold
		</h3>

		<form onsubmit={handleSaveThreshold} class="space-y-3">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<div>
					<label class="block text-xs font-sans text-foreground-muted mb-1" for="threshold-service"
						>Service Name</label
					>
					<input
						id="threshold-service"
						type="text"
						placeholder="e.g. grove-engine"
						bind:value={newThreshold.serviceName}
						required
						class="w-full text-sm font-sans px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
					/>
				</div>
				<div>
					<label class="block text-xs font-sans text-foreground-muted mb-1" for="threshold-metric"
						>Metric Type</label
					>
					<input
						id="threshold-metric"
						type="text"
						placeholder="e.g. error_rate"
						bind:value={newThreshold.metricType}
						required
						class="w-full text-sm font-sans px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
					/>
				</div>
				<div>
					<label class="block text-xs font-sans text-foreground-muted mb-1" for="threshold-operator"
						>Operator</label
					>
					<select
						id="threshold-operator"
						bind:value={newThreshold.operator}
						class="w-full text-sm font-sans px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
					>
						<option value="gt">gt (greater than)</option>
						<option value="gte">gte (greater than or equal)</option>
						<option value="lt">lt (less than)</option>
						<option value="lte">lte (less than or equal)</option>
						<option value="eq">eq (equals)</option>
					</select>
				</div>
				<div>
					<label class="block text-xs font-sans text-foreground-muted mb-1" for="threshold-value"
						>Threshold Value</label
					>
					<input
						id="threshold-value"
						type="number"
						step="any"
						placeholder="e.g. 0.05"
						bind:value={newThreshold.thresholdValue}
						required
						class="w-full text-sm font-sans px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
					/>
				</div>
				<div>
					<label class="block text-xs font-sans text-foreground-muted mb-1" for="threshold-severity"
						>Severity</label
					>
					<select
						id="threshold-severity"
						bind:value={newThreshold.severity}
						class="w-full text-sm font-sans px-3 py-2 rounded-lg border border-border bg-surface text-foreground"
					>
						<option value="info">info</option>
						<option value="warning">warning</option>
						<option value="critical">critical</option>
					</select>
				</div>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="submit"
					disabled={saving}
					class="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-sans hover:bg-primary/90 transition-colors disabled:opacity-60"
				>
					{saving ? "Saving…" : "Save Threshold"}
				</button>
				{#if saveMessage}
					<p
						role="status"
						aria-live="polite"
						class="text-xs font-sans {saveMessage.includes('saved')
							? 'text-success'
							: 'text-error'}"
					>
						{saveMessage}
					</p>
				{/if}
			</div>
		</form>
	</GlassCard>
</section>

{#if !data.dbAvailable}
	<GlassCard class="p-5 border-warning">
		<div class="flex items-start gap-3">
			<Info class="w-4 h-4 text-warning mt-0.5 shrink-0" />
			<p class="text-xs font-sans text-warning">
				Database not available in this environment.
			</p>
		</div>
	</GlassCard>
{/if}
