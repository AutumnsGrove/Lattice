<script lang="ts">
	/**
	 * GraftToggleRow - Individual graft toggle for tenant self-serve
	 *
	 * Displays a single graft with its name, description, and toggle switch.
	 * Uses warm, nature-themed visual language with sprout/leaf indicators.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GraftToggleRow
	 *   graft={graftInfo}
	 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
	 * />
	 * ```
	 */

	import type { GraftToggleRowProps } from "./types.js";
	import GreenhouseToggle from "./GreenhouseToggle.svelte";
	import { Sprout, Leaf } from "lucide-svelte";

	let {
		graft,
		onToggle,
		loading = false,
		class: className = "",
	}: GraftToggleRowProps = $props();

	// Format graft ID for display if no name provided
	const displayName = $derived(
		graft.name ||
			graft.id
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" "),
	);

	// Determine status for screen readers
	const statusLabel = $derived(graft.enabled ? "Enabled" : "Disabled");
</script>

<div class="graft-row {className}" class:has-override={graft.hasOverride}>
	<!-- Icon and content -->
	<div class="graft-content">
		<div class="graft-icon" class:enabled={graft.enabled}>
			{#if graft.enabled}
				<Sprout size={18} />
			{:else}
				<Leaf size={18} />
			{/if}
		</div>

		<div class="graft-info">
			<div class="graft-header">
				<span class="graft-name">{displayName}</span>
				{#if graft.hasOverride}
					<span class="override-badge" title="Custom preference">Modified</span>
				{/if}
			</div>
			{#if graft.description}
				<p class="graft-description">{graft.description}</p>
			{/if}
		</div>
	</div>

	<!-- Toggle -->
	<div class="graft-toggle">
		<span class="sr-only">{displayName}: {statusLabel}</span>
		<GreenhouseToggle
			enabled={graft.enabled}
			tenantId={graft.id}
			disabled={loading}
			onToggle={(id, enabled) => onToggle(id, enabled)}
		/>
	</div>
</div>

<style>
	.graft-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 1rem;
		background: var(--grove-overlay-5);
		border-radius: var(--border-radius-standard);
		transition:
			background 0.15s ease,
			box-shadow 0.15s ease;
	}

	.graft-row:hover {
		background: var(--grove-overlay-10);
	}

	.graft-row.has-override {
		border-left: 3px solid var(--color-primary);
		padding-left: calc(1rem - 3px);
	}

	.graft-content {
		display: flex;
		align-items: flex-start;
		gap: 0.875rem;
		flex: 1;
		min-width: 0;
	}

	.graft-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border-radius: var(--border-radius-button);
		background: var(--grove-overlay-10);
		color: var(--color-text-muted);
		transition: all 0.2s ease;
	}

	.graft-icon.enabled {
		background: rgba(16, 185, 129, 0.15);
		color: var(--color-primary);
	}

	.graft-info {
		flex: 1;
		min-width: 0;
	}

	.graft-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.graft-name {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text);
	}

	.override-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.5rem;
		font-size: 0.7rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--color-primary);
		background: rgba(16, 185, 129, 0.1);
		border-radius: 9999px;
	}

	.graft-description {
		margin: 0.25rem 0 0 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	.graft-toggle {
		flex-shrink: 0;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Mobile adjustments */
	@media (max-width: 480px) {
		.graft-row {
			flex-wrap: wrap;
			gap: 0.75rem;
		}

		.graft-toggle {
			margin-left: auto;
		}
	}
</style>
