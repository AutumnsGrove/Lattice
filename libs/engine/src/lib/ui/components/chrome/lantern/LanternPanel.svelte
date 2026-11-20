<script lang="ts">
	import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { friendsStore } from "$lib/ui/stores/friends.svelte";
	import { wandererStore, getArborHref, buildGroveHref } from "$lib/ui/stores/wanderer.svelte";
	import { getDestinations, getServices } from "./destinations";
	import LanternFriendCard from "./LanternFriendCard.svelte";
	import LanternAddFriends from "./LanternAddFriends.svelte";
	import LanternVisitingCard from "./LanternVisitingCard.svelte";
	import LanternTermHelp from "./LanternTermHelp.svelte";
	import type { LanternLayoutData } from "./types";
	import { authIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import { api } from "$lib/utils/api";

	interface Props {
		data: LanternLayoutData;
	}

	let { data }: Props = $props();

	let panelRef: HTMLDivElement | undefined = $state();

	const panelTitle = $derived(groveModeStore.current ? "Lantern" : "Compass");
	const destinations = $derived(getDestinations(data.homeGrove));
	// Services list is home-aware: when the user is visiting someone else's
	// grove, the Admin link resolves to their own arbor instead of the
	// visited grove's admin panel.
	const services = $derived(getServices(data.homeGrove, wandererStore.currentGrove));
	// Settings cog at the top of the panel uses the same rule.
	const settingsHref = $derived(
		getArborHref(data.homeGrove, wandererStore.currentGrove),
	);
	const activeItems = $derived(lanternStore.activeTab === "destinations" ? destinations : services);
	const homeLabel = $derived(groveModeStore.current ? "Return to Your Grove" : "Back to My Site");

	/** The grove the user is visiting (not their own), if any.
	 *  Uses wandererStore for reliable home-vs-visiting detection (#1524). */
	const visiting = $derived(
		wandererStore.isVisiting ? data.visitingGrove : null,
	);
	/** Whether the user already follows the visited grove */
	const alreadyFollowing = $derived(
		visiting ? friendsStore.isFriend(visiting.tenantId) : false,
	);

	// Local dev only — switch which seeded tenant's owner the demo session
	// acts as (independent of which grove is being viewed). See
	// apps/aspen/src/routes/api/dev/demo-identity/+server.ts.
	let switchingIdentity = $state(false);
	async function switchIdentity(tenantId: string) {
		if (switchingIdentity || tenantId === data.demoIdentities?.current) return;
		switchingIdentity = true;
		try {
			await api.post("/api/dev/demo-identity", { tenantId });
			location.reload();
		} catch {
			switchingIdentity = false;
		}
	}

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
	class:has-friends={friendsStore.hasFriends}
	class:has-demo-identities={!!data.demoIdentities}
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
			<div class="flex items-start justify-between">
				<div class="flex flex-col gap-0.5">
					<h2 class="text-base font-semibold text-foreground m-0">{panelTitle}</h2>
					{#if data.displayName}
						<p class="text-[0.8125rem] text-foreground-muted m-0">{data.displayName}</p>
					{/if}
				</div>
				<a
					href={settingsHref}
					class="flex items-center justify-center min-w-[36px] min-h-[36px] -m-1 rounded-md text-foreground-muted transition-colors hover:text-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
					aria-label="Open settings"
				>
					<actionIcons.settings size={16} strokeWidth={2} />
				</a>
			</div>

			<!-- Home link — always first and prominent (hidden if no home grove resolved) -->
			{#if data.homeGrove}
				<a
					href={buildGroveHref(data.homeGrove)}
					class="home-link block py-2.5 px-3 rounded-[10px] bg-accent text-accent-foreground text-sm font-medium no-underline text-center transition-colors hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
				>
					{homeLabel}
				</a>
			{/if}

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
							<div class="nav-row flex items-center gap-1">
								<a
									href={item.href}
									class="nav-item flex flex-1 min-w-0 items-center gap-2 py-2 px-2.5 rounded-lg text-foreground no-underline text-sm transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
									target={item.external ? "_blank" : undefined}
									rel={item.external ? "noopener noreferrer" : undefined}
								>
									<Icon size={16} strokeWidth={2} />
									<span
										>{groveModeStore.current && item.groveLabel
											? item.groveLabel
											: item.label}</span
									>
								</a>
								<!-- A Grove term gets a "?" beside it. It sits next to the link, not inside it,
								     so clicking the link still navigates. Standard terms need no explaining. -->
								{#if groveModeStore.current && item.termSlug}
									<LanternTermHelp slug={item.termSlug} />
								{/if}
							</div>
						{/each}
					</div>
				</div>

				<!-- Right column: friends (only when user has friends) -->
				{#if friendsStore.hasFriends}
					<div class="friends-column border-l border-default pl-3">
						<div class="flex items-center justify-between">
							<h3 class="text-[0.8125rem] font-semibold text-foreground m-0">Friends</h3>
							<button
								type="button"
								class="add-friends-btn flex items-center justify-center min-w-[44px] min-h-[44px] -m-[9px] rounded-md border-none bg-transparent text-foreground-muted cursor-pointer transition-colors hover:text-accent-muted hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
								onclick={() => lanternStore.setView("add-friends")}
								aria-label="Add friends"
							>
								<authIcons.userPlus size={14} />
							</button>
						</div>

						{#if visiting && !alreadyFollowing}
							<LanternVisitingCard grove={visiting} />
						{/if}

						<div class="friends-list flex-1 overflow-y-auto flex flex-col gap-0.5 max-h-60">
							{#each friendsStore.friends as friend (friend.tenantId)}
								<LanternFriendCard {friend} visiting={visiting?.tenantId === friend.tenantId} />
							{/each}
						</div>
					</div>
				{/if}

				<!-- Local dev only: switch which seeded tenant's owner the demo
				     session acts as, independent of which grove is being viewed. -->
				{#if data.demoIdentities}
					<div class="identity-column border-l border-default pl-3">
						<h3 class="text-[0.8125rem] font-semibold text-foreground m-0">Demo Identity</h3>
						<div class="identity-list flex flex-col gap-0.5">
							{#each data.demoIdentities.options as identity (identity.tenantId)}
								<button
									type="button"
									class="identity-btn flex flex-col items-start gap-0.5 py-2 px-2.5 rounded-lg border-none bg-transparent text-left cursor-pointer transition-colors hover:bg-surface-hover disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
									class:active={identity.tenantId === data.demoIdentities.current}
									disabled={switchingIdentity}
									onclick={() => switchIdentity(identity.tenantId)}
									aria-pressed={identity.tenantId === data.demoIdentities.current}
								>
									<span class="text-sm font-medium text-foreground truncate w-full"
										>{identity.displayName}</span
									>
									<span class="text-xs text-foreground-muted truncate w-full"
										>{identity.subdomain}</span
									>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Visiting grove prompt when no friends yet -->
			{#if visiting && !alreadyFollowing && !friendsStore.hasFriends && friendsStore.loaded}
				<LanternVisitingCard grove={visiting} />
			{/if}

			<!-- Add friends CTA when no friends yet (hide while loading) -->
			{#if !friendsStore.hasFriends && friendsStore.loaded}
				<button
					type="button"
					class="add-friends-cta flex items-center justify-center gap-2 py-2 px-2 rounded-lg border border-dashed border-default bg-transparent text-foreground-muted text-[0.8125rem] cursor-pointer transition-colors hover:text-accent-muted hover:border-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
					onclick={() => lanternStore.setView("add-friends")}
				>
					<authIcons.userPlus size={16} />
					<span>Add Friends</span>
				</button>
			{/if}

			{#if friendsStore.loading}
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
		right: 1rem;
		width: 320px;
		max-height: calc(100vh - 6rem);
		border-radius: 16px;
		overflow: hidden;
		animation: lantern-open 200ms ease both;
	}

	.lantern-panel.has-friends {
		width: 520px;
	}

	.lantern-panel.has-demo-identities {
		width: 480px;
	}

	.lantern-panel.has-friends.has-demo-identities {
		width: 680px;
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

	.identity-column {
		width: 140px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		animation: column-slide-in 300ms ease-in-out both;
	}

	.identity-btn.active {
		background: var(--grove-accent-8);
		border: 1px solid var(--grove-accent-20);
		position: relative;
	}

	.identity-btn.active::before {
		content: "";
		position: absolute;
		left: 0;
		top: 25%;
		bottom: 25%;
		width: 3px;
		border-radius: 0 2px 2px 0;
		background: var(--grove-accent);
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
		.lantern-panel.has-friends,
		.lantern-panel.has-demo-identities,
		.lantern-panel.has-friends.has-demo-identities {
			width: calc(100vw - 2rem);
			max-width: 400px;
		}

		.panel-body {
			flex-direction: column;
		}

		.friends-column,
		.identity-column {
			width: 100%;
			border-left: none;
			border-top: 1px solid hsl(var(--border));
			padding-left: 0;
			padding-top: 0.75rem;
		}
	}
</style>
