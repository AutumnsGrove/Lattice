<script lang="ts">
	const capabilities = [
		{ icon: 'image', title: 'Images', description: 'JPEG, PNG, GIF, WebP, AVIF, SVG' },
		{ icon: 'file', title: 'Documents', description: 'PDF files' },
		{ icon: 'video', title: 'Media', description: 'MP4, WebM video and audio' },
		{ icon: 'type', title: 'Fonts', description: 'WOFF, WOFF2, TTF, OTF' },
		{ icon: 'code', title: 'Code', description: 'JSON, CSS, JavaScript' }
	];
</script>

<svelte:head>
	<title>Grove CDN - Content Delivery Network</title>
	<meta
		name="description"
		content="Fast, reliable content delivery powered by Cloudflare's global network."
	/>
</svelte:head>

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Logo/Brand -->
	<div class="mb-6">
		<svg
			class="w-16 h-16 text-grove-600"
			viewBox="0 0 100 100"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<!-- CDN Network Icon -->
			<circle cx="50" cy="50" r="8" fill="currentColor" />
			<circle cx="25" cy="25" r="5" fill="currentColor" fill-opacity="0.6" />
			<circle cx="75" cy="25" r="5" fill="currentColor" fill-opacity="0.6" />
			<circle cx="25" cy="75" r="5" fill="currentColor" fill-opacity="0.6" />
			<circle cx="75" cy="75" r="5" fill="currentColor" fill-opacity="0.6" />
			<path
				d="M50 42L29 29M50 42L71 29M50 58L29 71M50 58L71 71"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				opacity="0.4"
			/>
		</svg>
	</div>

	<!-- Title -->
	<h1 class="text-3xl md:text-4xl font-serif text-bark mb-2 text-center">Grove CDN</h1>

	<!-- Tagline -->
	<p class="text-lg text-bark/60 font-sans mb-8 text-center">
		Fast, reliable content delivery
	</p>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-10">
		<div class="w-8 h-px bg-grove-300"></div>
		<svg class="w-4 h-4 text-grove-400" viewBox="0 0 20 20" fill="currentColor">
			<circle cx="10" cy="10" r="3" />
		</svg>
		<div class="w-8 h-px bg-grove-300"></div>
	</div>

	<!-- Capabilities Grid -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-sm font-sans text-bark/50 text-center mb-6 uppercase tracking-wider">
			Supported Content Types
		</h2>

		<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
			{#each capabilities as cap}
				<div
					class="bg-white/80 border border-grove-200 rounded-xl p-4 text-center hover:border-grove-300 transition-colors"
				>
					<div class="w-10 h-10 mx-auto mb-3 text-grove-500">
						{#if cap.icon === 'image'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
								/>
							</svg>
						{:else if cap.icon === 'file'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
								/>
							</svg>
						{:else if cap.icon === 'video'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
								/>
							</svg>
						{:else if cap.icon === 'type'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4.5 12h15m-15 0a3 3 0 0 1-.75-5.916M4.5 12a3 3 0 0 0-.75 5.916M4.5 12H3m16.5 0a3 3 0 0 0 .75-5.916M19.5 12a3 3 0 0 1 .75 5.916M19.5 12H21M8.25 4.5V6m7.5-1.5V6m-10.5 3h13.5"
								/>
							</svg>
						{:else if cap.icon === 'code'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
								/>
							</svg>
						{/if}
					</div>
					<h3 class="font-serif text-bark text-sm mb-1">{cap.title}</h3>
					<p class="text-xs text-bark/50 font-sans">{cap.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Features -->
	<section class="w-full max-w-md mb-12">
		<div class="space-y-4 text-center">
			<div class="flex items-center justify-center gap-3 text-bark/70">
				<svg class="w-5 h-5 text-grove-500" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="font-sans text-sm">Global edge network</span>
			</div>
			<div class="flex items-center justify-center gap-3 text-bark/70">
				<svg class="w-5 h-5 text-grove-500" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="font-sans text-sm">Automatic caching</span>
			</div>
			<div class="flex items-center justify-center gap-3 text-bark/70">
				<svg class="w-5 h-5 text-grove-500" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="font-sans text-sm">HTTPS everywhere</span>
			</div>
		</div>
	</section>

	<!-- Back to Grove -->
	<a
		href="/"
		class="inline-flex items-center gap-2 text-grove-600 hover:text-grove-700 font-sans text-sm transition-colors"
	>
		<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
			<path
				fill-rule="evenodd"
				d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
				clip-rule="evenodd"
			/>
		</svg>
		Back to Grove
	</a>

	<!-- Footer -->
	<footer class="mt-16 text-center">
		<p class="text-xs text-bark/40 font-sans">
			Powered by <a href="https://cloudflare.com" class="hover:text-grove-600 transition-colors">Cloudflare R2</a>
		</p>
	</footer>
</main>
