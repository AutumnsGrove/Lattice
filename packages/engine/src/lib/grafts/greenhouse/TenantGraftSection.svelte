<script lang="ts">
	/**
	 * TenantGraftSection - Graft override controls for a single tenant
	 *
	 * Shows all greenhouse-only grafts with per-tenant override toggles.
	 * Only rendered when the tenant is enrolled in the greenhouse program.
	 * Used on the tenant detail admin page.
	 */

	import type { TenantGraftSectionProps } from "./types.js";
	import { GlassCard } from "../../ui/index.js";
	import GraftToggleRow from "./GraftToggleRow.svelte";
	import { Settings, RotateCcw } from "lucide-svelte";

	let {
		grafts,
		onToggle,
		onReset,
		loadingGraftId,
		resetting = false,
		class: className = "",
	}: TenantGraftSectionProps = $props();

	let confirmReset = $state(false);

	function handleReset() {
		if (!confirmReset) {
			confirmReset = true;
			return;
		}
		onReset();
		confirmReset = false;
	}

	const overrideCount = $derived(grafts.filter((g) => g.hasOverride).length);
</script>

<GlassCard class="p-6 {className}">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-2">
			<Settings class="w-5 h-5 text-foreground-muted" aria-hidden="true" />
			<h3 class="text-lg font-serif text-foreground">Graft Overrides</h3>
		</div>

		{#if overrideCount > 0}
			<div class="flex items-center gap-2">
				<span class="text-xs font-sans text-foreground-muted">
					{overrideCount} override{overrideCount !== 1 ? "s" : ""}
				</span>
				<button
					type="button"
					onclick={handleReset}
					disabled={resetting}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-lg transition-colors disabled:opacity-50 {confirmReset
						? 'bg-amber-600 text-white hover:bg-amber-700'
						: 'text-foreground-muted hover:bg-grove-100 dark:hover:bg-cream-100/10'}"
				>
					<RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
					{#if confirmReset}
						Confirm Reset
					{:else}
						Reset All
					{/if}
				</button>
				{#if confirmReset}
					<button
						type="button"
						onclick={() => (confirmReset = false)}
						class="text-xs font-sans text-foreground-muted hover:text-foreground"
					>
						Cancel
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if grafts.length === 0}
		<p class="text-sm font-sans text-foreground-muted">
			No controllable grafts available. Greenhouse-only flags must be cultivated (enabled
			globally) before they appear here.
		</p>
	{:else}
		<p class="text-sm font-sans text-foreground-muted mb-4">
			Override experimental features for this tenant. Changes take effect immediately.
		</p>
		<div class="space-y-2">
			{#each grafts as graft (graft.id)}
				<GraftToggleRow
					{graft}
					{onToggle}
					loading={loadingGraftId === graft.id || resetting}
				/>
			{/each}
		</div>
	{/if}
</GlassCard>
