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
						<!-- Trunk -->
						<path d="M50 95 Q48 75 50 55" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>
						<!-- Left leaf -->
						<g transform="translate(28, 62) rotate(-35)">
							<path d="M0 0C-5 -8 -5 -16 0 -22C5 -16 5 -8 0 0Z" fill="currentColor" fill-opacity="0.15"/>
							<path d="M0 -2C-3.5 -8 -3.5 -14 0 -19C3.5 -14 3.5 -8 0 -2Z" fill="currentColor" fill-opacity="0.3"/>
							<path d="M0 -5C-2 -9 -2 -13 0 -16C2 -13 2 -9 0 -5Z" fill="currentColor"/>
						</g>
						<!-- Right leaf -->
						<g transform="translate(72, 52) rotate(40)">
							<path d="M0 0C-6 -9 -6 -18 0 -25C6 -18 6 -9 0 0Z" fill="currentColor" fill-opacity="0.15"/>
							<path d="M0 -3C-4 -9 -4 -16 0 -21C4 -16 4 -9 0 -3Z" fill="currentColor" fill-opacity="0.3"/>
							<path d="M0 -6C-2.5 -10 -2.5 -14 0 -17C2.5 -14 2.5 -10 0 -6Z" fill="currentColor"/>
						</g>
						<!-- Top leaf -->
						<g transform="translate(50, 30)">
							<path d="M0 0C-8 -12 -8 -24 0 -32C8 -24 8 -12 0 0Z" fill="currentColor" fill-opacity="0.15"/>
							<path d="M0 -4C-5.5 -12 -5.5 -20 0 -27C5.5 -20 5.5 -12 0 -4Z" fill="currentColor" fill-opacity="0.3"/>
							<path d="M0 -8C-3.5 -14 -3.5 -20 0 -24C3.5 -20 3.5 -14 0 -8Z" fill="currentColor"/>
						</g>
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
