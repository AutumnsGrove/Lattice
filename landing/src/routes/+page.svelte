<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
</script>

<svelte:head>
	<title>Grove</title>
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

	<!-- Footer flourish -->
	<div class="mt-16 flex gap-2">
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
</main>
