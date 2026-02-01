<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import SEO from '$lib/components/SEO.svelte';
	import { RoadmapPreview } from '@autumnsgrove/groveengine/ui';
	import { page } from '$app/state';

	let { data } = $props();

	// Lucide icons
	import {
		Map,
		BookOpen,
		Trees,
		HandCoins,
		Leaf,
		Shield,
		Users,
		Download,
		ArrowRight,
		Sprout,
		ChevronDown
	} from 'lucide-svelte';

	// Get error from URL if present
	let error = $derived(page.url.searchParams.get('error'));

	// Toggle season on logo click
	function handleLogoClick() {
		seasonStore.cycle();
	}

	// FAQ data
	const faqItems = [
		{
			id: 'what-is-grove',
			question: 'What is Grove?',
			answer: 'Grove is a blogging platform where your words stay yours. You get your own subdomain (yourname.grove.place), a clean writing experience, and protection from AI scrapers. No ads, no algorithms, no data harvesting.'
		},
		{
			id: 'how-different',
			question: 'How is Grove different from other platforms?',
			answer: "Most platforms make money by showing you ads or selling your data. Grove makes money by charging a fair price for a good service. You're the customer, not the product. We don't track your readers, we don't train AI on your writing, and we don't manipulate what people see."
		},
		{
			id: 'ai-protection',
			question: 'Is my writing safe from AI training?',
			answer: "Yes. Every Grove blog is protected by Shade — our defense system that blocks AI crawlers and scraping bots. Your words are never used to train AI models. We're building a corner of the internet where human creativity stays human."
		},
		{
			id: 'data-ownership',
			question: 'What happens to my data?',
			answer: "Your content belongs to you. Export everything anytime in standard formats (Markdown, JSON). If you leave, your data leaves with you. We don't hold your words hostage."
		},
		{
			id: 'custom-domain',
			question: 'Can I use my own domain?',
			answer: "Yes! Oak tier lets you bring a domain you already own. Evergreen tier includes domain registration — we'll find and set up the perfect domain for you."
		},
		{
			id: 'shutdown',
			question: 'What if Grove shuts down?',
			answer: "After 12 months on a paid plan, your blog earns Centennial status — it stays online as a read-only archive for 100 years, even if you stop paying or Grove closes. Your words outlive the platform."
		},
		{
			id: 'pricing',
			question: 'How much does it cost?',
			answer: "Reading is always free. Writing starts at $8/month (Seedling). We're launching with one simple plan and adding more tiers as we grow. See the pricing page for details."
		}
	];

	// FAQ expansion state
	let expandedFaq = $state<Set<string>>(new Set());

	function toggleFaq(id: string) {
		if (expandedFaq.has(id)) {
			expandedFaq.delete(id);
			expandedFaq = new Set(expandedFaq);
		} else {
			expandedFaq.add(id);
			expandedFaq = new Set(expandedFaq);
		}
	}

</script>

<SEO
	title="Grove — A place to Be"
	description="A quiet corner of the web where your words can grow. Your own subdomain, no AI training, no algorithms, no ads. Just you and your voice."
	url="/"
/>

<Header
	user={data.user}
	userHref={data.groveUrl ?? undefined}
	signInHref="https://plant.grove.place"
	signInLabel="Sign up"
