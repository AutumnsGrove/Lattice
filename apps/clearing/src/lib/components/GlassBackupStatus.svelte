<script lang="ts">
	/**
	 * GlassBackupStatus - Data Protection Status Display
	 *
	 * Shows backup health, reliability score, and recent backup history.
	 * Follows Grove UI patterns:
	 * - Lucide icons only (no emojis)
	 * - Glass card styling
	 * - Dark mode support
	 * - Organic, welcoming feel
	 */
	import { cn } from "@autumnsgrove/lattice/ui/utils";
	import type { BackupStatus } from "$lib/server/backups";
	import { authIcons, stateIcons, metricIcons, featureIcons } from "@autumnsgrove/prism/icons";

	interface Props {
		backupStatus: BackupStatus;
		class?: string;
	}

	let { backupStatus, class: className }: Props = $props();

	// Format bytes to human-readable
	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / 1048576).toFixed(1)} MB`;
	}

	// Format date with friendly labels
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr + "T00:00:00");
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (date.getTime() === today.getTime()) return "Today";

		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		if (date.getTime() === yesterday.getTime()) return "Yesterday";

		return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
	}

	// Status configuration based on health
	const statusConfig = $derived(
		backupStatus.isHealthy
			? {
					icon: stateIcons.checkCircle,
					label: "Protected",
					color: "text-success",
					bgColor: "bg-success-bg",
					borderColor: "border-success",
				}
			: {
					icon: stateIcons.warning,
					label: "Attention Needed",
					color: "text-warning",
					bgColor: "bg-warning-bg",
					borderColor: "border-warning",
				},
	);

	// Reliability bar color
	const reliabilityColor = $derived(
		backupStatus.reliability.score >= 90
			? "bg-success"
			: backupStatus.reliability.score >= 70
				? "bg-warning"
				: "bg-error",
	);
</script>

<section class={cn("glass-card p-6", className)} aria-labelledby="data-protection-heading">
	<!-- Header -->
	<div class="flex items-center justify-between mb-6">
		<div class="flex items-center gap-3">
			<div class="p-2.5 rounded-xl bg-success-bg">
				<authIcons.shield class="w-5 h-5 text-success" aria-hidden="true" />
			</div>
			<div>
				<h2 id="data-protection-heading" class="text-lg font-semibold text-foreground">
					Data Protection
				</h2>
				<p class="text-sm text-foreground-muted">Automated backups keep your data safe</p>
			</div>
		</div>

		<!-- Status badge -->
		<div
			class={cn(
				"flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-medium",
				statusConfig.bgColor,
				statusConfig.borderColor,
			)}
		>
			<statusConfig.icon class={cn("w-4 h-4", statusConfig.color)} aria-hidden="true" />
			<span class={statusConfig.color}>{statusConfig.label}</span>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
		<div class="text-center p-4 rounded-xl bg-black/5 dark:bg-white/5">
			<div class="text-2xl font-bold text-foreground tabular-nums">
				{backupStatus.summary.totalBackups}
			</div>
			<div class="text-xs text-foreground-muted mt-1">Total Backups</div>
		</div>
		<div class="text-center p-4 rounded-xl bg-black/5 dark:bg-white/5">
			<div class="text-2xl font-bold text-foreground tabular-nums">
				{backupStatus.summary.uniqueDays}
			</div>
			<div class="text-xs text-foreground-muted mt-1">Days Covered</div>
		</div>
		<div class="text-center p-4 rounded-xl bg-black/5 dark:bg-white/5">
			<div class="text-2xl font-bold text-foreground tabular-nums">
				{formatBytes(backupStatus.summary.totalBytes)}
			</div>
			<div class="text-xs text-foreground-muted mt-1">Storage Used</div>
		</div>
		<div class="text-center p-4 rounded-xl bg-black/5 dark:bg-white/5">
			<div class="text-2xl font-bold text-foreground tabular-nums">14</div>
			<div class="text-xs text-foreground-muted mt-1">Databases</div>
		</div>
	</div>

	<!-- Reliability Score -->
	<div class="mb-6">
		<div class="flex items-center justify-between mb-2">
			<span class="text-sm font-medium text-foreground-muted"> Reliability </span>
			<span class="text-sm font-bold text-foreground tabular-nums">
				{backupStatus.reliability.score.toFixed(0)}%
			</span>
		</div>
		<div
			class="h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden"
			role="progressbar"
			aria-valuenow={backupStatus.reliability.score}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Backup reliability score"
		>
			<div
				class={cn("h-full transition-all duration-700 ease-out", reliabilityColor)}
				style="width: {backupStatus.reliability.score}%"
			></div>
		</div>
		<div class="flex items-center gap-4 mt-2.5 text-xs text-foreground-muted">
			<span class="flex items-center gap-1.5">
				<stateIcons.checkCircle class="w-3.5 h-3.5 text-success" aria-hidden="true" />
				{backupStatus.reliability.perfectJobs} perfect
			</span>
			<span class="flex items-center gap-1.5">
				<stateIcons.warning class="w-3.5 h-3.5 text-warning" aria-hidden="true" />
				{backupStatus.reliability.partialJobs} partial
			</span>
			<span class="ml-auto text-foreground-muted/60">
				Last {backupStatus.reliability.totalJobs} jobs
			</span>
		</div>
	</div>

	<!-- Recent Backups -->
	<div>
		<h3 class="text-sm font-medium text-foreground-muted mb-3">Recent Backups</h3>
		<div class="space-y-2" role="list" aria-label="Recent backup history">
			{#each backupStatus.dailyHistory.slice(0, 5) as day}
				<div
					class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/[0.07] dark:hover:bg-white/[0.07] transition-colors"
					role="listitem"
				>
					<div class="flex items-center gap-3">
						<metricIcons.calendar class="w-4 h-4 text-foreground-muted/60" aria-hidden="true" />
						<span class="text-sm font-medium text-foreground min-w-[80px]">
							{formatDate(day.date)}
						</span>
						{#if day.type === "weekly"}
							<span
								class="px-2 py-0.5 text-xs font-medium rounded-full bg-info-bg text-info border border-info"
							>
								Weekly Full
							</span>
						{:else}
							<span
								class="px-2 py-0.5 text-xs font-medium rounded-full bg-success-bg text-success border border-success"
							>
								Daily
							</span>
						{/if}
					</div>
					<div class="flex items-center gap-4 text-sm text-foreground-muted tabular-nums">
						<span>{day.count} files</span>
						<span class="flex items-center gap-1.5 min-w-[70px] justify-end">
							<featureIcons.hardDrive class="w-3.5 h-3.5" aria-hidden="true" />
							<span>{formatBytes(day.size)}</span>
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Footer info -->
	<div class="mt-5 pt-4 border-t border-black/10 dark:border-white/10">
		<p class="text-xs text-foreground-muted text-center">
			Daily 3 AM UTC (priority) · Weekly Sunday 4 AM UTC (full) · 12-week retention
		</p>
	</div>
</section>
