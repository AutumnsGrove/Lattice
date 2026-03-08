<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	import { Send } from "lucide-svelte";

	/**
	 * ChatInput - Auto-resizing textarea with send button.
	 *
	 * Handles Enter-to-send, Shift+Enter for newline, auto-resize via
	 * requestAnimationFrame, and focus management after send.
	 */

	interface Props {
		/** Bindable input value (two-way with $bindable) */
		value?: string;
		/** Called on Enter (without Shift) or send button click */
		onSend?: () => void;
		/** Disables input and button */
		disabled?: boolean;
		/** Textarea placeholder */
		placeholder?: string;
		/** Optional slot above the input row (e.g., Fireside draft button) */
		toolbar?: Snippet;
		/** Optional slot below the input row (e.g., Fireside philosophy tagline) */
		footer?: Snippet;
		/** Extra classes for the outer container */
		class?: string;
	}

	let {
		value = $bindable(""),
		onSend,
		disabled = false,
		placeholder = "Type a message...",
		toolbar,
		footer,
		class: className,
	}: Props = $props();

	let inputElement = $state<HTMLTextAreaElement | undefined>(undefined);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	function handleSend() {
		if (!value.trim() || disabled) return;
		onSend?.();
		// Re-focus and reset height after send
		requestAnimationFrame(() => {
			if (inputElement) {
				inputElement.style.height = "auto";
				inputElement.focus();
			}
		});
	}

	function autoResize(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		requestAnimationFrame(() => {
			target.style.height = "auto";
			target.style.height = Math.min(target.scrollHeight, 150) + "px";
		});
	}
</script>

<footer class={cn("border-t border-divider bg-surface-subtle px-4 py-3", className)}>
	{#if toolbar}
		<div class="mb-3">
			{@render toolbar()}
		</div>
	{/if}

	<div class="flex items-end gap-2">
		<textarea
			bind:this={inputElement}
			bind:value
			onkeydown={handleKeydown}
			oninput={autoResize}
			{placeholder}
			rows="1"
			{disabled}
			aria-label={placeholder || "Your message"}
			aria-describedby="glasschat-input-hint"
			class={cn(
				"flex-1 resize-none rounded-lg border border-input bg-surface-subtle px-4 py-3",
				"text-sm leading-relaxed text-inherit font-[inherit]",
				"placeholder:text-foreground-muted/40",
				"focus:outline-none focus:border-accent/50",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				"min-h-[44px] max-h-[150px]",
			)}
		></textarea>
		<button
			type="button"
			onclick={handleSend}
			disabled={!value.trim() || disabled}
			aria-label="Send message"
			class={cn(
				"flex items-center justify-center w-11 h-11 rounded-lg",
				"bg-success text-white",
				"hover:bg-success/90",
				"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success/70",
				"disabled:opacity-50 disabled:cursor-not-allowed",
			)}
		>
			<Send size={18} />
		</button>
	</div>

	<p id="glasschat-input-hint" class="sr-only">Press Enter to send, Shift+Enter for a new line.</p>

	{#if footer}
		<div class="mt-3">
			{@render footer()}
		</div>
	{/if}
</footer>
