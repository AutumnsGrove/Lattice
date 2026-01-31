<script lang="ts">
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { TurnstileWidget } from '@autumnsgrove/groveengine/ui/forms';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { CreditCard, Wrench, User, Hand, HelpCircle } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Pre-fill from authenticated user
	let name = $state(data.user?.name || '');
	let email = $state(data.user?.email || '');
	let subject = $state('');
	let message = $state('');
	let category = $state<'billing' | 'technical' | 'account' | 'hello' | 'other'>('other');
	let turnstileToken = $state<string | null>(null);
	let submitting = $state(false);

	function handleTurnstileVerify(token: string) {
		turnstileToken = token;
	}

	const charCount = $derived(message.length);
	const isValidLength = $derived(charCount >= 10 && charCount <= 5000);
	const hasEmail = $derived(email.trim().length > 0);

	const categories = [
		{ id: 'billing', label: 'Billing', icon: CreditCard, description: 'Payments, subscriptions, refunds' },
		{ id: 'technical', label: 'Technical', icon: Wrench, description: 'Something isn\'t working' },
		{ id: 'account', label: 'Account', icon: User, description: 'Login, settings, data' },
		{ id: 'hello', label: 'Just saying hi', icon: Hand, description: 'No issue, just chatting' },
		{ id: 'other', label: 'Other', icon: HelpCircle, description: 'Anything else' },
	] as const;
</script>

<svelte:head>
	<title>Start a Visit - The Porch</title>
	<meta name="description" content="Start a support conversation with Grove. Tell us what's going on and we'll help you figure it out." />
</svelte:head>

<Header />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Page Header -->
		<div class="text-center mb-8">
			<div class="inline-block mb-6">
				<Logo class="w-16 h-16" season={seasonStore.current} />
			</div>
			<h1 class="text-3xl font-serif text-foreground mb-3">Start a Visit</h1>
			<p class="text-lg text-foreground-muted font-sans max-w-xl mx-auto">
				Tell me what's going on. I'll get back to you as soon as I can.
			</p>
		</div>

		<!-- Success Message -->
		{#if form?.success && form?.visitNumber}
			<div role="status" aria-live="polite">
				<GlassCard class="mb-6 bg-green-50/80 border-green-200">
					<div class="flex items-start gap-4">
					<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
						<svg class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-green-900 mb-1">Visit started!</h2>
						<p class="text-sm text-green-800 font-sans mb-2">
							Your visit number is <strong>{form.visitNumber}</strong>. I'll get back to you soon.
						</p>
						<p class="text-sm text-green-700 font-sans">
							You'll receive an email confirmation shortly.
							{#if data.user}
								<a href="/porch/visits" class="underline hover:no-underline">View your visits</a>
							{/if}
						</p>
					</div>
				</div>
			</GlassCard>
			</div>
		{/if}

		<!-- Error Message -->
		{#if form?.error}
			<div role="alert">
				<GlassCard class="mb-6 bg-red-50/80 border-red-200">
					<div class="flex items-start gap-4">
						<div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 flex-shrink-0">
							<svg class="w-6 h-6" viewBox="0 0 20 20" fill="currentColor">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
						<div class="flex-1">
							<p class="text-sm text-red-800 font-sans">{form.error}</p>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}

		<!-- Visit Form -->
		{#if !form?.success}
			<GlassCard>
				<form
					method="POST"
					action="?/submit"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<!-- Category Selection -->
					<fieldset class="mb-6">
						<legend class="block text-sm font-sans font-medium text-foreground mb-3">
							What's this about?
						</legend>
						<div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
							{#each categories as cat}
								<button
									type="button"
									onclick={() => category = cat.id}
									aria-pressed={category === cat.id}
									class="p-3 rounded-lg border transition-all text-left {category === cat.id
										? 'border-grove-500 bg-grove-50 text-grove-700'
										: 'border-grove-200 bg-white/50 text-foreground/70 hover:border-grove-300'}"
									disabled={submitting}
								>
									<svelte:component this={cat.icon} class="w-5 h-5 mb-1" />
									<span class="block text-sm font-medium">{cat.label}</span>
									<span class="block text-xs opacity-70">{cat.description}</span>
								</button>
							{/each}
						</div>
						<input type="hidden" name="category" value={category} />
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
							placeholder="How should I address you?"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
					</div>

					<!-- Email -->
					<div class="mb-5">
						<label for="email" class="block text-sm font-sans font-medium text-foreground mb-2">
							Email <span class="text-red-600">*</span>
						</label>
						<input
							type="email"
							id="email"
							name="email"
							bind:value={email}
							placeholder="your.email@example.com"
							required
							aria-required="true"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
						<p class="text-xs text-foreground/50 mt-1 font-sans">
							So I can get back to you
						</p>
					</div>

					<!-- Subject -->
					<div class="mb-5">
						<label for="subject" class="block text-sm font-sans font-medium text-foreground mb-2">
							Subject <span class="text-red-600">*</span>
						</label>
						<input
							type="text"
							id="subject"
							name="subject"
							bind:value={subject}
							placeholder="Brief summary of what's going on"
							required
							aria-required="true"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all"
							disabled={submitting}
						/>
					</div>

					<!-- Message -->
					<div class="mb-5">
						<label for="message" class="block text-sm font-sans font-medium text-foreground mb-2">
							What's going on? <span class="text-red-600">*</span>
						</label>
						<textarea
							id="message"
							name="message"
							bind:value={message}
							placeholder="Share the details. The more context you give me, the better I can help."
							rows="6"
							required
							aria-required="true"
							minlength="10"
							maxlength="5000"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all resize-y"
							disabled={submitting}
						></textarea>
						<div class="flex justify-between items-center mt-2 text-xs font-sans">
							<span class="text-foreground/50">At least 10 characters</span>
							<span class="{isValidLength ? 'text-grove-600' : charCount > 5000 ? 'text-red-600' : 'text-foreground/50'}">
								{charCount}/5000
							</span>
						</div>
					</div>

					<!-- Turnstile (only for guests) -->
					{#if !data.user}
						<div class="mb-6">
							<TurnstileWidget
								siteKey={data.turnstileKey}
								onverify={handleTurnstileVerify}
							/>
							<input type="hidden" name="cf-turnstile-response" value={turnstileToken || ''} />
						</div>
					{/if}

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={submitting || !isValidLength || !hasEmail}
						class="w-full px-6 py-3 bg-grove-600 text-white rounded-lg font-sans font-medium hover:bg-grove-700 disabled:bg-grove-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
					>
						{#if submitting}
							<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Starting visit...
						{:else}
							Start the conversation
						{/if}
					</button>
				</form>
			</GlassCard>
		{/if}

		<!-- Back Link -->
		<p class="text-center text-sm text-foreground-subtle font-sans mt-6">
			<a href="/porch" class="text-primary hover:text-primary/80 underline">Back to the Porch</a>
		</p>
	</div>
</main>

<Footer />
