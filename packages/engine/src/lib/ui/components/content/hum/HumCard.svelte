<script lang="ts">
	import type { HumMetadata, HumProvider } from "./types.js";
	import { getProviderInfo } from "./providers.js";
	import HumProviderBadge from "./HumProviderBadge.svelte";
	import HumCardSkeleton from "./HumCardSkeleton.svelte";
	import HumCardFallback from "./HumCardFallback.svelte";
	import HumPlatformTray from "./HumPlatformTray.svelte";

	interface Props {
		/** The music URL to resolve */
		url: string;
		/** Provider hint (from markdown plugin detection) */
		provider?: HumProvider;
		/** Pre-resolved metadata (skip API call) */
		metadata?: HumMetadata;
		class?: string;
	}

	let {
		url,
		provider = "unknown",
		metadata: initialMetadata,
		class: className = "",
	}: Props = $props();

	let meta = $state<HumMetadata | null>(initialMetadata ?? null);
	let loading = $state(!initialMetadata);
	let error = $state(false);
	let trayOpen = $state(false);

	const info = $derived(getProviderInfo(meta?.provider ?? provider));
	const hasPlatformLinks = $derived(
		meta?.platformLinks && Object.keys(meta.platformLinks).length > 1,
	);

	$effect(() => {
		if (initialMetadata || !url) return;

		let cancelled = false;
		loading = true;
		error = false;

		(async () => {
			try {
				const res = await fetch(
					`/api/hum/resolve?url=${encodeURIComponent(url)}`,
				); // csrf-ok
				if (cancelled) return;

				if (!res.ok) {
					error = true;
					loading = false;
					return;
				}

				const data: HumMetadata = await res.json();
				if (cancelled) return;

				meta = data;
				loading = false;
			} catch {
				if (cancelled) return;
				error = true;
				loading = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	function handleTrayToggle(event: MouseEvent | KeyboardEvent) {
		event.preventDefault();
		event.stopPropagation();
		trayOpen = !trayOpen;
	}

	function handleTrayKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			handleTrayToggle(event);
		}
	}

	function closeTray() {
		trayOpen = false;
	}

	function handleCardClick() {
		if (trayOpen) {
			closeTray();
			return;
		}
		const target = meta?.sourceUrl ?? url;
		if (target) {
			window.open(target, "_blank", "noopener,noreferrer");
		}
	}

	function handleCardKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleCardClick();
		}
	}
</script>

{#if loading}
	<HumCardSkeleton class={className} />
{:else if error || !meta || meta.status === "unresolved"}
	<HumCardFallback {url} provider={meta?.provider ?? provider} class={className} />
{:else}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="hum-card-resolved group relative flex items-center gap-4 rounded-xl
			bg-white/70 dark:bg-cream-100/50 backdrop-blur-md
			border border-grove-200/40 dark:border-grove-700/30
			p-3 cursor-pointer select-none
			transition-all duration-200
			hover:shadow-lg hover:bg-white/85 dark:hover:bg-cream-100/60
			hover:-translate-y-0.5
			focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500/50 focus-visible:ring-offset-2
			{className}"
		role="link"
		tabindex="0"
		aria-label="{meta.title ?? 'Unknown'} by {meta.artist ?? 'Unknown artist'} on {info.name}"
		onclick={handleCardClick}
		onkeydown={handleCardKeydown}
	>
		<!-- Album artwork -->
		{#if meta.artworkUrl}
			<div class="w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm">
				<img
					src={meta.artworkUrl}
					alt="Album artwork for {meta.title ?? 'Unknown'}"
					class="w-full h-full object-cover"
					loading="lazy"
					referrerpolicy="no-referrer"
				/>
			</div>
		{:else}
			<div
				class="w-20 h-20 rounded-lg flex items-center justify-center shrink-0"
				style="background: {info.color}15;"
			>
				<HumProviderBadge provider={meta.provider} size={32} />
			</div>
		{/if}

		<!-- Track info -->
		<div class="flex-1 min-w-0">
			<p class="text-sm font-semibold text-foreground truncate leading-snug">
				{meta.title ?? "Unknown track"}
			</p>
			<p class="text-xs text-muted-foreground truncate mt-0.5">
				{meta.artist ?? "Unknown artist"}
			</p>
			{#if meta.album && meta.album !== meta.title}
				<p class="text-xs text-muted-foreground/70 truncate mt-0.5">
					{meta.album}
				</p>
			{/if}
		</div>

		<!-- Provider badge (top-right) -->
		<div class="absolute top-2 right-2 flex flex-col items-end gap-1">
			{#if hasPlatformLinks}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<button
					class="rounded-md transition-transform duration-150
						hover:scale-110
						focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500/50"
					aria-label="Show other platforms"
					aria-expanded={trayOpen}
					onclick={handleTrayToggle}
					onkeydown={handleTrayKeydown}
				>
					<HumProviderBadge provider={meta.provider} size={16} />
				</button>
			{:else}
				<HumProviderBadge provider={meta.provider} size={16} />
			{/if}

			<!-- Platform tray -->
			{#if hasPlatformLinks && meta.platformLinks}
				<HumPlatformTray
					platformLinks={meta.platformLinks}
					sourceProvider={meta.provider}
					open={trayOpen}
					onclose={closeTray}
				/>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.hum-card-resolved {
			transition: none !important;
		}
		.hum-card-resolved:hover {
			transform: none !important;
		}
	}
</style>
