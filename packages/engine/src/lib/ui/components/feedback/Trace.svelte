<script lang="ts">
	/**
	 * Trace - Universal Inline Feedback Component
	 *
	 * A lightweight 👍👎 feedback widget that can be dropped anywhere in Grove.
	 * Auto-detects its location from the current route and submits feedback
	 * to the Trace API with privacy-preserving IP hashing.
	 *
	 * @example Basic usage (auto-detects path from route)
	 * ```svelte
	 * <Trace />
	 * ```
	 *
	 * @example With custom path suffix
	 * ```svelte
	 * <Trace id="GlassCard" />
	 * ```
	 *
	 * @example Without comment field
	 * ```svelte
	 * <Trace showComment={false} />
	 * ```
	 *
	 * @example Small size with custom prompt
	 * ```svelte
	 * <Trace size="sm" prompt="Did this help?" />
	 * ```
	 */

	import { page } from "$app/stores";
	import { buildTracePath } from "$lib/utils/trace-path.js";
	import { cn } from "$lib/ui/utils";
	import { ThumbsUp, ThumbsDown, Loader2, Check } from "lucide-svelte";

	interface Props {
		/** Override auto-detected path (appended as suffix to route path) */
		id?: string;
		/** Show optional comment field (default: true) */
		showComment?: boolean;
		/** Size variant (default: "md") */
		size?: "sm" | "md";
		/** Custom prompt text (default: "Was this helpful?") */
		prompt?: string;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		id,
		showComment = true,
		size = "md",
		prompt = "Was this helpful?",
		class: className,
	}: Props = $props();

	// State
	let vote = $state<"up" | "down" | null>(null);
	let comment = $state("");
	let showCommentField = $state(false);
	let isSubmitting = $state(false);
	let hasSubmitted = $state(false);
	let error = $state<string | null>(null);
	let feedbackId = $state<string | null>(null);

	// Build the source path from current route + optional suffix
	const sourcePath = $derived(buildTracePath($page.url.pathname, id));

	// Size-based classes
	const sizeClasses = $derived({
		container: size === "sm" ? "gap-3" : "gap-4",
		prompt: size === "sm" ? "text-sm" : "text-base",
		button: size === "sm" ? "p-2" : "p-3",
		icon: size === "sm" ? "w-4 h-4" : "w-5 h-5",
		textarea: size === "sm" ? "text-sm" : "text-base",
	});

	// Handle vote selection
	function handleVote(selectedVote: "up" | "down") {
		if (isSubmitting || hasSubmitted) return;

		vote = selectedVote;
		error = null;

		// If comment is disabled or vote is positive without comment, submit immediately
		if (!showComment) {
			submitFeedback();
		}
	}

	// Handle "Want to say more?" click
	function toggleCommentField() {
		showCommentField = !showCommentField;
	}

	// Submit feedback to API
	async function submitFeedback() {
		if (!vote || isSubmitting || hasSubmitted) return;

		isSubmitting = true;
		error = null;

		try {
			const response = await fetch("/api/trace", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sourcePath,
					vote,
					comment: comment.trim() || undefined,
				}),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(data.message || `Failed to submit feedback (${response.status})`);
			}

			const result = (await response.json()) as { success: boolean; id: string };
			feedbackId = result.id;
			hasSubmitted = true;
		} catch (err) {
			console.error("[Trace] Submit error:", err);
			error = err instanceof Error ? err.message : "Something went wrong. Please try again.";
		} finally {
			isSubmitting = false;
		}
	}

	// Handle form submission
	function handleSubmit(e: Event) {
		e.preventDefault();
		submitFeedback();
	}
</script>

<div
	class={cn(
		"flex flex-col items-center",
		sizeClasses.container,
		className,
	)}
	role="region"
	aria-label="Feedback"
