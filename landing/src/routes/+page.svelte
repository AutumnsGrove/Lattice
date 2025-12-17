<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { page } from '$app/stores';

	// Get error from URL if present
	let error = $derived($page.url.searchParams.get('error'));

	let currentSlide = $state(0);
	const slides = [
		{
			title: 'Sign Up',
			description: 'Create your account in seconds',
			icon: 'signup'
		},
		{
			title: 'Choose Your Space',
			description: 'Pick a subdomain or bring your own',
			icon: 'domain'
		},
		{
			title: 'Start Growing',
			description: 'Write, publish, flourish',
			icon: 'blog'
		}
	];

	function nextSlide() {
		currentSlide = (currentSlide + 1) % slides.length;
	}

	function prevSlide() {
		currentSlide = (currentSlide - 1 + slides.length) % slides.length;
	}

	function goToSlide(index: number) {
		currentSlide = index;
	}
</script>

<svelte:head>
	<title>Grove — a place to Be</title>
	<meta name="description" content="A quiet corner of the internet where your words can grow and flourish. Sign up to be notified when Grove launches." />
</svelte:head>

<Header />

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Error Banner -->
	{#if error}
		<div class="mb-8 w-full max-w-md p-4 bg-error border border-error rounded-lg">
			<div class="flex items-start gap-3">
				<svg class="w-5 h-5 text-error flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
				</svg>
				<div>
					<p class="text-error font-sans font-medium">Sign in failed</p>
					<p class="text-error text-sm mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Logo/Brand -->
	<div class="mb-8">
		<Logo class="w-24 h-24" color="#16a34a" trunkColor="#6B4423" />
	</div>

	<!-- Title -->
	<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-3 text-center">Grove</h1>

	<!-- Tagline -->
	<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-12 text-center">
		a place to Be
	</p>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-12">
		<div class="w-12 h-px bg-divider"></div>
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- Coming soon text -->
	<p class="text-foreground-subtle text-center max-w-md mb-8 font-sans">
		Something is growing here. Leave your email to be the first to know when we bloom.
	</p>

	<!-- Email signup -->
	<EmailSignup />

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mt-16 mb-12">
		<div class="w-12 h-px bg-divider"></div>
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- How It Works - Slide Preview -->
	<section class="w-full max-w-lg">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-8">How It Works</h2>

		<!-- Slide Container -->
		<div class="relative bg-surface rounded-2xl border border-default p-8 min-h-[200px]">
			<!-- Slide Content -->
			<div class="flex flex-col items-center text-center">
				<!-- Icon -->
				<div class="w-16 h-16 mb-4 text-accent-muted">
					{#if slides[currentSlide].icon === 'signup'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
						</svg>
					{:else if slides[currentSlide].icon === 'domain'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
						</svg>
					{:else if slides[currentSlide].icon === 'blog'}
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
						</svg>
					{/if}
				</div>

				<!-- Step number -->
				<span class="text-sm font-sans text-accent-subtle mb-2">Step {currentSlide + 1}</span>

				<!-- Title -->
				<h3 class="text-xl font-serif text-foreground mb-2">{slides[currentSlide].title}</h3>

				<!-- Description -->
				<p class="text-foreground-subtle font-sans">{slides[currentSlide].description}</p>
			</div>

			<!-- Navigation Arrows -->
			<button
				onclick={prevSlide}
				class="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-accent-subtle hover:text-accent-muted transition-colors"
				aria-label="Previous slide"
			>
				<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
				</svg>
			</button>
			<button
				onclick={nextSlide}
				class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent-subtle hover:text-accent-muted transition-colors"
				aria-label="Next slide"
			>
				<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
				</svg>
			</button>
		</div>

		<!-- Dot Indicators -->
		<div class="flex justify-center gap-2 mt-4">
			{#each slides as _, i}
				<button
					onclick={() => goToSlide(i)}
					class="w-2 h-2 rounded-full transition-colors {currentSlide === i ? 'bg-accent-muted' : 'bg-divider hover:bg-accent-subtle'}"
					aria-label="Go to slide {i + 1}"
				></button>
			{/each}
		</div>
	</section>

	<!-- Sign In Section -->
	<div class="mt-16 text-center">
		<p class="text-foreground-faint text-sm font-sans mb-3">Already have an account?</p>
		<a
			href="/auth/login"
			class="btn-primary inline-flex items-center gap-2"
		>
			<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
				<path fill-rule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clip-rule="evenodd" />
				<path fill-rule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clip-rule="evenodd" />
			</svg>
			Sign In
		</a>
	</div>
</main>

<!-- Footer with theme toggle -->
<Footer showExternalLinks={true} />

<style>
	/* Background color utilities that need to be scoped */
	.bg-divider { background-color: var(--color-divider); }
</style>
