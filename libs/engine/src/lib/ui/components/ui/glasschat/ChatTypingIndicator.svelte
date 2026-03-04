<script lang="ts">
	import { cn } from "$lib/ui/utils";

	/**
	 * ChatTypingIndicator - Three bouncing dots for "thinking" state.
	 *
	 * Extracted from FiresideChat. Respects prefers-reduced-motion.
	 */

	interface Props {
		/** Role label to show above the dots (e.g., "Wisp") */
		label?: string;
		/** Extra classes for the label */
		labelClass?: string;
		/** Screen reader text (default: "Thinking...") */
		srText?: string;
		/** Extra classes for the outer container */
		class?: string;
	}

	let { label, labelClass, srText = "Thinking...", class: className }: Props = $props();
</script>

<div class={cn("max-w-[85%] self-start", className)} role="status">
	{#if label}
		<span
			class={cn("block text-xs font-semibold mb-1 opacity-70 uppercase tracking-wide", labelClass)}
		>
			{label}
		</span>
	{/if}
	<div class="flex gap-1 py-1" aria-hidden="true">
		<span class="typing-dot"></span>
		<span class="typing-dot"></span>
		<span class="typing-dot"></span>
	</div>
	<span class="sr-only">{srText}</span>
</div>

<style>
	.typing-dot {
		width: 6px;
		height: 6px;
		background: currentColor;
		opacity: 0.5;
		border-radius: 50%;
		animation: bounce 1.4s infinite ease-in-out both;
	}

	.typing-dot:nth-child(1) {
		animation-delay: -0.32s;
	}
	.typing-dot:nth-child(2) {
		animation-delay: -0.16s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0);
		}
		40% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.typing-dot {
			animation: none;
			opacity: 0.5;
		}
	}
</style>
