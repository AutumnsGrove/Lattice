<!--
  ArborSidebarHeader — Logo, brand title, and collapse/close toggles

  Adapts between expanded (logo + title + collapse button) and collapsed
  (logo only + expand button) states. Shows close button on mobile.
  Internal component — not exported to consumers.
-->
<script lang="ts">
	import { Logo } from "../ui";
	import { ChevronLeft, X } from "lucide-svelte";
	import { GroveSwap } from "../ui";
	import { sidebarStore } from "../../stores/sidebar.svelte";
	import type { Snippet } from "svelte";

	interface Props {
		brandTitle: string;
		showLogo: boolean;
		showExpanded: boolean;
		customHeader?: Snippet;
	}

	let { brandTitle, showLogo, showExpanded, customHeader }: Props = $props();

	function closeSidebar() {
		sidebarStore.close();
	}

	function toggleCollapse() {
		sidebarStore.toggleCollapse();
	}
</script>

<div class="arbor-sidebar-header">
	{#if customHeader}
		{@render customHeader()}
	{:else if showExpanded}
		<div class="arbor-sidebar-brand">
			{#if showLogo}
				<Logo class="arbor-sidebar-logo-small" />
			{/if}
			<h2>
				<GroveSwap term="arbor">{brandTitle}</GroveSwap>
				<span class="arbor-admin-label"
					>(<GroveSwap term="arbor" standard="dashboard">admin panel</GroveSwap>)</span
				>
			</h2>
		</div>
	{:else}
		<a href="/arbor" class="arbor-sidebar-logo-link" title="{brandTitle} Dashboard">
			{#if showLogo}
				<Logo class="arbor-sidebar-logo" />
			{/if}
		</a>
	{/if}
	<button
		class="arbor-collapse-btn"
		onclick={toggleCollapse}
		aria-label={sidebarStore.collapsed ? "Expand sidebar" : "Collapse sidebar"}
		title={sidebarStore.collapsed ? "Expand sidebar" : "Collapse sidebar"}
	>
		<ChevronLeft class="arbor-collapse-icon{sidebarStore.collapsed ? ' rotated' : ''}" />
	</button>
	<button class="arbor-close-sidebar" onclick={closeSidebar} aria-label="Close menu">
		<X size={16} />
	</button>
</div>

<style>
	.arbor-sidebar-header {
		padding: 1.25rem;
		border-bottom: 1px solid var(--grove-border-subtle);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
		transition: border-color 0.3s ease;
	}

	.arbor-sidebar-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.arbor-sidebar-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-admin-label {
		font-size: 0.7rem;
		font-weight: 400;
		color: var(--color-text-muted);
		opacity: 0.7;
	}

	:global(.dark) .arbor-admin-label {
		color: var(--grove-text-subtle);
	}

	:global(.arbor-sidebar-logo) {
		width: 2rem;
		height: 2.5rem;
	}

	:global(.arbor-sidebar-logo-small) {
		width: 1.5rem;
		height: 1.875rem;
	}

	.arbor-sidebar-logo-link {
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.arbor-sidebar-logo-link:hover {
		opacity: 0.8;
	}

	.arbor-collapse-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--border-radius-small);
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.arbor-collapse-btn:hover {
		background: var(--overlay-dark-5);
		color: var(--color-text);
	}

	.arbor-collapse-btn:focus-visible {
		outline: 2px solid var(--color-primary, #16a34a);
		outline-offset: 2px;
	}

	:global(.dark) .arbor-collapse-btn:hover {
		background: var(--overlay-light-10);
	}

	:global(.arbor-collapse-icon) {
		width: 1.25rem;
		height: 1.25rem;
		transition: transform 0.3s ease;
	}

	:global(.arbor-collapse-icon.rotated) {
		transform: rotate(180deg);
	}

	/* Close button — hidden on desktop, shown on mobile */
	.arbor-close-sidebar {
		display: none;
		background: none;
		border: none;
		color: var(--color-text);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
		transition: color 0.3s ease;
	}

	.arbor-close-sidebar:focus-visible {
		outline: 2px solid var(--color-primary, #16a34a);
		outline-offset: 2px;
	}

	@media (max-width: 768px) {
		.arbor-close-sidebar {
			display: block;
		}

		.arbor-collapse-btn {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.arbor-sidebar-header {
			transition: none;
		}

		.arbor-collapse-btn {
			transition: none;
		}

		:global(.arbor-collapse-icon) {
			transition: none;
		}

		.arbor-close-sidebar {
			transition: none;
		}
	}
</style>