/>

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Error Banner -->
	{#if error}
		<div role="alert" class="mb-8 w-full max-w-md p-4 bg-error border border-error rounded-lg">
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
		<button
			onclick={handleLogoClick}
			class="transition-transform hover:scale-110 active:scale-95"
			aria-label="Toggle season theme"
			title="Click to change season"
		>
			<Logo size={128} season={seasonStore.current} />
		</button>
	</div>

	<!-- Title -->
	<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-2 text-center">Grove</h1>

	<!-- Tagline -->
	<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-4 text-center">
		A place to Be.
	</p>

	<!-- Subtagline -->
	<p class="text-base md:text-lg text-foreground-subtle font-sans max-w-lg text-center mb-8 leading-relaxed">
		Your own subdomain, no AI training, no algorithms, no ads. Just you and your voice.
	</p>

	<!-- Launch Notice -->
	<div class="w-full max-w-md mb-8">
		<div class="glass-grove rounded-xl p-4 border-l-4 border-accent-muted">
			<p class="text-foreground font-sans text-sm leading-relaxed">
				<span class="font-medium">Grove is ready.</span> Awaiting payment processor verification. End of February.
			</p>
		</div>
	</div>

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

	<!-- CTA Links -->
	<div class="text-center max-w-md mb-12">
		<p class="text-foreground-muted text-lg font-sans leading-relaxed mb-4">
			A quiet corner of the internet where your words can grow — and stay yours.
		</p>

		<!-- Quick explainer link -->
		<a
			href="/knowledge/marketing/grove-at-a-glance"
			class="inline-flex items-center gap-1.5 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors mb-6"
		>
			<BookOpen class="w-4 h-4" />
			<span>30-second overview</span>
			<ArrowRight class="w-3 h-3" />
		</a>

		<!-- Primary CTA: Plant your blog -->
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-base mb-4"
		>
			Plant Your Blog
			<Sprout class="w-4 h-4" />
		</a>
		<p class="text-foreground-subtle text-sm font-sans mb-6">
			Signups open end of February. Feel free to look around.
		</p>

		<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
			<a
				href="/knowledge/help/what-is-grove"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				What is Grove?
				<Leaf class="w-4 h-4" />
			</a>
			<a
				href="/vision"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				Our Vision
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</div>

	<!-- Quick Links -->
	<div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-12">
		<a
			href="/roadmap"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Map class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Roadmap</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/knowledge"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<BookOpen class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Knowledge</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/forest"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Trees class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Forest</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/pricing"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<HandCoins class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Pricing</span>
		</a>
	</div>

	<!-- Roadmap Preview Card -->
	<section class="w-full max-w-lg mb-16">
		<RoadmapPreview
			phase="Thaw"
			subtitle="The ice begins to crack"
			description="Grove opens its doors. The first trees take root."
			progress={33}
			href="/roadmap"
		/>
	</section>

	<!-- Who is Grove for? -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-6">Who is Grove for?</h2>

		<div class="glass-grove rounded-xl p-6 space-y-4">
			<p class="text-foreground-subtle font-sans leading-relaxed">
				Writers who want a home on the internet without the surveillance, manipulation, and noise of social media. People who remember when the web felt personal.
			</p>
			<p class="text-foreground-subtle font-sans leading-relaxed">
				<span class="text-foreground font-medium">Neurodivergent folks</span> who hate the endless customization rabbit holes. <span class="text-foreground font-medium">Queer people</span> who want safe digital spaces. Anyone who's tired of being the product.
			</p>
			<p class="text-foreground font-sans leading-relaxed font-medium">
				Your words are yours. Not a dataset. Not a statistic. Yours.
			</p>
		</div>
	</section>

	<!-- Why I Built This -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-6">Why I built this</h2>

		<div class="glass-grove rounded-xl p-6 space-y-4">
			<p class="text-foreground-subtle font-sans leading-relaxed">
				Remember when the internet felt personal? When you had your little corner of it. When you weren't performing for an algorithm. When your words belonged to you.
			</p>
			<p class="text-foreground-subtle font-sans leading-relaxed">
				I built Grove because I think we can have that again.
			</p>
			<p class="text-foreground-subtle font-sans leading-relaxed">
				I'm tired of my friends being trapped in dopamine slot machines designed to exploit neurodivergent minds. So I built something different — a platform that doesn't spy on you, doesn't train AI on your words, doesn't make you compete for attention. A place where you can just... write.
			</p>
			<p class="text-foreground-subtle font-sans leading-relaxed italic">
				— Autumn, founder
			</p>
		</div>
	</section>

	<!-- What You Get -->
	<section class="w-full max-w-2xl mb-8">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-6">What you get</h2>

		<div class="glass-grove rounded-xl p-6">
			<ul class="space-y-3 text-foreground-subtle font-sans">
				<li class="flex items-start gap-3">
					<Leaf class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
					<span><span class="text-foreground font-medium">yourname.grove.place</span> — a website that's yours</span>
				</li>
				<li class="flex items-start gap-3">
					<Shield class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
					<span><span class="text-foreground font-medium">Shade protection</span> — AI companies send bots to scrape websites and train their models on your writing. Grove blocks them.</span>
				</li>
				<li class="flex items-start gap-3">
					<Users class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
					<span><span class="text-foreground font-medium">No algorithms, no ads</span> — you're the customer, not the product</span>
				</li>
				<li class="flex items-start gap-3">
					<Download class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
					<span><span class="text-foreground font-medium">Take your stuff and go</span> — export everything anytime, your content lives in standard formats</span>
				</li>
			</ul>
		</div>
	</section>

	<!-- FAQ Section -->
	<section id="faq" class="w-full max-w-2xl mb-12 scroll-mt-24">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-6">Frequently Asked Questions</h2>

		<div class="glass-grove rounded-xl p-6">
			<div class="space-y-3 text-sm font-sans">
				{#each faqItems as item (item.id)}
					{@const isExpanded = expandedFaq.has(item.id)}
					<div class="border-b border-subtle last:border-0 pb-3 last:pb-0">
						<button
							type="button"
							onclick={() => toggleFaq(item.id)}
							class="w-full flex items-center justify-between text-left group py-1"
							aria-expanded={isExpanded}
							aria-controls="faq-{item.id}"
						>
							<span class="font-medium text-foreground group-hover:text-accent-muted transition-colors pr-4">
								{item.question}
							</span>
							<ChevronDown
								class="w-4 h-4 text-foreground-faint flex-shrink-0 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}"
							/>
						</button>

						{#if isExpanded}
							<div
								id="faq-{item.id}"
								class="mt-2 text-foreground-muted leading-relaxed"
							>
								{item.answer}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mt-8 mb-12">
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
	<p class="text-foreground-subtle text-center max-w-md mb-8 font-sans text-sm">
		Want to be notified when we launch?
	</p>

	<!-- Email signup -->
	<EmailSignup />

	<!-- Pricing teaser -->
	<section class="w-full max-w-md mb-12 text-center">
		<p class="text-foreground font-sans font-medium mb-2">
			Reading is free. Always.
		</p>
		<p class="text-foreground-muted font-sans mb-4">
			Every Grove blog is publicly accessible — just visit and read, no account needed. When you're ready to write your own, plans start at <span class="text-foreground font-medium">$8/month</span>.
		</p>
		<a
			href="/pricing"
			class="inline-flex items-center gap-2 text-accent-muted hover:text-accent font-sans transition-colors"
		>
			<HandCoins class="w-4 h-4" />
			See all plans
			<ArrowRight class="w-4 h-4" />
		</a>
	</section>

</main>

<!-- Footer -->
<Footer />

<style>
	/* Background color utilities that need to be scoped */
	.bg-divider { background-color: var(--color-divider); }

	/* Glass effect now defined globally in app.css */
</style>