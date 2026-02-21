<script lang="ts">
	import { enhance } from "$app/forms";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { TurnstileWidget } from "@autumnsgrove/lattice/ui/forms";
	import Header from "$lib/components/Header.svelte";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import Footer from "$lib/components/Footer.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import { Shield, Mail, AlertTriangle, Clock, Lock, ChevronDown } from "lucide-svelte";
	import type { ActionData, PageData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(data.user?.name || "");
	// svelte-ignore state_referenced_locally
	let email = $state(data.user?.email || "");
	let subject = $state("");
	let description = $state("");
	let severity = $state<"critical" | "high" | "medium" | "low" | "informational">("medium");
	let turnstileToken = $state<string | null>(null);
	let submitting = $state(false);
	let showForm = $state(false);

	function handleTurnstileVerify(token: string) {
		turnstileToken = token;
	}

	const charCount = $derived(description.length);
	const isValidLength = $derived(charCount >= 20 && charCount <= 10000);
	const hasEmail = $derived(email.trim().length > 0);

	const severityOptions = [
		{
			id: "critical",
			label: "Critical",
			description: "Active exploitation or data exposure",
			color: "text-red-700 dark:text-red-400",
			bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
		},
		{
			id: "high",
			label: "High",
			description: "Could lead to significant impact",
			color: "text-orange-700 dark:text-orange-400",
			bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
		},
		{
			id: "medium",
			label: "Medium",
			description: "Requires specific conditions to exploit",
			color: "text-yellow-700 dark:text-yellow-400",
			bg: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
		},
		{
			id: "low",
			label: "Low",
			description: "Minor issue, limited impact",
			color: "text-blue-700 dark:text-blue-400",
			bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
		},
		{
			id: "informational",
			label: "Informational",
			description: "Best practice suggestion or hardening tip",
			color: "text-grove-700 dark:text-grove-400",
			bg: "bg-grove-50 dark:bg-grove-900/20 border-grove-200 dark:border-grove-800",
		},
	] as const;
</script>

<SEO
	title="Security — Grove"
	description="Report a security vulnerability to Grove. We take every report seriously and aim to respond within 24 hours for critical issues."
	url="/security"
/>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Page Header -->
		<div class="text-center mb-10">
			<div class="inline-block mb-6">
				<Logo class="w-16 h-16" season={seasonStore.current} />
			</div>
			<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-3">Security</h1>
			<p class="text-lg text-foreground-muted font-sans max-w-xl mx-auto">
				Keeping the grove safe is a shared effort. If you've found something that doesn't look
				right, I want to hear about it.
			</p>
		</div>

		<!-- Policy Overview -->
		<GlassCard class="mb-8">
			<div class="space-y-6">
				<div class="flex items-start gap-4">
					<div class="p-2.5 rounded-lg bg-grove-100 dark:bg-grove-900/30 flex-shrink-0">
						<Shield class="w-5 h-5 text-grove-700 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="font-serif text-foreground text-lg mb-1">Responsible Disclosure</h2>
						<p class="text-sm text-foreground-muted font-sans leading-relaxed">
							Grove is built by one person, but security matters to me deeply. If you discover a
							vulnerability, I appreciate you giving me a reasonable window to address it before any
							public disclosure. I'll work with you openly and keep you updated.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="p-2.5 rounded-lg bg-grove-100 dark:bg-grove-900/30 flex-shrink-0">
						<Clock class="w-5 h-5 text-grove-700 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="font-serif text-foreground text-lg mb-1">Response Times</h2>
						<p class="text-sm text-foreground-muted font-sans leading-relaxed">
							I aim to acknowledge all reports within 48 hours. Critical issues get my immediate
							attention. I'll keep you in the loop as I investigate and work on a fix.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="p-2.5 rounded-lg bg-grove-100 dark:bg-grove-900/30 flex-shrink-0">
						<Lock class="w-5 h-5 text-grove-700 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="font-serif text-foreground text-lg mb-1">What's in Scope</h2>
						<p class="text-sm text-foreground-muted font-sans leading-relaxed">
							Any vulnerability affecting grove.place, *.grove.place subdomains, our APIs, or
							infrastructure. This includes authentication issues, data exposure, injection
							vulnerabilities, access control problems, and anything else that could compromise the
							safety of our
							<span class="italic">wanderers</span>.
						</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="p-2.5 rounded-lg bg-grove-100 dark:bg-grove-900/30 flex-shrink-0">
						<AlertTriangle class="w-5 h-5 text-grove-700 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="font-serif text-foreground text-lg mb-1">Please Don't</h2>
						<p class="text-sm text-foreground-muted font-sans leading-relaxed">
							Access, modify, or delete data belonging to other users. Perform denial-of-service
							testing. Send unsolicited bulk messages. Use automated scanners aggressively against
							production. If you need a test account, reach out and I'll set one up for you.
						</p>
					</div>
				</div>
			</div>
		</GlassCard>

		<!-- Direct Contact -->
		<div class="mb-8">
			<a
				href="mailto:security@grove.place"
				class="flex items-center gap-4 p-4 rounded-xl border border-default bg-surface hover:bg-surface-hover transition-colors group"
			>
				<div class="p-3 rounded-lg bg-accent-subtle/20">
					<Mail class="w-5 h-5 text-accent-muted" />
				</div>
				<div class="flex-1">
					<p
						class="font-sans font-medium text-foreground group-hover:text-accent-muted transition-colors"
					>
						Email directly
					</p>
					<p class="text-sm text-foreground-subtle">
						security@grove.place — for sensitive reports or if you prefer email
					</p>
				</div>
			</a>
		</div>

		<!-- Report Form Toggle -->
		{#if !form?.success}
			<div class="text-center mb-6">
				<button
					onclick={() => (showForm = !showForm)}
					class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-grove-300 dark:border-grove-700 bg-grove-50/50 dark:bg-grove-900/20 text-grove-700 dark:text-grove-300 hover:bg-grove-100 dark:hover:bg-grove-900/40 transition-colors font-sans text-sm font-medium"
				>
					<Shield class="w-4 h-4" />
					{showForm ? "Hide report form" : "Submit a report"}
					<ChevronDown class="w-4 h-4 transition-transform {showForm ? 'rotate-180' : ''}" />
				</button>
				<p class="text-xs text-foreground-subtle font-sans mt-2">
					Or use the form below to report a vulnerability directly from this page.
				</p>
			</div>
		{/if}

		<!-- Success Message -->
		{#if form?.success && form?.reportId}
			<div role="status" aria-live="polite">
				<GlassCard
					class="mb-6 bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800"
				>
					<div class="flex items-start gap-4">
						<div
							class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0"
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
							<h2 class="text-lg font-serif text-green-900 dark:text-green-200 mb-1">
								Report received
							</h2>
							<p class="text-sm text-green-800 dark:text-green-300 font-sans mb-2">
								Your report ID is <strong>{form.reportId}</strong>. Keep this for your records.
							</p>
							<p class="text-sm text-green-700 dark:text-green-400 font-sans">
								You'll receive a confirmation email shortly. I'll review your report and follow up
								as soon as I can.
							</p>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}

		<!-- Error Message -->
		{#if form?.error}
			<div role="alert">
				<GlassCard class="mb-6 bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800">
					<div class="flex items-start gap-4">
						<div
							class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0"
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
							<p class="text-sm text-red-800 dark:text-red-300 font-sans">
								{form.error}
							</p>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}

		<!-- Report Form -->
		{#if showForm && !form?.success}
			<GlassCard class="mb-8">
				<form
					method="POST"
					action="?/report"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<!-- Severity Selection -->
					<fieldset class="mb-6">
						<legend class="block text-sm font-sans font-medium text-foreground mb-3">
							Estimated severity
						</legend>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{#each severityOptions as opt}
								<button
									type="button"
									onclick={() => (severity = opt.id)}
									aria-pressed={severity === opt.id}
									class="p-3 rounded-lg border transition-all text-left {severity === opt.id
										? opt.bg
										: 'border-grove-200 bg-white/50 text-foreground/70 hover:border-grove-300 dark:border-cream-300 dark:bg-cream-200/50 dark:hover:border-cream-400'}"
									disabled={submitting}
								>
									<span class="block text-sm font-medium {severity === opt.id ? opt.color : ''}"
										>{opt.label}</span
									>
									<span class="block text-xs opacity-70">{opt.description}</span>
								</button>
							{/each}
						</div>
						<input type="hidden" name="severity" value={severity} />
					</fieldset>

					<!-- Name -->
					<div class="mb-5">
						<label for="name" class="block text-sm font-sans font-medium text-foreground mb-2">
							Name <span class="text-foreground/40 font-normal">(optional)</span>
						</label>
						<input
							type="text"
							id="name"
							name="name"
							bind:value={name}
							placeholder="Your name or handle"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
					</div>

					<!-- Email -->
					<div class="mb-5">
						<label for="email" class="block text-sm font-sans font-medium text-foreground mb-2">
							Email <span class="text-red-600 dark:text-red-400">*</span>
						</label>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={email}
							placeholder="your.email@example.com"
							required
							aria-required="true"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
						<p class="text-xs text-foreground/50 mt-1 font-sans">
							So I can follow up and credit you
						</p>
					</div>

					<!-- Subject -->
					<div class="mb-5">
						<label for="subject" class="block text-sm font-sans font-medium text-foreground mb-2">
							Summary <span class="text-red-600 dark:text-red-400">*</span>
						</label>
						<input
							type="text"
							id="subject"
							name="subject"
							bind:value={subject}
							placeholder="Brief description of the vulnerability"
							required
							aria-required="true"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
					</div>

					<!-- Description -->
					<div class="mb-5">
						<label
							for="description"
							class="block text-sm font-sans font-medium text-foreground mb-2"
						>
							Details <span class="text-red-600 dark:text-red-400">*</span>
						</label>
						<textarea
							id="description"
							name="description"
							bind:value={description}
							placeholder="Describe the vulnerability, steps to reproduce, affected URLs, and any proof-of-concept. The more detail, the faster I can act."
							rows="8"
							required
							aria-required="true"
							minlength="20"
							maxlength="10000"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all resize-y"
							disabled={submitting}
						></textarea>
						<div class="flex justify-between items-center mt-2 text-xs font-sans">
							<span class="text-foreground/50">At least 20 characters</span>
							<span
								class={isValidLength
									? "text-grove-600 dark:text-grove-400"
									: charCount > 10000
										? "text-red-600 dark:text-red-400"
										: "text-foreground/50"}
							>
								{charCount.toLocaleString()}/10,000
							</span>
						</div>
					</div>

					<!-- Turnstile (only for guests) -->
					{#if !data.user}
						<div class="mb-6">
							<TurnstileWidget siteKey={data.turnstileKey} onverify={handleTurnstileVerify} />
							<input type="hidden" name="cf-turnstile-response" value={turnstileToken || ""} />
						</div>
					{/if}

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={submitting || !isValidLength || !hasEmail}
						class="w-full px-6 py-3 bg-grove-600 text-white rounded-lg font-sans font-medium hover:bg-grove-700 disabled:bg-grove-300 dark:disabled:bg-grove-800 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
							Submitting report...
						{:else}
							<Shield class="w-5 h-5" />
							Submit security report
						{/if}
					</button>
				</form>
			</GlassCard>
		{/if}

		<!-- machine-readable link -->
		<p class="text-center text-xs text-foreground-subtle font-sans mt-8">
			Machine-readable:
			<a href="/.well-known/security.txt" class="text-primary hover:text-primary/80 underline"
				>/.well-known/security.txt</a
			>
			(RFC 9116)
		</p>
	</div>
</main>

<Footer />
