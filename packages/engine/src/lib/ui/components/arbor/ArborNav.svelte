<!--
  ArborNav — Sidebar navigation list

  Renders nav items and dividers. Handles active state highlighting,
  activity dots, Grove Mode term resolution, and visibility gating.
  Internal component — not exported to consumers.
-->
<script lang="ts">
	import { page } from "$app/state";
	import { GroveDivider } from "../nature";
	import { resolveTerm } from "../../utils/grove-term-resolve";
	import { sidebarStore } from "../../stores/sidebar.svelte";
	import type { ArborNavEntry } from "./types";

	interface Props {
		items: ArborNavEntry[];
		showExpanded: boolean;
		userPermissions?: string[];
		navLabel?: string;
	}

	let { items, showExpanded, userPermissions, navLabel = "Sidebar navigation" }: Props = $props();

	/** Returns true when the user has all permissions required by the item */
	function hasPermissions(required?: string[]): boolean {
		if (!required || required.length === 0) return true;
		if (!userPermissions) return false;
		return required.every((p) => userPermissions!.includes(p));
	}

	let currentPath = $derived(page.url.pathname);

	function isActive(href: string): boolean {
		if (href.endsWith("/arbor") || href === "/arbor") {
			return currentPath === href;
		}
		return currentPath.startsWith(href);
	}

	function closeSidebar() {
		sidebarStore.close();
	}

	function resolveLabel(item: { label: string; termSlug?: string }): string {
		if (item.termSlug) {
			return resolveTerm(item.termSlug);
		}
		return item.label;
	}
</script>

<nav class="arbor-nav" aria-label={navLabel}>
	{#each items as entry}
		{#if entry.kind === "divider"}
			<div class="arbor-divider" class:has-label={!!entry.label}>
				{#if entry.label && showExpanded}
					<span class="arbor-divider-label">{entry.label}</span>
				{/if}
				{#if entry.style === "grove"}
					<div class="arbor-divider-grove">
						<GroveDivider size="xs" count={3} />
					</div>
				{:else if entry.style && entry.style !== "line"}
					<span class="arbor-divider-char" aria-hidden="true"
						>{entry.style}{entry.style}{entry.style}</span
					>
				{:else}
					<hr class="arbor-divider-line" />
				{/if}
			</div>
		{:else if entry.visible !== false && hasPermissions(entry.requiredPermissions)}
			{@const active = isActive(entry.href)}
			<a
				href={entry.href}
				class="arbor-nav-item"
				class:active
				onclick={closeSidebar}
				title={resolveLabel(entry)}
				aria-current={active ? "page" : undefined}
			>
				{#if entry.icon}
					{@const Icon = entry.icon}
					{#if entry.badge && entry.badge > 0}
						<span class="arbor-nav-icon-wrap" aria-live="polite">
							<Icon class="arbor-nav-icon" />
							<span class="arbor-activity-dot" aria-label="{entry.badge} pending"></span>
						</span>
					{:else if entry.showActivity}
						<span class="arbor-nav-icon-wrap" aria-live="polite">
							<Icon class="arbor-nav-icon" />
							<span class="arbor-activity-dot" aria-label="Activity"></span>
						</span>
					{:else}
						<Icon class="arbor-nav-icon" />
					{/if}
				{/if}
				<span class="arbor-nav-label" class:hidden={!showExpanded}>{resolveLabel(entry)}</span>
			</a>
		{/if}
	{/each}
</nav>

<style>
	.arbor-nav {
		flex: 1;
		padding: 1rem 0;
		overflow-y: auto;
		min-height: 0;
	}

	.arbor-nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		color: var(--color-text-muted);
		text-decoration: none;
		border-radius: var(--border-radius-button);
		transition:
			background 0.2s,
			color 0.2s;
		margin: 0.125rem 0.5rem;
	}

	.arbor-nav-item:hover {
		background: var(--grove-overlay-12);
		color: var(--user-accent, var(--color-primary));
	}

	.arbor-nav-item:focus-visible {
		outline: 2px solid var(--user-accent, var(--color-primary, #16a34a));
		outline-offset: 2px;
	}

	.arbor-nav-item.active {
		background: var(--grove-overlay-15);
		color: var(--user-accent, var(--color-primary));
		font-weight: 500;
	}

	:global(.dark) .arbor-nav-item:hover {
		background: var(--grove-overlay-12);
		color: var(--grove-300, #86efac);
	}

	:global(.dark) .arbor-nav-item.active {
		background: var(--grove-overlay-15);
		color: var(--grove-300, #86efac);
	}

	:global(.dark) .arbor-nav-item {
		color: var(--grove-text-strong);
	}

	.arbor-nav-item :global(.arbor-nav-icon) {
		width: 1.25rem;
		height: 1.25rem;
		flex-shrink: 0;
	}

	.arbor-nav-icon-wrap {
		position: relative;
		display: inline-flex;
		flex-shrink: 0;
	}

	.arbor-activity-dot {
		position: absolute;
		top: -2px;
		right: -3px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--user-accent, var(--color-primary, #2c5f2d));
		opacity: 0.75;
		animation: arbor-dot-breathe 3s ease-in-out infinite;
	}

	:global(.dark) .arbor-activity-dot {
		background: var(--grove-300, #86efac);
		opacity: 0.65;
	}

	@keyframes arbor-dot-breathe {
		0%,
		100% {
			opacity: 0.55;
			transform: scale(1);
		}
		50% {
			opacity: 0.85;
			transform: scale(1.15);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.arbor-activity-dot {
			animation: none;
			opacity: 0.7;
		}
	}

	.arbor-nav-label {
		white-space: nowrap;
		overflow: hidden;
	}

	.hidden {
		display: none;
	}

	/* Dividers */
	.arbor-divider {
		padding: 0.5rem 1rem;
	}

	.arbor-divider-label {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-muted);
		padding: 0 0.25rem;
		margin-bottom: 0.25rem;
	}

	:global(.dark) .arbor-divider-label {
		color: var(--grove-text-muted);
	}

	.arbor-divider-line {
		border: none;
		border-top: 1px solid var(--grove-border-subtle);
		margin: 0;
	}

	.arbor-divider-char {
		display: block;
		text-align: center;
		color: var(--color-text-muted);
		opacity: 0.4;
		font-size: 0.75rem;
		letter-spacing: 0.25em;
	}

	.arbor-divider-grove {
		display: flex;
		justify-content: center;
		padding: 0.125rem 0;
	}
</style>
