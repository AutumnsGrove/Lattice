<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

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
	<!-- Header with logo and progress -->
	<header class="border-b border-default bg-surface-elevated/80 backdrop-blur-sm">
		<div class="max-w-2xl mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<!-- Logo -->
				<a href="https://grove.place" class="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
					<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z" fill="currentColor" fill-opacity="0.15"/>
						<path d="M50 20C40 32 30 40 30 55C30 70 38 80 50 80C62 80 70 70 70 55C70 40 60 32 50 20Z" fill="currentColor" fill-opacity="0.3"/>
						<path d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z" fill="currentColor"/>
						<path d="M50 70V95" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
					</svg>
					<span class="font-medium">Grove</span>
				</a>

				<!-- Progress steps (hidden on step 1) -->
				{#if currentStep > 1}
					<div class="step-indicator">
						{#each steps as step}
							<div
								class="step-dot"
								class:active={step.num === currentStep}
								class:completed={step.num < currentStep}
								title={step.label}
							></div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</header>

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
