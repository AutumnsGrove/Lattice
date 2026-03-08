<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	import type { ChatMessageData, ChatRoleConfig } from "./types";

	/**
	 * ChatMessage - A single chat bubble with role-based alignment and styling.
	 *
	 * If `contentOverride` is provided, the consumer controls what renders inside
	 * the bubble (e.g., Reverie change preview cards). Otherwise, renders the
	 * message content as a simple paragraph with pre-wrap whitespace.
	 */

	interface Props {
		/** The message data to render */
		message: ChatMessageData;
		/** Rendering config for this message's role (alignment, label, classes) */
		roleConfig: ChatRoleConfig;
		/** Optional custom content renderer — receives the message data */
		contentOverride?: Snippet<[ChatMessageData]>;
		/** Extra classes for the outer container */
		class?: string;
	}

	let { message, roleConfig, contentOverride, class: className }: Props = $props();

	const alignClass = $derived(roleConfig.align === "end" ? "self-end" : "self-start");

	const defaultBubble = $derived(
		roleConfig.align === "end"
			? "bg-success text-white"
			: "bg-white/10 dark:bg-white/5 border border-divider",
	);
</script>

<div
	class={cn(
		"max-w-[85%] rounded-lg px-4 py-3",
		alignClass,
		roleConfig.bubbleClass || defaultBubble,
		className,
	)}
	role="group"
	aria-label="{roleConfig.label} message"
>
	<span
		class={cn(
			"block text-xs font-semibold mb-1 opacity-70 uppercase tracking-wide",
			roleConfig.align === "end" && "text-right",
			roleConfig.labelClass,
		)}
	>
		{roleConfig.label}
	</span>

	{#if contentOverride}
		{@render contentOverride(message)}
	{:else}
		<p class="m-0 leading-relaxed whitespace-pre-wrap">{message.content}</p>
	{/if}

	{#if message.timestamp}
		<time datetime={message.timestamp} class="sr-only">
			{new Date(message.timestamp).toLocaleTimeString()}
		</time>
	{/if}
</div>

<style>
	@media (max-width: 640px) {
		div {
			max-width: 95%;
		}
	}
</style>
