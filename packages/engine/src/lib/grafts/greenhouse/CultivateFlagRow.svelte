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
	import { Sprout, Home } from "lucide-svelte";

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
		flag.enabled ? "text-emerald-600" : "text-foreground-muted"
	);

	// Type badge color
	const typeBadgeClass = $derived(() => {
		switch (flag.flagType) {
			case "boolean":
				return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
			case "percentage":
				return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
			case "tier":
				return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
			case "variant":
				return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
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
					class="w-4 h-4 text-emerald-600 dark:text-emerald-400"
					aria-label="Greenhouse Only"
				/>
			{:else}
				<Home
					class="w-4 h-4 text-amber-600 dark:text-amber-400"
					aria-label="Global Flag"
				/>
			{/if}
			<span class="font-medium text-bark-800 dark:text-cream-100">{displayName}</span>
		</div>
		{#if flag.description}
			<p class="text-xs text-bark-500 dark:text-cream-400 mt-0.5 pl-6">
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
					? 'bg-emerald-500'
					: 'bg-cream-300 dark:bg-bark-600'}"
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