>
	{#if hasSubmitted}
		<!-- Success state -->
		<div
			class="flex items-center gap-2 text-grove-600 dark:text-grove-400 animate-in fade-in duration-300"
		>
			<Check class={sizeClasses.icon} aria-hidden="true" />
			<span class={cn(sizeClasses.prompt, "font-medium")}>
				Thanks for your feedback!
			</span>
		</div>
	{:else}
		<!-- Prompt -->
		<p class={cn(sizeClasses.prompt, "text-muted-foreground text-center")}>
			{prompt}
		</p>

		<!-- Vote buttons -->
		<div class="flex items-center gap-3" role="group" aria-label="Rate this content">
			<!-- Thumbs up -->
			<button
				type="button"
				onclick={() => handleVote("up")}
				disabled={isSubmitting}
				class={cn(
					"rounded-full transition-all duration-200",
					"border border-transparent",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2",
					sizeClasses.button,
					vote === "up"
						? "bg-grove-100 dark:bg-grove-900/50 border-grove-300 dark:border-grove-700 text-grove-700 dark:text-grove-300"
						: "hover:bg-cream-100 dark:hover:bg-bark-800 text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400",
					isSubmitting && "opacity-50 cursor-not-allowed",
				)}
				aria-pressed={vote === "up"}
				aria-label="Helpful"
			>
				{#if isSubmitting && vote === "up"}
					<Loader2 class={cn(sizeClasses.icon, "animate-spin")} aria-hidden="true" />
				{:else}
					<ThumbsUp class={sizeClasses.icon} aria-hidden="true" />
				{/if}
			</button>

			<!-- Thumbs down -->
			<button
				type="button"
				onclick={() => handleVote("down")}
				disabled={isSubmitting}
				class={cn(
					"rounded-full transition-all duration-200",
					"border border-transparent",
					"focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2",
					sizeClasses.button,
					vote === "down"
						? "bg-rose-100 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300"
						: "hover:bg-cream-100 dark:hover:bg-bark-800 text-foreground-muted hover:text-rose-600 dark:hover:text-rose-400",
					isSubmitting && "opacity-50 cursor-not-allowed",
				)}
				aria-pressed={vote === "down"}
				aria-label="Not helpful"
			>
				{#if isSubmitting && vote === "down"}
					<Loader2 class={cn(sizeClasses.icon, "animate-spin")} aria-hidden="true" />
				{:else}
					<ThumbsDown class={sizeClasses.icon} aria-hidden="true" />
				{/if}
			</button>
		</div>

		<!-- Comment section (appears after vote if showComment is true) -->
		{#if showComment && vote}
			<div class="w-full max-w-md animate-in slide-in-from-top-2 duration-200">
				{#if !showCommentField}
					<!-- Submit now or expand to add comment -->
					<div class="flex items-center justify-center gap-4">
						<button
							type="button"
							onclick={submitFeedback}
							disabled={isSubmitting}
							class={cn(
								"px-4 py-2 rounded-lg font-medium text-sm",
								"bg-grove-600 hover:bg-grove-700 text-white",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2",
								"disabled:opacity-50 disabled:cursor-not-allowed",
								"transition-colors duration-200",
							)}
						>
							{#if isSubmitting}
								<span class="flex items-center gap-2">
									<Loader2 class="w-4 h-4 animate-spin" aria-hidden="true" />
									Sending...
								</span>
							{:else}
								Submit
							{/if}
						</button>
						<button
							type="button"
							onclick={toggleCommentField}
							disabled={isSubmitting}
							class={cn(
								"text-sm text-muted-foreground hover:text-foreground",
								"underline underline-offset-2 decoration-dashed",
								"focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2 rounded",
								"disabled:opacity-50",
							)}
						>
							Add a comment
						</button>
					</div>
				{:else}
					<!-- Comment form -->
					<form onsubmit={handleSubmit} class="space-y-3">
						<textarea
							bind:value={comment}
							placeholder="Your feedback helps us improve..."
							maxlength={500}
							rows={3}
							disabled={isSubmitting}
							class={cn(
								"w-full rounded-lg border border-cream-200 dark:border-bark-700",
								"bg-white/80 dark:bg-bark-800/50 backdrop-blur-sm",
								"px-3 py-2 resize-none",
								"placeholder:text-muted-foreground/60",
								"focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent",
								"disabled:opacity-50 disabled:cursor-not-allowed",
								sizeClasses.textarea,
							)}
						></textarea>

						<div class="flex items-center justify-between gap-3">
							<span class="text-xs text-muted-foreground">
								{comment.length}/500
							</span>

							<button
								type="submit"
								disabled={isSubmitting}
								class={cn(
									"px-4 py-2 rounded-lg font-medium text-sm",
									"bg-grove-600 hover:bg-grove-700 text-white",
									"focus:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2",
									"disabled:opacity-50 disabled:cursor-not-allowed",
									"transition-colors duration-200",
								)}
							>
								{#if isSubmitting}
									<span class="flex items-center gap-2">
										<Loader2 class="w-4 h-4 animate-spin" aria-hidden="true" />
										Sending...
									</span>
								{:else}
									Send Feedback
								{/if}
							</button>
						</div>
					</form>
				{/if}
			</div>
		{/if}

		<!-- Error message -->
		{#if error}
			<p class="text-sm text-rose-600 dark:text-rose-400 text-center animate-in fade-in duration-200">
				{error}
			</p>
		{/if}
	{/if}
</div>
