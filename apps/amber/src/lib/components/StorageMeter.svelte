<script lang="ts">
	import type { QuotaStatus } from "$types";

	interface Props {
		quota: QuotaStatus;
	}

	let { quota }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	const barClass = $derived(
		quota.warning_level === "full"
			? "bar-error"
			: quota.warning_level === "critical"
				? "bar-critical"
				: quota.warning_level === "warning"
					? "bar-warning"
					: "bar-normal",
	);
</script>

<div class="storage-meter">
	<div class="meter-header">
		<h3>Storage</h3>
		<span class="usage-text">
			{formatBytes(quota.used_bytes)} / {quota.total_gb} GB
		</span>
	</div>

	<div class="progress-track">
		<div class="progress-bar {barClass}" style="width: {Math.min(quota.percentage, 100)}%"></div>
	</div>

	<div class="meter-footer">
		<span>{quota.percentage.toFixed(1)}% used</span>
		<span>{formatBytes(quota.available_bytes)} available</span>
	</div>

	{#if quota.warning_level === "warning"}
		<div class="warning-banner warning">
			<p>
				You're approaching your storage limit. Consider cleaning up unused files or upgrading your
				plan.
			</p>
		</div>
	{:else if quota.warning_level === "critical"}
		<div class="warning-banner critical">
			<p>Storage almost full! Large file uploads may be blocked. Free up space soon.</p>
		</div>
	{:else if quota.warning_level === "full"}
		<div class="warning-banner error">
			<p>Storage full. New uploads are blocked. Delete files or add more storage to continue.</p>
		</div>
	{/if}
</div>

<style>
	.storage-meter {
		padding: var(--space-4);
	}

	.meter-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-3);
	}

	.meter-header h3 {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.usage-text {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.progress-track {
		width: 100%;
		height: 12px;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		border-radius: var(--radius-full);
		transition:
			width 0.3s ease,
			background 0.3s ease;
	}

	.bar-normal {
		background: var(--color-success);
	}

	.bar-warning {
		background: var(--color-primary);
	}

	.bar-critical {
		background: var(--color-warning);
	}

	.bar-error {
		background: var(--color-error);
	}

	.meter-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.warning-banner {
		margin-top: var(--space-3);
		padding: var(--space-3);
		border-radius: var(--radius-lg);
		font-size: var(--text-sm);
	}

	.warning-banner.warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning);
		color: var(--color-warning);
	}

	.warning-banner.critical {
		background: rgba(251, 146, 60, 0.15);
		border: 1px solid #fb923c;
		color: #fb923c;
	}

	.warning-banner.error {
		background: var(--color-error-muted);
		border: 1px solid var(--color-error);
		color: var(--color-error);
	}
</style>
