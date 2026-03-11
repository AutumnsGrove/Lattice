<script lang="ts">
	/**
	 * CultivateFlagRow - Single row for a feature flag with toggle
	 *
	 * Displays a feature flag's name, type badge, greenhouse status,
	 * and a toggle to cultivate (enable) or prune (disable) it globally.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <CultivateFlagRow
	 *   flag={flagSummary}
	 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
	 * />
	 * ```
	 */

	import type { CultivateFlagRowProps } from "./types.js";
	import GreenhouseToggle from "./GreenhouseToggle.svelte";
	import { Sprout, Home } from "@lucide/svelte";

	let {
		flag,
		onToggle,
		loading = false,
		class: className = "",
	}: CultivateFlagRowProps = $props();

	// Format flag ID for display (snake_case -> Title Case)
	const displayName = $derived(
		flag.name ||
			flag.id
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" ")
	);

	// Determine status label
	const statusLabel = $derived(flag.enabled ? "Cultivated" : "Pruned");
	const statusColor = $derived(
		flag.enabled ? "text-success" : "text-foreground-muted"
	);

	// Type badge color
	const typeBadgeClass = $derived(() => {
		switch (flag.flagType) {
			case "boolean":
				return "bg-info-bg text-info-foreground";
			case "percentage":
				return "bg-accent-subtle text-accent-foreground";
			case "tier":
				return "bg-warning-bg text-warning-foreground";
			case "variant":
				return "bg-error-bg text-error";
			case "json":
				return "bg-cream-100 text-bark-700 dark:bg-bark-900/30 dark:text-cream-400";
			default:
				return "bg-cream-100 text-foreground dark:bg-bark-900/30 dark:text-foreground-faint";
		}
	});
</script>

<tr class="group hover:bg-foreground/[0.02] {className}">
	<!-- Flag name with greenhouse badge -->
	<td class="py-3 px-4">
		<div class="flex items-center gap-2">
			{#if flag.greenhouseOnly}
				<Sprout
					class="w-4 h-4 text-success"
					aria-label="Greenhouse Only"
				/>
			{:else}
				<Home
					class="w-4 h-4 text-warning"
					aria-label="Global Flag"
				/>
			{/if}
			<span class="font-medium text-foreground">{displayName}</span>
		</div>
		{#if flag.description}
			<p class="text-xs text-foreground-muted mt-0.5 pl-6">
				{flag.description}
			</p>
		{/if}
	</td>

	<!-- Type badge -->
	<td class="py-3 px-4">
		<span
			class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {typeBadgeClass()}"
		>
			{flag.flagType}
		</span>
	</td>

	<!-- Status indicator -->
	<td class="py-3 px-4">
		<div class="flex items-center gap-1.5">
			<span
				class="w-2 h-2 rounded-full {flag.enabled
					? 'bg-success'
					: 'bg-muted dark:bg-muted'}"
				aria-hidden="true"
			></span>
			<span class="text-sm {statusColor}">{statusLabel}</span>
		</div>
	</td>

	<!-- Toggle -->
	<td class="py-3 px-4">
		<GreenhouseToggle
			enabled={flag.enabled}
			tenantId={flag.id}
			disabled={loading}
			onToggle={(id, enabled) => onToggle(id, enabled)}
		/>
	</td>
</tr>
