<script lang="ts">
	/**
	 * CultivateFlagRow - Single row for a feature flag with toggle and maturity control
	 *
	 * Displays a feature flag's name, type badge, maturity stage dropdown,
	 * greenhouse status, and a toggle to cultivate (enable) or prune (disable) it globally.
	 */

	import type { CultivateFlagRowProps } from "./types.js";
	import type { FlagMaturity } from "../../feature-flags/types.js";
	import GreenhouseToggle from "./GreenhouseToggle.svelte";
	import { Sprout, Home } from "@lucide/svelte";

	let {
		flag,
		onToggle,
		onMaturityChange,
		loading = false,
		class: className = "",
	}: CultivateFlagRowProps = $props();

	// Format flag ID for display (snake_case -> Title Case)
	const displayName = $derived(
		flag.name ||
			flag.id
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" "),
	);

	// Determine status label
	const statusLabel = $derived(flag.enabled ? "Cultivated" : "Pruned");
	const statusColor = $derived(flag.enabled ? "text-success" : "text-foreground-muted");

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

	// Maturity badge styling — uses Prism semantic tokens via Tailwind
	const maturityClass = $derived(() => {
		switch (flag.maturity) {
			case "experimental":
				return "bg-warning-bg text-warning-foreground";
			case "beta":
				return "bg-info-bg text-info-foreground";
			case "stable":
				return "bg-success-bg text-success-foreground";
			case "graduated":
				return "bg-foreground/5 text-foreground-muted";
			default:
				return "";
		}
	});

	function handleMaturitySelect(e: Event) {
		const select = e.target as HTMLSelectElement;
		const newMaturity = select.value as FlagMaturity;
		if (newMaturity !== flag.maturity && onMaturityChange) {
			onMaturityChange(flag.id, newMaturity);
		}
	}
</script>

<tr class="group hover:bg-foreground/[0.02] {className}">
	<!-- Flag name with greenhouse badge -->
	<td class="py-3 px-4">
		<div class="flex items-center gap-2">
			{#if flag.greenhouseOnly}
				<Sprout class="w-4 h-4 text-success" aria-label="Greenhouse Only" />
			{:else}
				<Home class="w-4 h-4 text-warning" aria-label="Global Flag" />
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

	<!-- Maturity dropdown -->
	<td class="py-3 px-4">
		{#if onMaturityChange}
			<select
				value={flag.maturity}
				onchange={handleMaturitySelect}
				disabled={loading}
				class="maturity-select {maturityClass()}"
				aria-label="Maturity stage for {displayName}"
			>
				<option value="experimental">Experimental</option>
				<option value="beta">Beta</option>
				<option value="stable">Stable</option>
				<option value="graduated">Graduated</option>
			</select>
		{:else}
			<span
				class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize {maturityClass()}"
			>
				{flag.maturity}
			</span>
		{/if}
	</td>

	<!-- Status indicator -->
	<td class="py-3 px-4">
		<div class="flex items-center gap-1.5">
			<span
				class="w-2 h-2 rounded-full {flag.enabled ? 'bg-success' : 'bg-muted dark:bg-muted'}"
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

<style>
	.maturity-select {
		appearance: none;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.5rem center;
		padding: 0.25rem 1.75rem 0.25rem 0.5rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		border: 1px solid transparent;
		transition: border-color 0.15s ease;
	}

	.maturity-select:hover {
		border-color: var(--color-border);
	}

	.maturity-select:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 1px;
	}

	.maturity-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
