<script lang="ts">
	import { actionIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import { share } from "$lib/utils/share";

	interface Props {
		/** The title to share (grove name) */
		title?: string;
		/** Optional description text */
		text?: string;
		/** URL to share — defaults to current page */
		url?: string;
	}

	let { title = "", text = "", url = "" }: Props = $props();

	let state = $state<"idle" | "copied" | "shared">("idle");

	// Reset state after feedback
	$effect(() => {
		if (state === "idle") return;
		const timeout = setTimeout(() => (state = "idle"), 2000);
		return () => clearTimeout(timeout);
	});

	async function handleShare() {
		const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
		const result = await share({
			title: title || undefined,
			text: text || undefined,
			url: shareUrl,
		});

		if (result.method === "native" && result.success) {
			state = "shared";
		} else if (result.method === "clipboard" && result.success) {
			state = "copied";
		}
		// cancelled or failed: stay idle
	}

	let icon = $derived(state === "copied" ? stateIcons.check : state === "shared" ? stateIcons.check : actionIcons.share);
	let displayText = $derived(
		state === "copied" ? "Copied!" : state === "shared" ? "Shared!" : "Share",
	);
	let buttonLabel = $derived(
		state === "copied"
			? "Link copied to clipboard"
			: state === "shared"
				? "Shared successfully"
				: `Share ${title || "this page"}`,
	);
</script>

<span class="share-button-inline">
	<GlassButton
		variant="outline"
		size="sm"
		onclick={handleShare}
		aria-label={buttonLabel}
		class="share-pill"
	>
		{@const Icon = icon}
		<Icon size={16} aria-hidden="true" />
		<span class="share-text">{displayText}</span>
	</GlassButton>
</span>

<style>
	.share-button-inline {
		display: inline-flex;
		align-items: center;
	}

	.share-button-inline :global(.share-pill) {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.share-text {
		line-height: 1;
	}

	@media (prefers-reduced-motion: reduce) {
		.share-button-inline :global(.share-pill) {
			transition: none;
		}
	}
</style>
