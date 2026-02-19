<script lang="ts">
	import type { HumProvider } from "./types.js";
	import HumProviderBadge from "./HumProviderBadge.svelte";
	import { getProviderInfo } from "./providers.js";

	interface Props {
		url: string;
		provider: HumProvider;
		class?: string;
	}

	let { url, provider, class: className = "" }: Props = $props();

	const info = $derived(getProviderInfo(provider));
</script>

<a
	href={url}
	target="_blank"
	rel="noopener noreferrer"
	class="hum-card-fallback group flex items-center gap-3 rounded-xl
		bg-white/60 dark:bg-cream-100/40 backdrop-blur-md
		border border-grove-200/40 dark:border-grove-700/30
		p-3 no-underline
		transition-all duration-200
		hover:shadow-md hover:bg-white/80 dark:hover:bg-cream-100/50
		focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500/50 focus-visible:ring-offset-2
		{className}"
	aria-label="Open {info.name} link"
>
	<!-- Provider icon as artwork substitute -->
	<div
		class="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
		style="background: {info.color}15;"
	>
		<HumProviderBadge {provider} size={24} />
	</div>

	<!-- Link text -->
	<div class="flex-1 min-w-0">
		<p class="text-sm font-medium text-foreground truncate">
			{info.name}
		</p>
		<p class="text-xs text-muted-foreground truncate mt-0.5">
			{url}
		</p>
	</div>

	<!-- External link indicator -->
	<svg
		class="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200
			group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
			d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
	</svg>
</a>
