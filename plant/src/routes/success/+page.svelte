<script lang="ts">
	import { onMount } from 'svelte';
	import { Check, Loader2, Lightbulb, ArrowRight, X } from 'lucide-svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';

	let { data } = $props();

	let status = $state<'verifying' | 'creating' | 'ready' | 'error'>('verifying');
	let errorMessage = $state<string | null>(null);
	let tenant = $state<{ subdomain: string } | null>(null);

	onMount(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		// Async initialization
		(async () => {
			// If tenant already exists, we're ready
			if (data.onboarding?.tenantCreated && data.onboarding?.tenantId) {
				tenant = { subdomain: data.user?.username || '' };
				status = 'ready';
				return;
			}

			// Otherwise, poll for tenant creation (webhook might still be processing)
			let attempts = 0;
			const maxAttempts = 30; // 30 seconds max

			const checkTenant = async () => {
				try {
					const res = await fetch('/success/check');
					const result = (await res.json()) as { ready?: boolean; creating?: boolean; subdomain?: string };

					if (result.ready) {
						tenant = { subdomain: result.subdomain || '' };
						status = 'ready';
						return true;
					}

					if (result.creating) {
						status = 'creating';
					}

					return false;
				} catch {
					return false;
				}
			};

			// Initial check
			if (await checkTenant()) return;

			// Poll every second
			interval = setInterval(async () => {
				attempts++;

				if (await checkTenant()) {
					if (interval) clearInterval(interval);
					return;
				}

				if (attempts >= maxAttempts) {
					if (interval) clearInterval(interval);
					status = 'error';
					errorMessage = 'Setup is taking longer than expected. Please refresh the page or contact support.';
				}
			}, 1000);
		})();

		return () => {
			if (interval) clearInterval(interval);
		};
	});
</script>

<div class="animate-fade-in">
	{#if status === 'verifying' || status === 'creating'}
		<!-- Loading state -->
		<div class="text-center">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent mb-6">
				<Loader2 size={40} class="animate-spin text-primary" />
			</div>

			<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
				{status === 'verifying' ? 'Verifying payment...' : 'Setting up your blog...'}
			</h1>

			<p class="text-foreground-muted max-w-md mx-auto">
				{status === 'verifying'
					? "We're confirming your payment with Stripe."
					: "We're creating your blog at " + (data.user?.username || 'your') + '.grove.place'}
			</p>

			<div class="mt-8 flex justify-center gap-2">
				<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 0ms"></div>
				<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 150ms"></div>
				<div class="w-2 h-2 rounded-full bg-primary animate-bounce" style="animation-delay: 300ms"></div>
			</div>
		</div>
	{:else if status === 'error'}
		<!-- Error state -->
		<div class="text-center">
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-error-bg mb-6">
				<X size={40} class="text-error" />
			</div>

			<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
				Something went wrong
			</h1>

			<p class="text-foreground-muted max-w-md mx-auto mb-6">
				{errorMessage}
			</p>

			<div class="flex flex-col sm:flex-row gap-3 justify-center">
				<button onclick={() => window.location.reload()} class="btn-primary">
					Try Again
				</button>
				<a href="mailto:support@grove.place" class="btn-secondary">
					Contact Support
				</a>
			</div>
		</div>
	{:else if status === 'ready' && tenant}
		<!-- Success state -->
		<div class="text-center">
			<GlassCard variant="accent" class="max-w-md mx-auto mb-8">
				<div class="flex flex-col items-center">
					<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-bg mb-6">
						<Check size={40} class="text-success" />
					</div>

					<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-3">
						Your blog is ready!
					</h1>

					<p class="text-foreground-muted mb-2">
						Welcome to Grove, {data.user?.displayName || 'friend'}!
					</p>
					<p class="text-lg text-primary font-medium">
						{tenant.subdomain}.grove.place
					</p>
				</div>
			</GlassCard>

			<!-- What's next -->
			<GlassCard variant="frosted" class="max-w-md mx-auto mb-8 text-left">
				<h2 class="font-medium text-foreground mb-4 flex items-center gap-2">
					<Lightbulb size={18} class="text-primary" />
					What's next?
				</h2>

				<ul class="space-y-3">
					<li class="flex items-start gap-3">
						<div class="w-6 h-6 rounded-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
							<span class="text-xs font-medium text-primary">1</span>
						</div>
						<div>
							<p class="font-medium text-foreground">Take a quick tour</p>
							<p class="text-sm text-foreground-muted">See what your blog can do (5 min)</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<div class="w-6 h-6 rounded-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
							<span class="text-xs font-medium text-primary">2</span>
						</div>
						<div>
							<p class="font-medium text-foreground">Write your first post</p>
							<p class="text-sm text-foreground-muted">Share something you've been thinking about</p>
						</div>
					</li>
					<li class="flex items-start gap-3">
						<div class="w-6 h-6 rounded-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
							<span class="text-xs font-medium text-primary">3</span>
						</div>
						<div>
							<p class="font-medium text-foreground">Make it yours</p>
							<p class="text-sm text-foreground-muted">Customize your theme and add vines</p>
						</div>
					</li>
				</ul>
			</GlassCard>

			<!-- Action buttons -->
			<div class="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
				<a href="/tour" class="btn-primary flex-1 justify-center">
					Take the Tour
					<ArrowRight size={18} />
				</a>
				<a
					href="https://{tenant.subdomain}.grove.place/admin?welcome=true"
					class="btn-secondary flex-1 justify-center"
				>
					Skip to My Blog
				</a>
			</div>
		</div>
	{/if}
</div>

<style>
	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-6px); }
	}
</style>
