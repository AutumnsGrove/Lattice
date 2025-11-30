<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';

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

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Logo/Brand -->
	<div class="mb-8">
		<svg
			class="w-20 h-20 text-grove-600"
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<!-- Stylized tree/leaf mark -->
			<path
				d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
				fill="currentColor"
				fill-opacity="0.15"
			/>
			<path
				d="M50 20C40 32 30 40 30 55C30 70 38 80 50 80C62 80 70 70 70 55C70 40 60 32 50 20Z"
				fill="currentColor"
				fill-opacity="0.3"
			/>
			<path
				d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
				fill="currentColor"
			/>
			<!-- Stem -->
			<path d="M50 70V95" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
		</svg>
	</div>

	<!-- Title -->
	<h1 class="text-4xl md:text-5xl font-serif text-bark mb-3 text-center">Grove</h1>

	<!-- Tagline -->
	<p class="text-xl md:text-2xl text-bark/70 font-serif italic mb-12 text-center">
		a place to Be
	</p>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-12">
		<div class="w-12 h-px bg-grove-300"></div>
		<svg class="w-5 h-5 text-grove-400" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-grove-300"></div>
	</div>

	<!-- Coming soon text -->
	<p class="text-bark/60 text-center max-w-md mb-8 font-sans">
		Something is growing here. Leave your email to be the first to know when we bloom.
	</p>

	<!-- Email signup -->
	<EmailSignup />

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mt-16 mb-12">
		<div class="w-12 h-px bg-grove-300"></div>
		<svg class="w-5 h-5 text-grove-400" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-grove-300"></div>
	</div>

	<!-- How It Works - Slide Preview -->
	<section class="w-full max-w-lg">
		<h2 class="text-lg font-serif text-bark/70 text-center mb-8">How It Works</h2>

		<!-- Slide Container -->
		<div class="relative bg-white/50 rounded-2xl border border-grove-200 p-8 min-h-[200px]">
			<!-- Slide Content -->
			<div class="flex flex-col items-center text-center">
				<!-- Icon -->
				<div class="w-16 h-16 mb-4 text-grove-600">
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
				<span class="text-sm font-sans text-grove-500 mb-2">Step {currentSlide + 1}</span>

				<!-- Title -->
				<h3 class="text-xl font-serif text-bark mb-2">{slides[currentSlide].title}</h3>

				<!-- Description -->
				<p class="text-bark/60 font-sans">{slides[currentSlide].description}</p>
			</div>

			<!-- Navigation Arrows -->
			<button
				onclick={prevSlide}
				class="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-grove-400 hover:text-grove-600 transition-colors"
				aria-label="Previous slide"
			>
				<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
				</svg>
			</button>
			<button
				onclick={nextSlide}
				class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-grove-400 hover:text-grove-600 transition-colors"
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
					class="w-2 h-2 rounded-full transition-colors {currentSlide === i ? 'bg-grove-600' : 'bg-grove-300 hover:bg-grove-400'}"
					aria-label="Go to slide {i + 1}"
				></button>
			{/each}
		</div>
	</section>

	<!-- Footer -->
	<footer class="mt-20 mb-8 flex flex-col items-center gap-6">
		<!-- Links -->
		<div class="flex items-center gap-6 text-sm font-sans">
			<a
				href="https://autumnsgrove.com/blog"
				target="_blank"
				rel="noopener noreferrer"
				class="text-bark/50 hover:text-grove-600 transition-colors"
			>
				Blog
			</a>
			<span class="text-grove-300">·</span>
			<a
				href="https://github.com/AutumnsGrove/GroveEngine"
				target="_blank"
				rel="noopener noreferrer"
				class="text-bark/50 hover:text-grove-600 transition-colors flex items-center gap-1"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				Engine
			</a>
			<span class="text-grove-300">·</span>
			<a
				href="https://github.com/AutumnsGrove/AutumnsGrove"
				target="_blank"
				rel="noopener noreferrer"
				class="text-bark/50 hover:text-grove-600 transition-colors flex items-center gap-1"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
				</svg>
				Website
			</a>
		</div>

		<!-- Footer flourish -->
		<div class="flex gap-2">
			{#each [1, 2, 3] as i}
				<svg
					class="w-3 h-3 text-grove-300"
					viewBox="0 0 20 20"
					fill="currentColor"
					style="opacity: {0.3 + i * 0.2}"
				>
					<circle cx="10" cy="10" r="4" />
				</svg>
			{/each}
		</div>
	</footer>
</main>
