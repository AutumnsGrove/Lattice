<script lang="ts">
	/**
	 * GraftControlPanel - Self-serve graft controls for greenhouse tenants
	 *
	 * A delightful UI where greenhouse members can toggle experimental features
	 * on or off for their own site. This is the tenant-facing interface for
	 * managing grafts - visual, intuitive, and warm.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GraftControlPanel
	 *   grafts={data.tenantGrafts}
	 *   currentValues={data.grafts}
	 *   onToggle={(id, enabled) => handleToggle(id, enabled)}
	 *   onReset={() => handleReset()}
	 * />
	 * ```
	 */

	import type { GraftControlPanelProps } from "./types.js";
	import GraftToggleRow from "./GraftToggleRow.svelte";
	import { GlassCard, Button, Waystone } from "$lib/ui";
	import { Sprout, RotateCcw, Sparkles, FlaskConical, Leaf } from "lucide-svelte";

	let {
		grafts,
		currentValues,
		onToggle,
		onReset,
		loadingGraftId,
		resetting = false,
		class: className = "",
	}: GraftControlPanelProps = $props();

	// Count enabled grafts
	const enabledCount = $derived(grafts.filter((g) => g.enabled).length);
	const hasOverrides = $derived(grafts.some((g) => g.hasOverride));

	// Group grafts by category
	const experimentalGrafts = $derived(
		grafts.filter((g) => g.category === "experimental"),
	);
	const betaGrafts = $derived(grafts.filter((g) => g.category === "beta"));
	const stableGrafts = $derived(grafts.filter((g) => g.category === "stable"));
</script>

{#if grafts.length === 0}
	<GlassCard variant="frosted" class="graft-panel {className}">
		<div class="empty-state">
			<div class="empty-icon">
				<Sparkles class="icon" />
			</div>
			<h3>No experimental features available</h3>
			<p>
				Check back soon! New features are always growing in the greenhouse.
			</p>
		</div>
	</GlassCard>
{:else}
	<GlassCard variant="frosted" class="graft-panel {className}">
		<!-- Header -->
		<div class="panel-header">
			<div class="header-content">
				<div class="header-icon">
					<Sprout class="icon" />
				</div>
				<div class="header-text">
					<h2>
						Your Experimental Features
						<Waystone
							slug="greenhouse-features"
							label="Learn about experimental features"
						/>
					</h2>
					<p class="subtitle">
						Toggle features on or off for your site. These are greenhouse-only
						experiments!
					</p>
				</div>
			</div>

			<!-- Stats -->
			<div class="stats">
				<span class="stat enabled">
					<span class="stat-icon"><Sprout size={20} /></span>
					<span class="stat-value">{enabledCount}</span>
					<span class="stat-label">Enabled</span>
				</span>
				<span class="stat total">
					<span class="stat-icon"><Leaf size={20} /></span>
					<span class="stat-value">{grafts.length}</span>
					<span class="stat-label">Available</span>
				</span>
			</div>
		</div>

		<!-- Graft List -->
		<div class="graft-list">
			{#if experimentalGrafts.length > 0}
				<div class="graft-section">
					<div class="section-header">
						<FlaskConical class="section-icon" />
						<span>Experimental</span>
					</div>
					{#each experimentalGrafts as graft (graft.id)}
						<GraftToggleRow
							{graft}
							{onToggle}
							loading={loadingGraftId === graft.id}
						/>
					{/each}
				</div>
			{/if}

			{#if betaGrafts.length > 0}
				<div class="graft-section">
					<div class="section-header">
						<Sparkles class="section-icon" />
						<span>Beta</span>
					</div>
					{#each betaGrafts as graft (graft.id)}
						<GraftToggleRow
							{graft}
							{onToggle}
							loading={loadingGraftId === graft.id}
						/>
					{/each}
				</div>
			{/if}

			{#if stableGrafts.length > 0}
				<div class="graft-section">
					<div class="section-header">
						<Sprout class="section-icon" />
						<span>Stable</span>
					</div>
					{#each stableGrafts as graft (graft.id)}
						<GraftToggleRow
							{graft}
							{onToggle}
							loading={loadingGraftId === graft.id}
						/>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		{#if hasOverrides}
			<div class="panel-footer">
				<p class="override-notice">
					<span class="override-dot"></span>
					You have custom preferences. Reset to use default settings.
				</p>
				<Button
					variant="secondary"
					size="sm"
					onclick={onReset}
					disabled={resetting}
				>
					<RotateCcw class="btn-icon" />
					{resetting ? "Resetting..." : "Reset to Defaults"}
				</Button>
			</div>
		{/if}
	</GlassCard>
{/if}

<style>
	.graft-panel {
		/* Handled by GlassCard */
	}

	.panel-header {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 1rem;
	}

	@media (min-width: 640px) {
		.panel-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: flex-start;
		}
	}

	.header-content {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.header-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--border-radius-standard);
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-primary);
		flex-shrink: 0;
	}

	:global(.header-icon .icon) {
		width: 24px;
		height: 24px;
	}

	.header-text h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.25rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
	}

	.stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.125rem;
	}

	.stat-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
	}

	.stat.enabled .stat-icon {
		color: var(--color-primary);
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-text);
		line-height: 1;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat.enabled .stat-value {
		color: var(--color-primary);
	}

	/* Graft sections */
	.graft-list {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.graft-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0 0.5rem;
	}

	:global(.section-header .section-icon) {
		width: 14px;
		height: 14px;
		opacity: 0.7;
	}

	/* Footer */
	.panel-footer {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		align-items: flex-start;
		padding-top: 1rem;
		margin-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	@media (min-width: 480px) {
		.panel-footer {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.override-notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.override-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-primary);
	}

	:global(.panel-footer .btn-icon) {
		width: 14px;
		height: 14px;
		margin-right: 0.375rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 2rem 1rem;
	}

	.empty-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--grove-overlay-10);
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}

	:global(.empty-icon .icon) {
		width: 32px;
		height: 32px;
	}

	.empty-state h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		color: var(--color-text);
	}

	.empty-state p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-text-muted);
		max-width: 280px;
	}
</style>
