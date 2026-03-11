<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { TurnstileWidget } from "@autumnsgrove/lattice/ui/forms";
	import Header from "$lib/components/Header.svelte";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import Footer from "$lib/components/Footer.svelte";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import { Smile, Meh, Frown } from "@lucide/svelte";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let name = $state("");
	let email = $state("");
	let subject = $state("");
	let message = $state("");
	let sentiment = $state<"positive" | "neutral" | "negative" | null>(null);
	let turnstileToken = $state<string | null>(null);
	let submitting = $state(false);

	function handleTurnstileVerify(token: string) {
		turnstileToken = token;
	}

	function resetForm() {
		name = "";
		email = "";
		subject = "";
		message = "";
		sentiment = null;
		turnstileToken = null;
	}

	const charCount = $derived(message.length);
	const isValidLength = $derived(charCount >= 10 && charCount <= 2000);
</script>

<svelte:head>
	<title>Share Your Thoughts - Grove</title>
	<meta
		name="description"
		content="Share your thoughts, ideas, or feedback about Grove. Your voice matters here."
	/>
</svelte:head>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Page Header -->
		<div class="text-center mb-8">
			<div class="inline-block mb-6">
				<Logo class="w-16 h-16" season={seasonStore.current} />
			</div>
			<h1 class="text-3xl font-serif text-foreground mb-3">Share Your Thoughts</h1>
			<p class="text-lg text-foreground-muted font-sans max-w-xl mx-auto">
				Grove is built for you. Whether it's a bug, an idea, or just a hello—your voice matters
				here. I read everything personally.
			</p>
		</div>

		<!-- Success Message -->
		{#if form?.success}
			<div role="status" aria-live="polite">
				<GlassCard
					class="mb-6 bg-success-bg/80 dark:bg-success-bg/40 border-success dark:border-success/40"
				>
					<div class="flex items-start gap-4">
						<div
							class="w-10 h-10 bg-success-bg dark:bg-success-bg/40 rounded-lg flex items-center justify-center text-success dark:text-success flex-shrink-0"
						>
							<svg class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="flex-1">
							<h2 class="text-lg font-serif text-success dark:text-success mb-1">
								Thank you for sharing!
							</h2>
							<p class="text-sm text-success dark:text-success font-sans">
								Your feedback means a lot. I read everything personally. —Autumn
							</p>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}

		<!-- Error Message -->
		{#if form?.error}
			<div role="alert" aria-live="assertive">
				<GlassCard
					class="mb-6 bg-error-bg/80 dark:bg-error-bg/40 border-error dark:border-error/40"
				>
					<div class="flex items-start gap-4">
						<div
							class="w-10 h-10 bg-error-bg dark:bg-error-bg/40 rounded-lg flex items-center justify-center text-error dark:text-error flex-shrink-0"
						>
							<svg class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="flex-1">
							<p class="text-sm text-error dark:text-error font-sans">{form.error}</p>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}

		<!-- Feedback Form -->
		<GlassCard>
			<form
				method="POST"
				action="?/submit"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
						if (form?.success) {
							resetForm();
						}
					};
				}}
			>
				<!-- Name (Optional) -->
				<div class="mb-5">
					<label for="name" class="block text-sm font-sans font-medium text-foreground mb-2">
						Name <span class="text-foreground/40 dark:text-foreground/55 font-normal"
							>(optional)</span
						>
					</label>
					<input
						type="text"
						id="name"
						name="name"
						bind:value={name}
						placeholder="How should I address you?"
						class="w-full px-4 py-3 rounded-lg border border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 dark:placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans transition-all"
						disabled={submitting}
					/>
				</div>

				<!-- Email (Optional) -->
				<div class="mb-5">
					<label for="email" class="block text-sm font-sans font-medium text-foreground mb-2">
						Email <span class="text-foreground/40 dark:text-foreground/55 font-normal"
							>(optional - if you'd like a reply)</span
						>
					</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						placeholder="your.email@example.com"
						class="w-full px-4 py-3 rounded-lg border border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 dark:placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans transition-all"
						disabled={submitting}
					/>
				</div>

				<!-- Subject (Optional) -->
				<div class="mb-5">
					<label for="subject" class="block text-sm font-sans font-medium text-foreground mb-2">
						Subject <span class="text-foreground/40 dark:text-foreground/55 font-normal"
							>(optional)</span
						>
					</label>
					<input
						type="text"
						id="subject"
						name="subject"
						bind:value={subject}
						placeholder="What's this about?"
						class="w-full px-4 py-3 rounded-lg border border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 dark:placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans transition-all"
						disabled={submitting}
					/>
				</div>

				<!-- Sentiment (Optional) -->
				<div class="mb-5">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-sans font-medium text-foreground mb-3">
						How are you feeling? <span
							class="text-foreground/40 dark:text-foreground/55 font-normal">(optional)</span
						>
					</label>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => (sentiment = sentiment === "positive" ? null : "positive")}
							class="flex-1 px-4 py-3 rounded-lg border transition-all font-sans text-sm {sentiment ===
							'positive'
								? 'border-success bg-success-bg dark:bg-success-bg/40 text-success dark:text-success'
								: 'border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground/60 dark:text-foreground/70 hover:border-border dark:hover:border-cream-400'}"
							disabled={submitting}
							aria-label={sentiment === "positive"
								? "Positive feedback (selected)"
								: "Positive feedback"}
							aria-pressed={sentiment === "positive"}
						>
							<Smile class="w-6 h-6 mx-auto" />
							<span class="block mt-1">Positive</span>
						</button>
						<button
							type="button"
							onclick={() => (sentiment = sentiment === "neutral" ? null : "neutral")}
							class="flex-1 px-4 py-3 rounded-lg border transition-all font-sans text-sm {sentiment ===
							'neutral'
								? 'border-info bg-info-bg dark:bg-info-bg/40 text-info dark:text-info'
								: 'border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground/60 dark:text-foreground/70 hover:border-border dark:hover:border-cream-400'}"
							disabled={submitting}
							aria-label={sentiment === "neutral"
								? "Neutral feedback (selected)"
								: "Neutral feedback"}
							aria-pressed={sentiment === "neutral"}
						>
							<Meh class="w-6 h-6 mx-auto" />
							<span class="block mt-1">Neutral</span>
						</button>
						<button
							type="button"
							onclick={() => (sentiment = sentiment === "negative" ? null : "negative")}
							class="flex-1 px-4 py-3 rounded-lg border transition-all font-sans text-sm {sentiment ===
							'negative'
								? 'border-warning bg-warning-bg dark:bg-warning-bg/40 text-warning dark:text-warning'
								: 'border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground/60 dark:text-foreground/70 hover:border-border dark:hover:border-cream-400'}"
							disabled={submitting}
							aria-label={sentiment === "negative"
								? "Concern feedback (selected)"
								: "Concern feedback"}
							aria-pressed={sentiment === "negative"}
						>
							<Frown class="w-6 h-6 mx-auto" />
							<span class="block mt-1">Concern</span>
						</button>
					</div>
					<input type="hidden" name="sentiment" value={sentiment || ""} />
				</div>

				<!-- Message (Required) -->
				<div class="mb-5">
					<label for="message" class="block text-sm font-sans font-medium text-foreground mb-2">
						Your thoughts <span class="text-error">*</span>
					</label>
					<textarea
						id="message"
						name="message"
						bind:value={message}
						placeholder="Share what's on your mind..."
						rows="6"
						required
						aria-required="true"
						minlength="10"
						maxlength="2000"
						class="w-full px-4 py-3 rounded-lg border border-border dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 dark:placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-sans transition-all resize-y"
						disabled={submitting}
					></textarea>
					<div class="flex justify-between items-center mt-2 text-xs font-sans">
						<span class="text-foreground/50 dark:text-foreground/60">At least 10 characters</span>
						<span
							class={isValidLength
								? "text-primary dark:text-primary"
								: charCount > 2000
									? "text-error dark:text-error"
									: "text-foreground/50 dark:text-foreground/60"}
						>
							{charCount}/2000
						</span>
					</div>
				</div>

				<!-- Turnstile -->
				<div class="mb-6">
					<TurnstileWidget siteKey={data.turnstileKey} onverify={handleTurnstileVerify} />
					<input type="hidden" name="cf-turnstile-response" value={turnstileToken || ""} />
				</div>

				<!-- Submit Button -->
				<button
					type="submit"
					disabled={submitting || !isValidLength}
					class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-sans font-medium hover:bg-primary disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
				>
					{#if submitting}
						<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
								fill="none"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Sending...
					{:else}
						Send your thoughts
					{/if}
				</button>
			</form>
		</GlassCard>

		<!-- Footer Note -->
		<p class="text-center text-sm text-foreground-subtle font-sans mt-6">
			You can also email <a
				href="mailto:feedback@grove.place"
				class="text-primary hover:text-primary/80 underline">feedback@grove.place</a
			> directly.
		</p>
	</div>
</main>

<Footer />
