<script lang="ts">
	import EmailSignup from "$lib/components/EmailSignup.svelte";
	import Header from "$lib/components/Header.svelte";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import Footer from "$lib/components/Footer.svelte";
	import { Logo } from "@autumnsgrove/lattice/ui/nature";
	import SEO from "$lib/components/SEO.svelte";
	import {
		GroveTerm,
		GroveText,
		GlassCarousel,
		GlassCard,
		GroveMessages,
	} from "@autumnsgrove/lattice/ui";
	import {
		HeroRefuge,
		HeroOwnership,
		HeroShade,
		HeroCentennial,
		HeroCommunity,
	} from "$lib/components/hero";
	import { EditorDemo } from "$lib/components/demos";
	import { page } from "$app/state";

	import { natureIcons, authIcons, actionIcons, navIcons } from "@autumnsgrove/prism/icons";
	const Leaf = natureIcons.leaf;
	const Shield = authIcons.shield;
	const Users = authIcons.users;
	const Download = actionIcons.download;
	const ArrowRight = navIcons.arrowRight;
	const Sprout = natureIcons.sprout;
	const ChevronDown = navIcons.chevronDown;

	let { data } = $props();

	// Get error from URL if present
	let error = $derived(page.url.searchParams.get("error"));

	// Toggle season on logo click
	function handleLogoClick() {
		seasonStore.cycle();
	}

	// FAQ data
	const faqItems = [
		{
			id: "what-is-grove",
			question: "What is Grove?",
			answer:
				"Grove is a blogging platform where your words stay yours. You get your own subdomain (yourname.grove.place), a clean writing experience, and protection from AI scrapers. No ads, no algorithms, no data harvesting.",
		},
		{
			id: "how-different",
			question: "How is Grove different from other platforms?",
			answer:
				"Most platforms make money by showing you ads or selling your data. Grove makes money by charging a fair price for a good service. You're the customer, not the product. We don't track your readers, we don't train AI on your writing, and we don't manipulate what people see. [See how Grove compares →](/compare)",
		},
		{
			id: "ai-protection",
			question: "Is my writing safe from AI training?",
			answer:
				"Yes. Every Grove blog is protected by [[shade!|Shade]] — our defense system that blocks AI crawlers and scraping bots. Your words are never used to train AI models. We're building a corner of the internet where human creativity stays human.",
		},
		{
			id: "data-ownership",
			question: "What happens to my data?",
			answer:
				"Your content belongs to you. Export everything anytime in standard formats (Markdown, JSON). If you leave, your data leaves with you. We don't hold your words hostage.",
		},
		{
			id: "custom-domain",
			question: "Can I use my own domain?",
			answer:
				"Yes! [[oak!|Oak]] tier lets you bring a domain you already own. [[evergreen!|Evergreen]] tier includes domain registration — we'll find and set up the perfect domain for you.",
		},
		{
			id: "shutdown",
			question: "What if Grove shuts down?",
			answer:
				"After 12 months on a paid plan, your blog earns [[centennial!|Centennial]] status — it stays online as a read-only archive for 100 years, even if you stop paying or Grove closes. Your words outlive the platform.",
		},
		{
			id: "pricing",
			question: "How much does it cost?",
			answer:
				"Writing is free with [[wanderer!|Wanderer]] tier. Paid plans start at $8/month ([[seedling!|Seedling]]) for more storage, custom domains, and archival protection. See the pricing page for details.",
		},
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
				<svg
					class="w-5 h-5 text-error flex-shrink-0 mt-0.5"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
						clip-rule="evenodd"
					/>
				</svg>
				<div>
					<p class="text-error font-sans font-medium">Sign in failed</p>
					<p class="text-error text-sm mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Hero Section -->
	<section class="w-full max-w-4xl text-center mb-16">
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
		<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-4">A place to Be.</p>

		<!-- Grove Messages -->
		{#if data.messages?.length}
			<div class="w-full max-w-lg mx-auto mb-6">
				<GroveMessages messages={data.messages} centered={true} />
			</div>
		{/if}

		<!-- Subtagline -->
		<p
			class="text-base md:text-lg text-foreground-subtle font-sans max-w-xl mx-auto leading-relaxed mb-8"
		>
			Your own subdomain, no AI training, no algorithms, no ads. Just you and your voice.
		</p>

		<!-- Primary CTA -->
		<div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-3">
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
		<p class="text-sm text-foreground-subtle mb-6">Free to start. No credit card needed.</p>
	</section>

	<!-- Who is Grove for? -->
	<section class="w-full max-w-2xl mb-12" aria-labelledby="audience-heading">
		<h2 id="audience-heading" class="text-lg font-serif text-foreground-muted text-center mb-8">
			Who is Grove for?
		</h2>

		<GlassCard as="section">
			<div class="space-y-4">
				<p class="text-foreground-subtle font-sans leading-relaxed">
					Writers who want a home on the internet without the surveillance, manipulation, and noise
					of social media. People who remember when the web felt personal.
				</p>
				<p class="text-foreground-subtle font-sans leading-relaxed">
					<span class="text-foreground font-medium">Neurodivergent folks</span> who hate the endless
					customization rabbit holes. <span class="text-foreground font-medium">Queer people</span> who
					want safe digital spaces. Anyone who's tired of being the product.
				</p>
				<p class="text-foreground font-sans leading-relaxed font-medium">
					Your words are yours. Not a dataset. Not a statistic. Yours.
				</p>
			</div>
		</GlassCard>
	</section>

	<!-- Why I Built This -->
	<section class="w-full max-w-2xl mb-12" aria-labelledby="why-heading">
		<h2 id="why-heading" class="text-lg font-serif text-foreground-muted text-center mb-8">
			Why I built this
		</h2>

		<GlassCard as="section">
			<div class="space-y-4">
				<p class="text-foreground-subtle font-sans leading-relaxed">
					Remember when the internet felt personal? When you had your little corner of it. When you
					weren't performing for an algorithm. When your words belonged to you.
				</p>
				<p class="text-foreground-subtle font-sans leading-relaxed">
					I built Grove because I think we can have that again.
				</p>
				<p class="text-foreground-subtle font-sans leading-relaxed">
					I'm tired of my friends being trapped in dopamine slot machines designed to exploit
					neurodivergent minds. So I built something different — a platform that doesn't spy on you,
					doesn't train AI on your words, doesn't make you compete for attention. A place where you
					can just... write.
				</p>
				<p class="text-foreground-subtle font-sans leading-relaxed italic">— Autumn, founder</p>
			</div>
		</GlassCard>
	</section>

	<!-- Hero Carousel Section -->
	<section class="w-full max-w-4xl mb-16" aria-label="Grove feature highlights">
		<GlassCarousel
			itemCount={5}
			showDots={true}
			showArrows={true}
			autoplay={false}
			variant="minimal"
			aspectRatio="none"
			overlayNav={true}
			class="w-full h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px]"
		>
			{#snippet item(index: number)}
				{#if index === 0}
					<HeroOwnership season={seasonStore.current} active={true} {index} />
				{:else if index === 1}
					<HeroShade season={seasonStore.current} active={true} {index} />
				{:else if index === 2}
					<HeroCentennial season={seasonStore.current} active={true} {index} />
				{:else if index === 3}
					<HeroRefuge season={seasonStore.current} active={true} {index} />
				{:else if index === 4}
					<HeroCommunity season={seasonStore.current} active={true} {index} />
				{/if}
			{/snippet}
		</GlassCarousel>
	</section>

	<!-- Live Demo: Flow Editor -->
	<section class="w-full max-w-4xl mb-16" aria-labelledby="editor-demo-heading">
		<h2 id="editor-demo-heading" class="text-lg font-serif text-foreground-muted text-center mb-3">
			Try the Editor
		</h2>
		<p class="text-sm font-sans text-foreground-subtle text-center max-w-lg mx-auto mb-8">
			This is Flow — Grove's writing experience. Type on the left, see it rendered on the right.
			Switch modes to find your rhythm.
		</p>
		<EditorDemo />
	</section>

	<!-- What You Get -->
	<section class="w-full max-w-2xl mb-12" aria-labelledby="benefits-heading">
		<h2 id="benefits-heading" class="text-lg font-serif text-foreground-muted text-center mb-8">
			What you get
		</h2>

		<GlassCard as="section">
			<ul class="space-y-3 text-foreground-subtle font-sans">
				<li class="flex items-start gap-3">
					<Leaf class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span
						><span class="text-foreground font-medium">yourname.grove.place</span> — a website that's
						yours</span
					>
				</li>
				<li class="flex items-start gap-3">
					<Shield class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span
						><span class="text-foreground font-medium"
							><GroveTerm term="shade">Shade</GroveTerm> protection</span
						> — AI companies send bots to scrape websites and train their models on your writing. Grove
						blocks them.</span
					>
				</li>
				<li class="flex items-start gap-3">
					<Users class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span
						><span class="text-foreground font-medium">No algorithms, no ads</span> — you're the customer,
						not the product</span
					>
				</li>
				<li class="flex items-start gap-3">
					<Download class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" aria-hidden="true" />
					<span
						><span class="text-foreground font-medium">Take your stuff and go</span> — export everything
						anytime, your content lives in standard formats</span
					>
				</li>
			</ul>
		</GlassCard>
	</section>

	<!-- FAQ Section -->
	<section id="faq" class="w-full max-w-2xl mb-12 scroll-mt-24" aria-labelledby="faq-heading">
		<h2 id="faq-heading" class="text-lg font-serif text-foreground-muted text-center mb-8">
			Frequently Asked Questions
		</h2>

		<GlassCard as="section">
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
							<span
								class="font-medium text-foreground group-hover:text-accent-muted transition-colors pr-4"
							>
								{item.question}
							</span>
							<ChevronDown
								class="w-4 h-4 text-foreground-faint flex-shrink-0 transition-transform duration-200 {isExpanded
									? 'rotate-180'
									: ''}"
								aria-hidden="true"
							/>
						</button>

						{#if isExpanded}
							<div id="faq-{item.id}" class="mt-2 text-foreground-muted leading-relaxed">
								<GroveText content={item.answer} />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</GlassCard>

		<p class="text-center mt-6">
			<a
				href="/faq"
				class="text-sm font-sans text-foreground-muted hover:text-accent-muted transition-colors underline underline-offset-4 decoration-accent-subtle/40"
			>
				See all frequently asked questions
			</a>
		</p>
	</section>

	<!-- Email Signup -->
	<section class="w-full max-w-md mb-12 text-center" aria-label="Email signup">
		<p class="text-foreground-subtle text-center max-w-md mb-8 font-sans text-sm">
			Get a reminder when the gates open.
		</p>
		<EmailSignup />
	</section>
</main>

<!-- Footer -->
<Footer />

<style>
	/* Glass effect now defined globally in app.css */
</style>
