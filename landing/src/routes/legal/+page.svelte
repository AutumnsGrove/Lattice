<script lang="ts">
</script>

<svelte:head>
	<title>Legal — Grove</title>
	<meta name="description" content="Legal documents and policies for the Grove platform." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="py-6 px-6 border-b border-grove-200">
		<div class="max-w-3xl mx-auto flex items-center justify-between">
			<a href="/" class="text-xl font-serif text-bark hover:text-grove-600 transition-colors">Grove</a>
			<nav class="flex items-center gap-6 text-sm font-sans text-bark/60">
				<a href="/vision" class="hover:text-grove-600 transition-colors">Vision</a>
				<a href="/pricing" class="hover:text-grove-600 transition-colors">Pricing</a>
			</nav>
		</div>
	</header>

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<h1 class="text-4xl md:text-5xl font-serif text-bark mb-4">Legal</h1>
				<p class="text-lg text-bark/60 font-sans">
					The policies that guide how we operate.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-grove-300"></div>
					<svg class="w-4 h-4 text-grove-400" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-grove-300"></div>
				</div>
			</header>

			<!-- Policy Links -->
			<div class="grid gap-4">
				<a href="/legal/terms" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						Terms of Service
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						The agreement between you and Grove for using the platform.
					</p>
				</a>

				<a href="/legal/privacy" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						Privacy Policy
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						How we collect, use, and protect your information. Spoiler: we don't sell your data.
					</p>
				</a>

				<a href="/legal/acceptable-use" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						Acceptable Use Policy
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						Community guidelines and content standards for a welcoming space.
					</p>
				</a>

				<a href="/legal/dmca" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						DMCA Policy
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						How we handle copyright claims and takedown requests.
					</p>
				</a>

				<a href="/legal/refund" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						Refund & Cancellation Policy
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						How refunds and cancellations work. No hoops, no hassle.
					</p>
				</a>

				<a href="/legal/data-portability" class="card p-6 hover:border-grove-400 transition-colors group">
					<h2 class="text-lg font-serif text-bark group-hover:text-grove-700 transition-colors mb-2">
						Data Portability & Separation
					</h2>
					<p class="text-bark/60 font-sans text-sm">
						Your content is yours. Here's exactly what happens when you leave.
					</p>
				</a>
			</div>

			<!-- Contact -->
			<div class="mt-12 text-center">
				<p class="text-bark/60 font-sans text-sm mb-2">
					Questions about our policies?
				</p>
				<p class="text-bark font-sans">
					<a href="mailto:autumn@grove.place" class="text-grove-600 hover:text-grove-700 underline">
						autumn@grove.place
					</a>
				</p>
			</div>
		</div>
	</article>

	<!-- Footer -->
	<footer class="py-8 border-t border-grove-200">
		<div class="max-w-3xl mx-auto px-6">
			<div class="flex items-center justify-center gap-4 text-sm font-sans text-bark/50">
				<a href="/" class="hover:text-grove-600 transition-colors">Home</a>
				<span class="text-grove-300">·</span>
				<a href="/vision" class="hover:text-grove-600 transition-colors">Vision</a>
				<span class="text-grove-300">·</span>
				<a href="/pricing" class="hover:text-grove-600 transition-colors">Pricing</a>
			</div>
		</div>
	</footer>
</main>
