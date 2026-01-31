<script lang="ts">
	import { untrack } from 'svelte';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { enhance } from '$app/forms';
	import { MailX, Check } from 'lucide-svelte';

	let { data, form } = $props();

	// Initialize email from URL param (intentionally captures initial value - form field should be editable)
	// Using untrack to explicitly capture the initial value without reactivity
	let email = $state(untrack(() => data.email || ''));
	let unsubscribeType: 'onboarding' | 'all' = $state('onboarding');
	let submitting = $state(false);
</script>

<SEO
	title="Unsubscribe — Grove"
	description="Manage your email preferences for Grove."
	url="/unsubscribe"
/>

<Header />

<main class="min-h-screen flex flex-col items-center px-6 py-16">
	<div class="max-w-md w-full">
		<!-- Header -->
		<div class="text-center mb-10">
			<div class="mb-6">
				<Logo class="w-12 h-12 mx-auto" season={seasonStore.current} />
			</div>
			<h1 class="text-2xl md:text-3xl font-serif text-foreground mb-3">Email preferences</h1>
			<p class="text-foreground-muted font-sans">
				Manage what you hear from us.
			</p>
		</div>

		{#if form?.success}
			<!-- Success state -->
			<div role="status" aria-live="polite" class="glass-card rounded-2xl p-8 text-center">
				<div class="w-16 h-16 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center">
					<Check class="w-8 h-8 text-accent" />
				</div>
				<h2 class="text-xl font-serif text-foreground mb-3">You're all set</h2>
				<p class="text-foreground-muted font-sans mb-6">
					Your email preferences have been updated. You won't receive those emails anymore.
				</p>
				<a
					href="/"
					class="inline-block px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors"
				>
					Back to Grove
				</a>
			</div>
		{:else}
			<!-- Unsubscribe form -->
			<div class="glass-card rounded-2xl p-8">
				<div class="w-14 h-14 mx-auto mb-6 rounded-full bg-accent-subtle/20 flex items-center justify-center">
					<MailX class="w-7 h-7 text-accent-muted" />
				</div>

				<form
					method="POST"
					use:enhance={() => {
						submitting = true;
						return async ({ update }) => {
							await update();
							submitting = false;
						};
					}}
				>
					<div class="space-y-6">
						<!-- Email input -->
						<div>
							<label for="email" class="block text-sm font-sans font-medium text-foreground mb-2">
								Email address
							</label>
							<input
								type="email"
								id="email"
								name="email"
								bind:value={email}
								required
								aria-required="true"
								class="w-full px-4 py-3 rounded-lg border border-default bg-surface text-foreground font-sans placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent-subtle focus:border-accent"
								placeholder="you@example.com"
							/>
						</div>

						<!-- Unsubscribe type -->
						<div class="space-y-3">
							<p class="text-sm font-sans font-medium text-foreground">What would you like to do?</p>

							<label class="flex items-start gap-3 p-3 rounded-lg border border-default hover:bg-surface-hover transition-colors cursor-pointer">
								<input
									type="radio"
									name="type"
									value="onboarding"
									bind:group={unsubscribeType}
									class="mt-1"
								/>
								<div>
									<p class="font-sans font-medium text-foreground">Stop update emails</p>
									<p class="text-sm text-foreground-subtle">No more check-ins or product updates. You'll still get important account emails if you sign up.</p>
								</div>
							</label>

							<label class="flex items-start gap-3 p-3 rounded-lg border border-default hover:bg-surface-hover transition-colors cursor-pointer">
								<input
									type="radio"
									name="type"
									value="all"
									bind:group={unsubscribeType}
									class="mt-1"
								/>
								<div>
									<p class="font-sans font-medium text-foreground">Remove me entirely</p>
									<p class="text-sm text-foreground-subtle">Unsubscribe from everything and remove your email from our list.</p>
								</div>
							</label>
						</div>

						{#if form?.error}
							<p role="alert" class="text-sm text-red-600 dark:text-red-400 font-sans">{form.error}</p>
						{/if}

						<button
							type="submit"
							disabled={submitting || !email}
							class="w-full px-6 py-3 bg-accent text-white rounded-lg font-sans font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{submitting ? 'Updating...' : 'Update preferences'}
						</button>
					</div>
				</form>

				<p class="text-xs text-foreground-subtle font-sans text-center mt-6">
					Changed your mind? You can always sign up again at <a href="/" class="text-accent hover:underline">grove.place</a>
				</p>
			</div>
		{/if}
	</div>
</main>

<Footer />

<style>
	.glass-card {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-divider);
	}

	:global(.dark) .glass-card {
		background: rgba(30, 41, 59, 0.5);
	}
</style>
