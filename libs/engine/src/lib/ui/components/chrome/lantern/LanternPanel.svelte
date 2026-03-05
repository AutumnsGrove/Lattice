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
	const activeItems = $derived(lanternStore.activeTab === "destinations" ? destinations : services);
	const homeLabel = $derived(groveModeStore.current ? "Return to Your Grove" : "Back to My Site");

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

<div
	bind:this={panelRef}
	class="lantern-panel z-grove-overlay bg-surface/90 backdrop-blur-xl border border-default shadow-lg"
	class:has-friends={lanternStore.hasFriends}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	aria-label="{panelTitle} navigation panel"
	inert={!lanternStore.open}
	onkeydown={handleKeydown}
>
	{#if lanternStore.currentView === "add-friends"}
		<LanternAddFriends />
	{:else}
		<div class="panel-content">
			<!-- Header -->
			<div class="flex flex-col gap-0.5">
				<h2 class="text-base font-semibold text-foreground m-0">{panelTitle}</h2>
				{#if data.displayName}
					<p class="text-[0.8125rem] text-foreground-muted m-0">{data.displayName}</p>
				{/if}
			</div>

			<!-- Home link — always first and prominent -->
			<a
				href="https://{data.homeGrove}.grove.place"
				class="home-link block py-2.5 px-3 rounded-[10px] bg-accent text-accent-foreground text-sm font-medium no-underline text-center transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
				target="_blank"
				rel="noopener noreferrer"
			>
				{homeLabel}
			</a>

			<!-- Main layout: tabs + list (left), friends (right if present) -->
			<div class="panel-body">
				<!-- Left column: tabs + navigation links -->
				<div class="nav-column">
					<div class="tab-bar bg-surface-hover/50 rounded-lg p-1 flex gap-1" role="tablist">
						<button
							type="button"
							role="tab"
							id="lantern-tab-destinations"
							class="tab-btn flex-1 py-1.5 px-2 border-none rounded-md text-foreground-muted text-[0.8125rem] font-medium cursor-pointer transition-colors
								{lanternStore.activeTab === 'destinations' ? 'bg-surface-elevated text-foreground shadow-sm' : ''}
								focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
							aria-selected={lanternStore.activeTab === "destinations"}
							aria-controls="lantern-tabpanel"
							tabindex={lanternStore.activeTab === "destinations" ? 0 : -1}
							onclick={() => lanternStore.setTab("destinations")}
						>
							{groveModeStore.current ? "Destinations" : "Navigation"}
						</button>
						<button
							type="button"
							role="tab"
							id="lantern-tab-services"
							class="tab-btn flex-1 py-1.5 px-2 border-none rounded-md text-foreground-muted text-[0.8125rem] font-medium cursor-pointer transition-colors
								{lanternStore.activeTab === 'services' ? 'bg-surface-elevated text-foreground shadow-sm' : ''}
								focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
							aria-selected={lanternStore.activeTab === "services"}
							aria-controls="lantern-tabpanel"
							tabindex={lanternStore.activeTab === "services" ? 0 : -1}
							onclick={() => lanternStore.setTab("services")}
						>
							Services
						</button>
					</div>

					<div
						class="nav-list flex flex-col gap-0.5"
						id="lantern-tabpanel"
						role="tabpanel"
						aria-labelledby="lantern-tab-{lanternStore.activeTab}"
						aria-label="{lanternStore.activeTab} links"
					>
						{#each activeItems as item (item.href)}
							{@const Icon = item.icon}
							<a
								href={item.href}
								class="nav-item flex items-center gap-2 py-2 px-2.5 rounded-lg text-foreground no-underline text-sm transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
								target={item.external ? "_blank" : undefined}
								rel={item.external ? "noopener noreferrer" : undefined}
							>
								<Icon size={16} strokeWidth={2} />
								<span
									>{groveModeStore.current && item.groveLabel ? item.groveLabel : item.label}</span
								>
							</a>
						{/each}
					</div>
				</div>

				<!-- Right column: friends (only when user has friends) -->
				{#if lanternStore.hasFriends}
					<div class="friends-column border-l border-default pl-3">
						<div class="flex items-center justify-between">
							<h3 class="text-[0.8125rem] font-semibold text-foreground m-0">Friends</h3>
							<button
								type="button"
								class="add-friends-btn flex items-center justify-center min-w-[44px] min-h-[44px] -m-[9px] rounded-md border-none bg-transparent text-foreground-muted cursor-pointer transition-colors hover:text-accent-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
								onclick={() => lanternStore.setView("add-friends")}
								aria-label="Add friends"
							>
								<UserPlus size={14} />
							</button>
						</div>

						<div class="friends-list flex-1 overflow-y-auto flex flex-col gap-0.5 max-h-60">
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
					class="add-friends-cta flex items-center justify-center gap-2 py-2 px-2 rounded-lg border border-dashed border-default bg-transparent text-foreground-muted text-[0.8125rem] cursor-pointer transition-colors hover:text-accent-muted hover:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
					onclick={() => lanternStore.setView("add-friends")}
				>
					<UserPlus size={16} />
					<span>Add Friends</span>
				</button>
			{/if}

			{#if lanternStore.friendsLoading}
				<p
					class="text-center text-foreground-muted text-[0.8125rem] py-2 m-0"
					role="status"
					aria-live="polite"
				>
					Loading friends…
				</p>
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
		overflow: hidden;
		animation: lantern-open 200ms ease both;
	}

	.lantern-panel.has-friends {
		width: 520px;
	}

	.lantern-panel[inert] {
		display: none;
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

	.panel-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
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
		.lantern-panel {
			animation: none;
		}

		.friends-column {
			animation: none;
		}
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
			border-top: 1px solid hsl(var(--border));
			padding-left: 0;
			padding-top: 0.75rem;
		}
	}
</style>
