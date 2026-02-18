<script lang="ts">
	import type { HumProvider } from "./types.js";
	import HumProviderBadge from "./HumProviderBadge.svelte";
	import { getProviderInfo } from "./providers.js";

	interface Props {
		platformLinks: Partial<Record<HumProvider, string>>;
		sourceProvider: HumProvider;
		open: boolean;
		onclose?: () => void;
	}

	let { platformLinks, sourceProvider, open, onclose }: Props = $props();

	/** Filter to providers that have links, excluding the source */
	const availableLinks = $derived(
		Object.entries(platformLinks)
			.filter(([provider, url]) => url && provider !== sourceProvider)
			.map(([provider, url]) => ({
				provider: provider as HumProvider,
				url: url as string,
				info: getProviderInfo(provider as HumProvider),
			})),
	);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && onclose) {
			onclose();
		}
	}
</script>

{#if open && availableLinks.length > 0}
	<div
		class="hum-platform-tray flex items-center gap-1.5 px-2 py-1.5 rounded-lg
			bg-white/90 dark:bg-cream-100/80 backdrop-blur-lg
			border border-grove-200/40 dark:border-grove-700/30
			shadow-md"
		role="menu"
		aria-label="Listen on other platforms"
		tabindex="0"
		onkeydown={handleKeydown}
	>
		<span class="text-[10px] text-muted-foreground whitespace-nowrap mr-1">Also on</span>
		{#each availableLinks as { provider, url, info } (provider)}
			<a
				href={url}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
				title="Listen on {info.name}"
				aria-label="Listen on {info.name}"
				class="rounded-md p-0.5 transition-all duration-150
					hover:scale-110 hover:bg-grove-100/50 dark:hover:bg-grove-800/30
					focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500/50"
			>
				<HumProviderBadge {provider} size={14} />
			</a>
		{/each}
	</div>
{/if}
