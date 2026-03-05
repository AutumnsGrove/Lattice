<script lang="ts">
	import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { getDestinations, services } from "./destinations";
	import LanternFriendCard from "./LanternFriendCard.svelte";
	import LanternAddFriends from "./LanternAddFriends.svelte";
	import type { LanternLayoutData } from "./types";
	import { UserPlus } from "lucide-svelte";

	interface Props {
		data: LanternLayoutData;
	}

	let { data }: Props = $props();

	let panelRef: HTMLDivElement | undefined = $state();

	const panelTitle = $derived(groveModeStore.current ? "Lantern" : "Compass");
	const destinations = $derived(getDestinations(data.homeGrove));
	const activeItems = $derived(
		lanternStore.activeTab === "destinations" ? destinations : services,
	);
	const homeLabel = $derived(
		groveModeStore.current ? "Return to Your Grove" : "Back to My Site",
	);

	// Focus trap: cycle Tab/Shift+Tab within the panel
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Tab" && panelRef) {
			const focusable = panelRef.querySelectorAll<HTMLElement>(
				'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])',
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first?.focus();
			}
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={panelRef}
	class="lantern-panel z-grove-overlay"
	class:has-friends={lanternStore.hasFriends}
	role="dialog"
	aria-modal="true"
	aria-label="{panelTitle} navigation panel"
	inert={!lanternStore.open}
	onkeydown={handleKeydown}
