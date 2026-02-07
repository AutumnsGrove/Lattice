<script lang="ts">
	import { cn } from "$lib/ui/utils";
	import Icons from "../icons/Icons.svelte";
	import { AlertCircle } from "lucide-svelte";
	import type { OGMetadata } from "$lib/types/og.js";

	/**
	 * LinkPreview - Display Open Graph metadata as a rich link card
	 *
	 * A glassmorphism-styled card that shows a preview of an external link,
	 * including its title, description, image, and domain.
	 *
	 * @example Pre-filled data (server-rendered, fastest)
	 * ```svelte
	 * <LinkPreview
	 *   url="https://github.com/octocat/Hello-World"
	 *   title="octocat/Hello-World"
	 *   description="My first repository on GitHub!"
	 *   image="https://opengraph.githubassets.com/..."
	 *   siteName="GitHub"
	 * />
	 * ```
	 *
	 * @example Auto-fetch via API endpoint
	 * ```svelte
	 * <LinkPreview
	 *   url="https://github.com/octocat/Hello-World"
	 *   fetchEndpoint="/api/og/fetch"
	 * />
	 * ```
	 *
	 * @example Compact variant
	 * ```svelte
	 * <LinkPreview url="..." compact />
	 * ```
	 */

	type Variant = "default" | "compact" | "large";
	type ImagePosition = "left" | "top" | "right";

	interface Props {
		/** The URL to preview (required) */
		url: string;

		/** Pre-filled title (og:title) */
		title?: string;

		/** Pre-filled description (og:description) */
		description?: string;

		/** Pre-filled image URL (og:image) */
		image?: string;

		/** Pre-filled site name (og:site_name) */
		siteName?: string;

		/** Pre-filled favicon URL */
		favicon?: string;

		/** API endpoint to fetch OG metadata (enables auto-fetch) */
		fetchEndpoint?: string;

		/** Display variant */
		variant?: Variant;

		/** Image position (default: left, large variant uses top) */
		imagePosition?: ImagePosition;

		/** Show favicon next to domain */
		showFavicon?: boolean;

		/** Custom CSS class */
		class?: string;

		/** Open link in new tab (default: true) */
		newTab?: boolean;

		/** Disable the link (display only) */
		disabled?: boolean;
	}

	let {
		url,
		title: initialTitle,
		description: initialDescription,
		image: initialImage,
		siteName: initialSiteName,
		favicon: initialFavicon,
		fetchEndpoint,
		variant = "default",
		imagePosition = "left",
		showFavicon = true,
		class: className,
		newTab = true,
		disabled = false
	}: Props = $props();

	// State
	let loading = $state(false);
	let error = $state<string | null>(null);
	let fetchedData = $state<OGMetadata | null>(null);

	// Extract domain from URL (must be defined before displayTitle uses it)
	const domain = $derived.by(() => {
		try {
			return new URL(url).hostname.replace(/^www\./, "");
		} catch {
			return url;
		}
	});

	// Derived values (prefer props over fetched data)
	const displayTitle = $derived(initialTitle || fetchedData?.title || domain);
	const displayDescription = $derived(initialDescription || fetchedData?.description);
	const displayImage = $derived(initialImage || fetchedData?.image);
	const displaySiteName = $derived(initialSiteName || fetchedData?.siteName);
	const displayFavicon = $derived(initialFavicon || fetchedData?.favicon);

	// Determine if we should fetch (has endpoint and missing required data)
	const shouldFetch = $derived(
		fetchEndpoint && !initialTitle && !initialDescription && !initialImage
	);

	// Fetch metadata on mount if needed
	$effect(() => {
		if (shouldFetch && fetchEndpoint) {
			fetchMetadata();
		}
	});

	async function fetchMetadata() {
		if (!fetchEndpoint) return;

		loading = true;
		error = null;

		try {
			const params = new URLSearchParams({ url });
			const response = await fetch(`${fetchEndpoint}?${params}`);

			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.statusText}`);
			}

			const result = (await response.json()) as {
				success: boolean;
				data?: OGMetadata;
				error?: string;
			};

			if (result.success && result.data) {
				fetchedData = result.data;
			} else {
				error = result.error || "Failed to load preview";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to load preview";
		} finally {
			loading = false;
		}
	}

	// Effective image position (large variant always uses top)
	const effectiveImagePosition = $derived(variant === "large" ? "top" : imagePosition);

	// Has displayable image
	const hasImage = $derived(!!displayImage && !error);

	// Variant-specific styles
	const containerClasses = $derived.by(() => {
		const base = `
			group relative overflow-hidden rounded-xl
			bg-white/80 dark:bg-bark-800/50 backdrop-blur-md
			border border-white/40 dark:border-bark-700/40
			shadow-sm transition-all duration-200
		`;

		const hover = disabled
			? ""
			: "hover:bg-white/70 dark:hover:bg-bark-800/60 hover:shadow-md hover:border-white/50 dark:hover:border-bark-600/50";

		const layout =
			effectiveImagePosition === "top"
				? "flex flex-col"
				: effectiveImagePosition === "right"
					? "flex flex-row-reverse"
					: "flex flex-row";

		return cn(base, hover, layout, className);
	});

	// Image container classes
	const imageContainerClasses = $derived.by(() => {
		if (effectiveImagePosition === "top") {
			return variant === "large"
				? "w-full h-48 sm:h-56"
				: "w-full h-32 sm:h-40";
		}
		// Side positioning
		return variant === "compact"
			? "w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0"
			: "w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0";
	});

	// Content padding classes
	const contentClasses = $derived.by(() => {
		const base = "flex flex-col justify-center min-w-0";
		return variant === "compact"
			? cn(base, "p-3 gap-1")
			: cn(base, "p-4 gap-2 flex-1");
	});
</script>

{#if disabled}
	<div class={containerClasses}>
		{@render cardContent()}
	</div>
{:else}
	<a
		href={url}
		target={newTab ? "_blank" : undefined}
		rel={newTab ? "noopener noreferrer" : undefined}
		class={cn(containerClasses, "block no-underline")}
	>
		{@render cardContent()}
	</a>
{/if}

{#snippet cardContent()}
	<!-- Loading state -->
	{#if loading}
		<div class="flex items-center justify-center p-6 w-full">
			<div class="flex items-center gap-3 text-bark-400 dark:text-cream-500">
				<div
					class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"
					role="status"
					aria-label="Loading preview"
				></div>
				<span class="text-sm" aria-hidden="true">Loading preview...</span>
			</div>
		</div>
	{:else}
		<!-- Image -->
		{#if hasImage}
			<div class={cn(imageContainerClasses, "relative bg-bark-100 dark:bg-bark-700/50")}>
				<img
					src={displayImage}
					alt={displayTitle || "Link preview"}
					class="w-full h-full object-cover"
					loading="lazy"
					onerror={(e) => {
						// Hide broken images
						(e.target as HTMLImageElement).style.display = "none";
					}}
				/>
				<!-- Gradient overlay for top images -->
				{#if effectiveImagePosition === "top"}
					<div
						class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent"
					></div>
				{/if}
			</div>
		{/if}

		<!-- Content -->
		<div class={contentClasses}>
			<!-- Site name / Domain row -->
			<div class="flex items-center gap-2 text-xs text-bark-500 dark:text-cream-500">
				{#if showFavicon && displayFavicon}
					<img
						src={displayFavicon}
						alt=""
						class="w-4 h-4 rounded-sm"
						loading="lazy"
						onerror={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				{/if}
				<span class="truncate">{displaySiteName || domain}</span>
			</div>

			<!-- Title -->
			{#if displayTitle}
				<h3
					class={cn(
						"font-medium text-bark dark:text-cream leading-snug",
						variant === "compact" ? "text-sm line-clamp-1" : "text-base line-clamp-2",
						!disabled && "group-hover:text-primary dark:group-hover:text-primary-400"
					)}
				>
					{displayTitle}
				</h3>
			{/if}

			<!-- Description -->
			{#if displayDescription && variant !== "compact"}
				<p
					class={cn(
						"text-sm text-bark-600 dark:text-cream-400 leading-relaxed",
						variant === "large" ? "line-clamp-3" : "line-clamp-2"
					)}
				>
					{displayDescription}
				</p>
			{/if}

			<!-- Error state -->
			{#if error}
				<div class="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
					<AlertCircle class="w-4 h-4" />
					<span>Preview unavailable</span>
				</div>
			{/if}
		</div>

		<!-- External link indicator (decorative, link already has rel and target) -->
		{#if !disabled && newTab}
			<div
				class="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 dark:bg-bark-800/80 opacity-0 group-hover:opacity-100 transition-opacity"
				aria-hidden="true"
			>
				<Icons name="external" size="sm" class="text-bark-400 dark:text-cream-500" />
			</div>
		{/if}
	{/if}
{/snippet}

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
