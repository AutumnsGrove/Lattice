<script lang="ts">
	/**
	 * CultivateFlagTable - Table of all feature flags with cultivate/prune controls
	 *
	 * Displays all feature flags in a table format with toggles to enable
	 * (cultivate) or disable (prune) each flag globally.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <CultivateFlagTable
	 *   flags={data.featureFlags}
	 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
	 * />
	 * ```
	 */

	import type { CultivateFlagTableProps } from "./types.js";
	import CultivateFlagRow from "./CultivateFlagRow.svelte";
	import { GlassCard } from "../../ui/index.js";
	import { Sprout, Home } from "lucide-svelte";

	let {
		flags,
		onToggle,
		loadingFlagId,
		class: className = "",
	}: CultivateFlagTableProps = $props();

	// Separate greenhouse-only flags from global flags
	const greenhouseFlags = $derived(flags.filter((f) => f.greenhouseOnly));
	const globalFlags = $derived(flags.filter((f) => !f.greenhouseOnly));

	// Stats
	const cultivatedCount = $derived(flags.filter((f) => f.enabled).length);
	const prunedCount = $derived(flags.length - cultivatedCount);
</script>

{#if flags.length === 0}
	<GlassCard class="text-center py-8 {className}">
		<p class="text-foreground-muted font-sans">No feature flags configured.</p>
		<p class="text-sm text-foreground-muted/70 mt-1 font-sans">
			Add flags to the database to manage them here.
		</p>
	</GlassCard>
{:else}
	<div class={className}>
		<!-- Stats bar -->
		<div class="flex items-center gap-4 mb-4 text-sm text-foreground-muted">
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
				<span>{cultivatedCount} Cultivated</span>
			</span>
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" aria-hidden="true"></span>
				<span>{prunedCount} Pruned</span>
			</span>
		</div>

		<!-- Flags table -->
		<GlassCard class="overflow-hidden p-0">
			<table class="w-full" aria-label="Feature flags">
				<thead>
					<tr
						class="text-left text-sm text-foreground-muted border-b border-border/50"
					>
						<th scope="col" class="py-3 px-4 font-medium">Flag</th>
						<th scope="col" class="py-3 px-4 font-medium">Type</th>
						<th scope="col" class="py-3 px-4 font-medium">Status</th>
						<th scope="col" class="py-3 px-4 font-medium">Toggle</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/30">
					<!-- Greenhouse-only flags first -->
					{#each greenhouseFlags as flag (flag.id)}
						<CultivateFlagRow
							{flag}
							{onToggle}
							loading={loadingFlagId === flag.id}
						/>
					{/each}

					<!-- Then global flags -->
					{#each globalFlags as flag (flag.id)}
						<CultivateFlagRow
							{flag}
							{onToggle}
							loading={loadingFlagId === flag.id}
						/>
					{/each}
				</tbody>
			</table>
		</GlassCard>

		<!-- Legend -->
		<div class="mt-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
			<span class="flex items-center gap-1.5">
				<Sprout class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
				<span>Greenhouse Only</span>
			</span>
			<span class="flex items-center gap-1.5">
				<Home class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
				<span>Global Flag</span>
			</span>
		</div>
	</div>
{/if}