>
	{#if lanternStore.currentView === "add-friends"}
		<LanternAddFriends />
	{:else}
		<div class="panel-content">
			<!-- Header -->
			<div class="panel-header">
				<h2 class="panel-title">{panelTitle}</h2>
				{#if data.displayName}
					<p class="panel-subtitle">{data.displayName}</p>
				{/if}
			</div>

			<!-- Home link — always first and prominent -->
			<a
				href="https://{data.homeGrove}.grove.place"
				class="home-link"
				target="_blank"
				rel="noopener noreferrer"
			>
				{homeLabel}
			</a>

			<!-- Main layout: tabs + list (left), friends (right if present) -->
			<div class="panel-body">
				<!-- Left column: tabs + navigation links -->
				<div class="nav-column">
					<div class="tab-bar" role="tablist">
						<button
							type="button"
							role="tab"
							class="tab-btn"
							class:active={lanternStore.activeTab === "destinations"}
							aria-selected={lanternStore.activeTab === "destinations"}
							onclick={() => lanternStore.setTab("destinations")}
						>
							{groveModeStore.current ? "Destinations" : "Navigation"}
						</button>
						<button
							type="button"
							role="tab"
							class="tab-btn"
							class:active={lanternStore.activeTab === "services"}
							aria-selected={lanternStore.activeTab === "services"}
							onclick={() => lanternStore.setTab("services")}
						>
							Services
						</button>
					</div>

					<nav class="nav-list" aria-label="{lanternStore.activeTab} links">
						{#each activeItems as item (item.href)}
							<a
								href={item.href}
								class="nav-item"
								target={item.external ? "_blank" : undefined}
								rel={item.external ? "noopener noreferrer" : undefined}
							>
								<svelte:component this={item.icon} size={16} strokeWidth={2} />
								<span>{groveModeStore.current && item.groveLabel ? item.groveLabel : item.label}</span>
							</a>
						{/each}
					</nav>
				</div>

				<!-- Right column: friends (only when user has friends) -->
				{#if lanternStore.hasFriends}
					<div class="friends-column">
						<div class="friends-header">
							<h3 class="friends-title">Friends</h3>
							<button
								type="button"
								class="add-friends-btn"
								onclick={() => lanternStore.setView("add-friends")}
								aria-label="Add friends"
							>
								<UserPlus size={14} />
							</button>
						</div>

						<div class="friends-list">
							{#each lanternStore.friends as friend (friend.tenantId)}
								<LanternFriendCard {friend} />
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Add friends CTA when no friends yet (hide while loading) -->
			{#if !lanternStore.hasFriends && lanternStore.friendsLoaded}
				<button
					type="button"
					class="add-friends-cta"
					onclick={() => lanternStore.setView("add-friends")}
				>
					<UserPlus size={16} />
					<span>Add Friends</span>
				</button>
			{/if}

			{#if lanternStore.friendsLoading}
				<p class="loading-text">Loading friends…</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.lantern-panel {
		position: fixed;
		bottom: 4.5rem;
		left: 1rem;
		width: 320px;
		max-height: calc(100vh - 6rem);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.88);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid rgba(255, 255, 255, 0.5);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.08),
			0 2px 8px rgba(0, 0, 0, 0.04);
		overflow: hidden;
		animation: lantern-open 200ms ease both;
	}

	.lantern-panel.has-friends {
		width: 520px;
	}

	.lantern-panel[inert] {
		display: none;
	}

	:global(.dark) .lantern-panel {
		background: rgba(16, 50, 37, 0.88);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow:
			0 8px 32px rgba(0, 0, 0, 0.3),
			0 2px 8px rgba(0, 0, 0, 0.15);
	}

	@keyframes lantern-open {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lantern-panel {
			animation: none;
		}
	}

	.panel-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
	}

	.panel-header {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.panel-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.panel-subtitle {
		font-size: 0.8125rem;
		color: var(--color-text-muted);
		margin: 0;
	}

	.home-link {
		display: block;
		padding: 0.625rem 0.75rem;
		border-radius: 10px;
		background: var(--color-primary, #2c5f2d);
		color: white;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		text-align: center;
		transition: background-color 0.15s ease;
	}

	.home-link:hover {
		background: var(--color-primary-hover, #245024);
	}

	:global(.dark) .home-link {
		background: var(--accent-success, #22c55e);
		color: var(--bark-950, #0a1f0d);
	}

	:global(.dark) .home-link:hover {
		background: var(--grove-400, #4ade80);
	}

	.panel-body {
		display: flex;
		gap: 0.75rem;
		min-height: 0;
	}

	.nav-column {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.friends-column {
		width: 180px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-left: 1px solid var(--color-border);
		padding-left: 0.75rem;
		animation: column-slide-in 300ms ease-in-out both;
	}

	@keyframes column-slide-in {
		from {
			opacity: 0;
			transform: translateX(-8px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.friends-column {
			animation: none;
		}
	}

	.friends-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.friends-title {
		font-size: 0.8125rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
	}

	.add-friends-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		border-radius: 6px;
		border: none;
		background: none;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	.add-friends-btn:hover {
		color: var(--color-primary, #2c5f2d);
		background: rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .add-friends-btn:hover {
		color: var(--accent-success);
		background: rgba(255, 255, 255, 0.08);
	}

	.friends-list {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		max-height: 240px;
	}

	.tab-bar {
		display: flex;
		gap: 0.25rem;
		padding: 0.25rem;
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.04);
	}

	:global(.dark) .tab-bar {
		background: rgba(255, 255, 255, 0.06);
	}

	.tab-btn {
		flex: 1;
		padding: 0.375rem 0.5rem;
		border: none;
		border-radius: 6px;
		background: none;
		color: var(--color-text-muted);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	.tab-btn.active {
		background: white;
		color: var(--color-text);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
	}

	:global(.dark) .tab-btn.active {
		background: rgba(255, 255, 255, 0.12);
		color: var(--accent-success);
	}

	.nav-list {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 8px;
		color: var(--color-text);
		text-decoration: none;
		font-size: 0.875rem;
		transition: background-color 0.15s ease;
	}

	.nav-item:hover {
		background: rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .nav-item:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.add-friends-cta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px dashed var(--color-border);
		background: none;
		color: var(--color-text-muted);
		font-size: 0.8125rem;
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.add-friends-cta:hover {
		color: var(--color-primary, #2c5f2d);
		border-color: var(--color-primary, #2c5f2d);
	}

	:global(.dark) .add-friends-cta:hover {
		color: var(--accent-success);
		border-color: var(--accent-success);
	}

	.loading-text {
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.8125rem;
		padding: 0.5rem 0;
		margin: 0;
	}

	/* Responsive: collapse to single column on narrow screens */
	@media (max-width: 560px) {
		.lantern-panel,
		.lantern-panel.has-friends {
			width: calc(100vw - 2rem);
			max-width: 400px;
		}

		.panel-body {
			flex-direction: column;
		}

		.friends-column {
			width: 100%;
			border-left: none;
			border-top: 1px solid var(--color-border);
			padding-left: 0;
			padding-top: 0.75rem;
		}
	}
</style>
