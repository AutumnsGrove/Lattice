<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { GlassNavbar } from '@autumnsgrove/groveengine/ui';

	// Determine current step based on route
	let currentStep = $derived((() => {
		const path = page.url.pathname;
		if (path === '/') return 1;
		if (path === '/profile') return 2;
		if (path === '/plans') return 3;
		if (path === '/checkout') return 4;
		if (path === '/success' || path === '/tour') return 5;
		return 1;
	})());

	const steps = [
		{ num: 1, label: 'Sign In' },
		{ num: 2, label: 'Profile' },
		{ num: 3, label: 'Plan' },
		{ num: 4, label: 'Payment' },
		{ num: 5, label: 'Done' }
	];

	let { children } = $props();
</script>

<svelte:head>
	<title>Plant Your Blog - Grove</title>
</svelte:head>

<div class="min-h-screen bg-page leaf-pattern">
	<!-- Glass navbar with progress steps -->
	<GlassNavbar logoHref="https://grove.place" title="Grove" maxWidth="narrow">
		{#snippet actions()}
			<!-- Progress steps (hidden on step 1) -->
			{#if currentStep > 1}
				<div class="step-indicator">
					{#each steps as step}
						<div
							class="step-dot {step.num === currentStep ? 'active' : ''} {step.num < currentStep ? 'completed' : ''}"
							title={step.label}
						></div>
					{/each}
				</div>
			{/if}
		{/snippet}
	</GlassNavbar>

	<!-- Main content -->
	<main class="max-w-2xl mx-auto px-4 py-8 md:py-12">
		{@render children()}
	</main>

	<!-- Footer -->
	<footer class="border-t border-default bg-surface-elevated/50 mt-auto">
		<div class="max-w-2xl mx-auto px-4 py-6">
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-foreground-subtle">
				<p>Already have a blog? <a href="https://grove.place" class="text-primary hover:underline">Sign in</a></p>
				<div class="flex items-center gap-4">
					<a href="https://grove.place/legal/terms" class="hover:text-foreground transition-colors">Terms</a>
					<a href="https://grove.place/legal/privacy" class="hover:text-foreground transition-colors">Privacy</a>
					<a href="https://grove.place/pricing" class="hover:text-foreground transition-colors">Pricing</a>
				</div>
			</div>
		</div>
	</footer>
</div>
