<script lang="ts">
	import LinkPreview from './LinkPreview.svelte';
	import { sanitizeHTML } from '$lib/utils/sanitize';

	/**
	 * EmbedWidget - Renders interactive embeds or OG preview fallback in the gutter
	 *
	 * For trusted providers (YouTube, Strawpoll, etc.), renders a sandboxed iframe.
	 * For unrecognized URLs, falls back to LinkPreview (OG card).
	 *
	 * @example Embed from gutter item data
	 * ```svelte
	 * <EmbedWidget
	 *   url="https://strawpoll.com/polls/abc123"
	 *   provider="Strawpoll"
	 *   embedUrl="https://strawpoll.com/embed/abc123"
	 *   sandboxPermissions={['allow-scripts', 'allow-same-origin', 'allow-forms']}
	 *   aspectRatio="4:3"
	 * />
	 * ```
	 *
	 * @example Auto-resolve from URL (fetches /api/oembed)
	 * ```svelte
	 * <EmbedWidget url="https://youtube.com/watch?v=..." />
	 * ```
	 */

	interface EmbedData {
		type: 'embed' | 'preview';
		provider?: string;
		renderStrategy?: string;
		embedUrl?: string;
		embedHtml?: string;
		title?: string;
		thumbnail?: string;
		aspectRatio?: string;
		sandboxPermissions?: string[];
		maxWidth?: number;
		og?: {
			title?: string;
			description?: string;
			image?: string;
			siteName?: string;
			favicon?: string;
		};
		error?: string;
		url?: string;
	}

	interface Props {
		/** The source URL to embed */
		url: string;
		/** Pre-resolved provider name (skips API call if set with embedUrl) */
		provider?: string;
		/** Pre-resolved iframe src URL */
		embedUrl?: string;
		/** Pre-resolved iframe srcdoc HTML */
		embedHtml?: string;
		/** Pre-resolved title */
		embedTitle?: string;
		/** Pre-resolved thumbnail */
		embedThumbnail?: string;
		/** Sandbox permissions for the iframe */
		sandboxPermissions?: string[];
		/** Aspect ratio for responsive sizing (e.g., "16:9") */
		aspectRatio?: string;
		/** Maximum width */
		maxWidth?: number;
		/** Compact mode for gutter display */
		compact?: boolean;
	}

	let {
		url,
		provider,
		embedUrl,
		embedHtml,
		embedTitle,
		embedThumbnail,
		sandboxPermissions = [],
		aspectRatio = '16:9',
		maxWidth,
		compact = true
	}: Props = $props();

	// State for auto-resolved embeds
	let loading = $state(false);
	let error = $state<string | null>(null);
	let resolvedData = $state<EmbedData | null>(null);

	// Whether we need to fetch (no pre-resolved data)
	const needsFetch = $derived(!provider && !embedUrl && !embedHtml);

	// Resolved values (prefer props, fall back to fetched data)
	const displayProvider = $derived(provider || resolvedData?.provider);
	const displayEmbedUrl = $derived(embedUrl || resolvedData?.embedUrl);
	const displayEmbedHtml = $derived(embedHtml || resolvedData?.embedHtml);
	const displayTitle = $derived(embedTitle || resolvedData?.title);
	const displaySandbox = $derived(
		sandboxPermissions.length > 0
			? sandboxPermissions
			: resolvedData?.sandboxPermissions || []
	);
	const displayAspectRatio = $derived(
		aspectRatio !== '16:9' ? aspectRatio : resolvedData?.aspectRatio || '16:9'
	);
	const displayMaxWidth = $derived(maxWidth || resolvedData?.maxWidth);

	// Is this an interactive embed or a fallback preview?
	const isEmbed = $derived(!!displayEmbedUrl || !!displayEmbedHtml);

	// Calculate padding for aspect ratio
	const aspectPadding = $derived.by(() => {
		const [w, h] = displayAspectRatio.split(':').map(Number);
		if (!w || !h) return '56.25%';
		return `${(h / w) * 100}%`;
	});

	// Fetch embed data from API
	$effect(() => {
		if (needsFetch && url) {
			fetchEmbedData();
		}
	});

	async function fetchEmbedData() {
		loading = true;
		error = null;

		try {
			const params = new URLSearchParams({ url });
			const response = await fetch(`/api/oembed?${params}`); // csrf-ok

			if (!response.ok) {
				throw new Error(`Failed to fetch embed data: ${response.statusText}`);
			}

			resolvedData = (await response.json()) as EmbedData;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load embed';
		} finally {
			loading = false;
		}
	}

	// Sanitize srcdoc HTML for safe rendering
	function getSanitizedSrcdoc(html: string): string {
		const sanitized = sanitizeHTML(html);
		// Wrap in minimal HTML document for srcdoc
		return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;overflow:hidden;font-family:system-ui,sans-serif}</style></head><body>${sanitized}</body></html>`;
	}
</script>

<div
	class="embed-widget"
	class:compact
	style:max-width={displayMaxWidth ? `${displayMaxWidth}px` : undefined}
>
	{#if loading}
		<!-- Loading state -->
		<div class="embed-loading">
			<div class="embed-spinner" role="status" aria-label="Loading embed"></div>
			<span class="embed-loading-text">Loading...</span>
		</div>
	{:else if isEmbed}
		<!-- Interactive embed (sandboxed iframe) -->
		<div class="embed-container">
			{#if displayProvider}
				<div class="embed-provider-badge">
					<span>{displayProvider}</span>
				</div>
			{/if}
			<div class="embed-iframe-wrapper" style:padding-bottom={aspectPadding}>
				{#if displayEmbedUrl}
					<iframe
						src={displayEmbedUrl}
						sandbox={displaySandbox.join(' ')}
						referrerpolicy="no-referrer"
						loading="lazy"
						title={displayTitle || `${displayProvider || 'Embedded'} content`}
						allowfullscreen
						class="embed-iframe"
					></iframe>
				{:else if displayEmbedHtml}
					<iframe
						srcdoc={getSanitizedSrcdoc(displayEmbedHtml)}
						sandbox={displaySandbox.filter((p) => p !== 'allow-same-origin').join(' ')}
						referrerpolicy="no-referrer"
						loading="lazy"
						title={displayTitle || `${displayProvider || 'Embedded'} content`}
						class="embed-iframe"
					></iframe>
				{/if}
			</div>
			{#if displayTitle}
				<div class="embed-title">{displayTitle}</div>
			{/if}
		</div>
	{:else if resolvedData?.type === 'preview' && resolvedData.og}
		<!-- OG link preview fallback -->
		<LinkPreview
			{url}
			title={resolvedData.og.title}
			description={resolvedData.og.description}
			image={resolvedData.og.image}
			siteName={resolvedData.og.siteName}
			favicon={resolvedData.og.favicon}
			variant={compact ? 'compact' : 'default'}
			imagePosition="top"
		/>
	{:else if error || resolvedData?.error}
		<!-- Error state — still show a basic link -->
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			class="embed-fallback-link"
		>
			<span class="embed-fallback-icon">&#x1F517;</span>
			<span class="embed-fallback-url">{url}</span>
		</a>
	{:else}
		<!-- Pure fallback — use LinkPreview with auto-fetch -->
		<LinkPreview {url} fetchEndpoint="/api/oembed" variant={compact ? 'compact' : 'default'} />
	{/if}
</div>

<style>
	.embed-widget {
		width: 100%;
		font-size: 0.875rem;
	}

	.embed-widget.compact {
		max-width: 220px;
	}

	/* Loading state */
	.embed-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.5rem 1rem;
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 12px;
	}

	:global(.dark) .embed-loading {
		background: rgba(16, 50, 37, 0.4);
		border-color: rgba(74, 222, 128, 0.12);
	}

	.embed-spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid rgba(44, 95, 45, 0.2);
		border-top-color: #2c5f2d;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	:global(.dark) .embed-spinner {
		border-color: rgba(74, 222, 128, 0.2);
		border-top-color: #4ade80;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.embed-loading-text {
		font-size: 0.75rem;
		color: var(--light-text-secondary, #666);
	}

	:global(.dark) .embed-loading-text {
		color: var(--light-text-tertiary, #999);
	}

	/* Embed container */
	.embed-container {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.5);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
		transition: all 0.3s ease;
	}

	.embed-container:hover {
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .embed-container {
		background: rgba(16, 50, 37, 0.5);
		border-color: rgba(74, 222, 128, 0.15);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
	}

	:global(.dark) .embed-container:hover {
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	/* Provider badge */
	.embed-provider-badge {
		padding: 0.35rem 0.75rem;
		background: rgba(44, 95, 45, 0.08);
		border-bottom: 1px solid rgba(255, 255, 255, 0.3);
	}

	:global(.dark) .embed-provider-badge {
		background: rgba(74, 222, 128, 0.06);
		border-bottom-color: rgba(74, 222, 128, 0.1);
	}

	.embed-provider-badge span {
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #2c5f2d;
	}

	:global(.dark) .embed-provider-badge span {
		color: #4ade80;
	}

	/* Responsive iframe wrapper */
	.embed-iframe-wrapper {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.embed-iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	/* Title below embed */
	.embed-title {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		color: var(--light-text-secondary, #666);
		border-top: 1px solid rgba(255, 255, 255, 0.3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .embed-title {
		color: var(--light-text-tertiary, #999);
		border-top-color: rgba(74, 222, 128, 0.1);
	}

	/* Error fallback link */
	.embed-fallback-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 10px;
		color: #2c5f2d;
		text-decoration: none;
		transition: all 0.2s ease;
	}

	.embed-fallback-link:hover {
		background: rgba(255, 255, 255, 0.75);
		border-color: #2c5f2d;
	}

	:global(.dark) .embed-fallback-link {
		background: rgba(16, 50, 37, 0.4);
		border-color: rgba(74, 222, 128, 0.15);
		color: #4ade80;
	}

	:global(.dark) .embed-fallback-link:hover {
		background: rgba(16, 50, 37, 0.55);
		border-color: rgba(74, 222, 128, 0.3);
	}

	.embed-fallback-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.embed-fallback-url {
		font-size: 0.75rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Respect reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.embed-spinner {
			animation: none;
		}

		.embed-container,
		.embed-fallback-link {
			transition: none;
		}
	}
</style>
