<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
</script>

<svelte:head>
	<title>Legal — Grove</title>
	<meta name="description" content="Legal documents and policies for the Grove platform." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<Header />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">Legal</h1>
				<p class="text-lg text-foreground-subtle font-sans">
					The policies that guide how we operate.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-divider"></div>
					<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			<!-- Policy Links -->
			<div class="grid gap-4">
				<a href="/knowledge/legal/terms-of-service" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						Terms of Service
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						The agreement between you and Grove for using the platform.
					</p>
				</a>

				<a href="/knowledge/legal/privacy-policy" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						Privacy Policy
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						How we collect, use, and protect your information. Spoiler: we don't sell your data.
					</p>
				</a>

				<a href="/knowledge/legal/acceptable-use-policy" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						Acceptable Use Policy
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						Community guidelines and content standards for a welcoming space.
					</p>
				</a>

				<a href="/knowledge/legal/dmca-policy" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						DMCA Policy
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						How we handle copyright claims and takedown requests.
					</p>
				</a>

				<a href="/knowledge/legal/refund-policy" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						Refund & Cancellation Policy
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						How refunds and cancellations work. No hoops, no hassle.
					</p>
				</a>

				<a href="/knowledge/legal/data-portability-separation" class="card p-6 hover:border-accent transition-colors group">
					<h2 class="text-lg font-serif text-foreground group-hover:text-accent-muted transition-colors mb-2">
						Data Portability & Separation
					</h2>
					<p class="text-foreground-subtle font-sans text-sm">
						Your content is yours. Here's exactly what happens when you leave.
					</p>
				</a>
			</div>

			<!-- Contact -->
			<div class="mt-12 text-center">
				<p class="text-foreground-subtle font-sans text-sm mb-2">
					Questions about our policies?
				</p>
				<p class="font-sans">
					<a href="mailto:autumnbrown23@pm.me" class="text-accent-muted hover:text-primary underline">
						autumnbrown23@pm.me
					</a>
				</p>
			</div>
		</div>
	</article>

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
