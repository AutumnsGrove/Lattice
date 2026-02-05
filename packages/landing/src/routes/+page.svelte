<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import SEO from '$lib/components/SEO.svelte';
	import { RoadmapPreview, GroveTerm, GlassCarousel, GlassCard } from '@autumnsgrove/groveengine/ui';
	import { page } from '$app/state';

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
		ChevronDown,
		PenLine,
		Image as ImageIcon,
		ChevronRight
	} from 'lucide-svelte';

	let { data } = $props();

	// Get error from URL if present
	let error = $derived(page.url.searchParams.get('error'));

	// Toggle season on logo click
	function handleLogoClick() {
		seasonStore.cycle();
	}

	// Hero carousel slides - using prepared marketing images
	const heroSlides = [
		{
			src: '/assets/carousel/hero-slide-1.png',
			alt: 'A grove for people who lost their groves. Five seasonal Grove tree logos in pink, green, orange, blue, and purple. Plant your blog for $8/mo. No ads. No algorithms. Just your words.'
		},
		{
			src: '/assets/carousel/hero-slide-2.png',
			alt: 'Your words. Your space. Forever. A Grove tree logo next to you.grove.place domain showcase. Claim yours button.'
		},
		{
			src: '/assets/carousel/hero-slide-3.png',
			alt: '100 year domain guarantee. Some trees outlive the people who planted them. Your words remain accessible from 2026 to 2126. Plant your legacy button.'
		},
		{
			src: '/assets/carousel/hero-slide-4.png',
			alt: 'No algorithms. No engagement metrics. Just you. Four seasonal Grove tree logos. Find your peace button.'
		},
		{
			src: '/assets/carousel/hero-slide-5.png',
			alt: 'The internet should belong to everyone. Autumn-colored Grove tree logo. Become a Seedling for $8/mo button.'
		}
	];

	// Feature showcase items with visual cards
	const features = [
		{
			title: 'Flow Editor',
			description: 'Write in a clean, focused environment with markdown support and live preview.',
			icon: PenLine,
			href: '/knowledge/features/flow-editor'
		},
		{
			title: 'Shade Protection',
			description: 'AI scrapers and bots are blocked automatically. Your creativity stays human.',
			icon: Shield,
			href: '/knowledge/features/shade'
		},
		{
			title: 'Custom Domains',
			description: 'Use yourname.grove.place or bring your own domain. Make it truly yours.',
			icon: Trees,
			href: '/knowledge/features/domains'
		},
		{
			title: 'Gallery Curio',
			description: 'Beautiful image galleries with lightbox viewing. Share your visual stories.',
			icon: ImageIcon,
			href: '/knowledge/features/gallery'
		}
	];

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

