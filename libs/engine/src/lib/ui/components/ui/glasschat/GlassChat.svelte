<script lang="ts">
	import type { Snippet } from "svelte";
	import { tick } from "svelte";
	import { cn } from "$lib/ui/utils";
	import GlassCard from "../GlassCard.svelte";
	import ChatMessage from "./ChatMessage.svelte";
	import ChatInput from "./ChatInput.svelte";
	import ChatTypingIndicator from "./ChatTypingIndicator.svelte";
	import { DEFAULT_ROLE_CONFIG } from "./types";
	import type { ChatMessageData, ChatRoleMap } from "./types";

	/**
	 * GlassChat - Reusable chat interface on a GlassCard surface.
	 *
	 * Consumers provide a ChatRoleMap that tells GlassChat how to render each role.
	 * The component handles scroll management, message list, typing indicator,
	 * error display, and input forwarding. Domain logic stays with the consumer.
	 *
	 * @example
	 * ```svelte
	 * <GlassChat
	 *   messages={messages}
	 *   roles={{ wisp: { label: "Wisp", align: "start" }, user: { label: "You", align: "end" } }}
	 *   isLoading={isLoading}
	 *   bind:inputValue={inputValue}
	 *   onSend={sendMessage}
	 * />
	 * ```
	 */

	interface Props {
		/** The message list (consumer manages state) */
		messages: ChatMessageData[];
		/** How to render each role */
		roles: ChatRoleMap;
		/** Shows typing indicator */
		isLoading?: boolean;
		/** Which role is "typing" (defaults to first non-"user" role in the map) */
		loadingRole?: string;
		/** Error message to show in the message area */
		error?: string | null;
		/** Optional custom header (replaces default) */
		header?: Snippet;
		/** Optional custom message content renderer (passed to ChatMessage) */
		messageContent?: Snippet<[ChatMessageData]>;
		/** Passed to ChatInput's toolbar slot */
		inputToolbar?: Snippet;
		/** Passed to ChatInput's footer slot */
		inputFooter?: Snippet;
		/** Bindable, forwarded to ChatInput */
		inputValue?: string;
		/** Forwarded to ChatInput */
		onSend?: () => void;
		/** Forwarded to ChatInput */
		inputDisabled?: boolean;
		/** Forwarded to ChatInput */
		inputPlaceholder?: string;
		/** Called when Escape is pressed */
		onClose?: () => void;
		/** GlassCard variant (default: "dark") */
		variant?: "default" | "accent" | "dark" | "muted" | "frosted";
		/** Accessible label for the message log region */
		logLabel?: string;
		/** Extra classes for the outer GlassCard */
		class?: string;
	}

	let {
		messages,
		roles,
		isLoading = false,
		loadingRole,
		error = null,
		header,
		messageContent,
		inputToolbar,
		inputFooter,
		inputValue = $bindable(""),
		onSend,
		inputDisabled = false,
		inputPlaceholder,
		onClose,
		variant = "dark",
		logLabel,
		class: className,
	}: Props = $props();

	let messagesContainer = $state<HTMLDivElement | undefined>(undefined);

	/** Resolve the loading role label for the typing indicator. */
	const loadingRoleConfig = $derived(() => {
		const key = loadingRole ?? Object.keys(roles).find((r) => r !== "user");
		return key ? (roles[key] ?? DEFAULT_ROLE_CONFIG) : DEFAULT_ROLE_CONFIG;
	});

	/** Scroll the message area to the bottom. */
	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	/** Auto-scroll when new messages arrive. */
	$effect(() => {
		// Track dependency on messages array length
		void messages.length;
		tick().then(scrollToBottom);
	});

	/** Escape key handler. */
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && onClose) {
			onClose();
		}
	}
</script>

<GlassCard
	{variant}
	flush
	border
	class={cn("flex flex-col h-full min-h-[400px] text-white", className)}
	onkeydown={handleKeydown}
>
	{#if header}
		{@render header()}
	{/if}

	<div
		bind:this={messagesContainer}
		class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3"
		role="log"
		aria-live="polite"
		aria-label={logLabel}
	>
		{#each messages as message (message.id)}
			<ChatMessage
				{message}
				roleConfig={roles[message.role] ?? DEFAULT_ROLE_CONFIG}
				contentOverride={messageContent}
			/>
		{/each}

		{#if isLoading}
			{@const config = loadingRoleConfig()}
			<ChatTypingIndicator
				label={config.label}
				labelClass={config.labelClass}
				srText="{config.label} is thinking..."
				class={cn(
					"rounded-lg px-4 py-3",
					config.bubbleClass || "bg-white/10 dark:bg-white/5 border border-white/20",
				)}
			/>
		{/if}
	</div>

	{#if error}
		<div
			class="mx-4 mb-2 rounded-lg px-4 py-3 bg-red-500/15 border border-red-500/30 text-red-300 text-sm"
			role="alert"
		>
			{error}
		</div>
	{/if}

	<ChatInput
		bind:value={inputValue}
		{onSend}
		disabled={inputDisabled}
		placeholder={inputPlaceholder}
		toolbar={inputToolbar}
		footer={inputFooter}
	/>
</GlassCard>