<main class="min-h-screen flex flex-col items-center px-6 py-12">
	<!-- Error Banner -->
	{#if error}
		<div role="alert" class="mb-8 w-full max-w-md p-4 bg-error border border-error rounded-lg">
			<div class="flex items-start gap-3">
				<svg class="w-5 h-5 text-error flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
				</svg>
				<div>
					<p class="text-error font-sans font-medium">Sign in failed</p>
					<p class="text-error text-sm mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Hero Section -->
	<section class="w-full max-w-4xl text-center mb-12">
		<!-- Logo/Brand -->
		<div class="mb-6">
			<button
				onclick={handleLogoClick}
				class="transition-transform hover:scale-110 active:scale-95 inline-block"
				aria-label="Toggle season theme"
				title="Click to change season"
			>
				<Logo size={96} season={seasonStore.current} />
			</button>
		</div>

		<!-- Title -->
		<h1 class="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-3">Grove</h1>

		<!-- Tagline -->
		<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-4">
			A place to Be.
		</p>

		<!-- Subtagline -->
		<p class="text-base md:text-lg text-foreground-subtle font-sans max-w-xl mx-auto leading-relaxed mb-8">
			Your own subdomain, no AI training, no algorithms, no ads. Just you and your voice.
		</p>

		<!-- Primary CTA -->
		<div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
			<a
				href="https://plant.grove.place"
				class="btn-primary inline-flex items-center gap-2 text-base px-6 py-3"
			>
				Plant Your Blog
				<Sprout class="w-5 h-5" aria-hidden="true" />
			</a>
			<a
				href="/knowledge/help/what-is-grove"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				Learn More
				<ArrowRight class="w-4 h-4" aria-hidden="true" />
			</a>
		</div>

		<p class="text-foreground-subtle text-sm font-sans">
			Signups open end of February. Feel free to look around.
		</p>
	</section>

	<!-- Hero Carousel Section -->
	<section class="w-full max-w-4xl mb-16" aria-label="Grove feature highlights">
		<GlassCarousel
			itemCount={heroSlides.length}
			showDots={true}
			showArrows={true}
			autoplay={false}
			autoplayInterval={6000}
			variant="frosted"
			class="w-full"
		>
			{#snippet item(index: number)}
				{@const slide = heroSlides[index]}
				<img
					src={slide.src}
					alt={slide.alt}
					class="w-full h-full object-contain"
					loading={index === 0 ? 'eager' : 'lazy'}
				/>
			{/snippet}
		</GlassCarousel>
	</section>

	<!-- Launch Notice -->
	<div class="w-full max-w-lg mb-12">
		<div class="glass-grove rounded-xl p-4 border-l-4 border-accent-muted">
			<p class="text-foreground font-sans text-sm leading-relaxed">
				<span class="font-medium">Grove opens February 14th.</span> Be among the first to plant your corner of the internet.
			</p>
		</div>
	</div>

	<!-- Feature Showcase Grid -->
	<section class="w-full max-w-4xl mb-16" aria-labelledby="features-heading">
		<h2 id="features-heading" class="text-lg font-serif text-foreground-muted text-center mb-8">What Grove Offers</h2>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each features as feature}
				<a
					href={feature.href}
					class="group glass-grove rounded-xl p-6 hover:bg-white/60 dark:hover:bg-emerald-950/40 transition-all duration-200 border border-transparent hover:border-accent-muted/30"
				>
					<div class="flex items-start gap-4">
						<div class="w-12 h-12 rounded-lg bg-accent-subtle/30 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-muted/30 transition-colors" aria-hidden="true">
							<feature.icon class="w-6 h-6 text-accent-muted" />
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-foreground font-sans font-medium mb-1 group-hover:text-accent-muted transition-colors flex items-center gap-2">
								{feature.title}
								<ChevronRight class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
							</h3>
							<p class="text-foreground-subtle text-sm font-sans leading-relaxed">
								{feature.description}
							</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-12">
		<div class="w-12 h-px bg-divider"></div>
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- Quick Links -->
	<nav class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-12" aria-label="Quick links">
		<a
			href="/roadmap"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Map class="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
			<span>Roadmap</span>
		</a>
		<span class="text-divider hidden sm:inline" aria-hidden="true">·</span>
		<a
			href="/knowledge"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<BookOpen class="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
			<span>Knowledge</span>
		</a>
		<span class="text-divider hidden sm:inline" aria-hidden="true">·</span>
		<a
			href="/forest"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Trees class="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
			<span>Forest</span>
		</a>
		<span class="text-divider hidden sm:inline" aria-hidden="true">·</span>
		<a
			href="/pricing"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<HandCoins class="w-4 h-4 group-hover:scale-110 transition-transform" aria-hidden="true" />
			<span>Pricing</span>
		</a>
	</nav>

	<!-- Roadmap Preview Card -->
	<section class="w-full max-w-lg mb-16" aria-label="Development roadmap">
		<RoadmapPreview
			phase="Thaw"
			subtitle="The ice begins to crack"
			description="Grove opens its doors. The first trees take root."
			progress={33}
			href="/roadmap"
		/>
	</section>

	<!-- Who is Grove for? -->
	<section class="w-full max-w-2xl mb-12" aria-labelledby="audience-heading">
		<h2 id="audience-heading" class="text-lg font-serif text-foreground-muted text-center mb-6">Who is Grove for?</h2>

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
	<section class="w-full max-w-2xl mb-12" aria-labelledby="why-heading">
		<h2 id="why-heading" class="text-lg font-serif text-foreground-muted text-center mb-6">Why I built this</h2>

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
	<section class="w-full max-w-2xl mb-8" aria-labelledby="benefits-heading">
		<h2 id="benefits-heading" class="text-lg font-serif text-foreground-muted text-center mb-6">What you get</h2>

		<div class="glass-grove rounded-xl p-6">
			<ul class="space-y-3 text-foreground-subtle font-sans">
				<li class="flex items-start gap-3">
					<Leaf class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span><span class="text-foreground font-medium">yourname.grove.place</span> — a website that's yours</span>
				</li>
				<li class="flex items-start gap-3">
					<Shield class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span><span class="text-foreground font-medium"><GroveTerm term="shade">Shade</GroveTerm> protection</span> — AI companies send bots to scrape websites and train their models on your writing. Grove blocks them.</span>
				</li>
				<li class="flex items-start gap-3">
					<Users class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span><span class="text-foreground font-medium">No algorithms, no ads</span> — you're the customer, not the product</span>
				</li>
				<li class="flex items-start gap-3">
					<Download class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span><span class="text-foreground font-medium">Take your stuff and go</span> — export everything anytime, your content lives in standard formats</span>
				</li>
			</ul>
		</div>
	</section>

	<!-- FAQ Section -->
	<section id="faq" class="w-full max-w-2xl mb-12 scroll-mt-24" aria-labelledby="faq-heading">
		<h2 id="faq-heading" class="text-lg font-serif text-foreground-muted text-center mb-6">Frequently Asked Questions</h2>

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
								aria-hidden="true"
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
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- Email signup prompt -->
	<p class="text-foreground-subtle text-center max-w-md mb-8 font-sans text-sm">
		Get a reminder when the gates open.
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
			<HandCoins class="w-4 h-4" aria-hidden="true" />
			See all plans
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
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
