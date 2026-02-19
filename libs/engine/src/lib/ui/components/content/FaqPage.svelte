<script lang="ts">
	import { Glass, GlassCard, GlassButton, Accordion, GroveTerm, GroveSwap } from '$lib/ui/components/ui';
	import {
		Sprout,
		PenLine,
		Users,
		ShieldCheck,
		CreditCard,
		LifeBuoy,
		Mail,
		MessageCircleQuestion
	} from 'lucide-svelte';

	// --- Item definitions (titles only, content rendered via snippets) ---

	const gettingStartedItems = [
		{ value: 'what-is-grove', title: 'What is Grove?' },
		{ value: 'how-do-i-sign-up', title: 'How do I create an account?' },
		{ value: 'what-is-a-wanderer', title: 'What does "Wanderer" mean?' },
		{ value: 'is-grove-free', title: 'Is Grove free to use?' },
		{ value: 'what-is-lattice', title: 'What is Lattice?' }
	];

	const blogItems = [
		{ value: 'how-to-write', title: 'How do I write a new post?' },
		{ value: 'custom-domain', title: 'Can I use my own domain name?' },
		{ value: 'themes-customization', title: 'Can I customize how my blog looks?' },
		{ value: 'rss-feed', title: 'Does my blog have an RSS feed?' },
		{ value: 'import-export', title: 'Can I import posts from another platform?' }
	];

	const communityItems = [
		{ value: 'what-is-meadow', title: 'What is the Meadow?' },
		{ value: 'do-i-have-to-share', title: 'Do I have to share my posts in the community feed?' },
		{ value: 'moderation', title: 'How is the community moderated?' },
		{ value: 'queer-friendly', title: 'Is Grove a safe space for queer folks?' }
	];

	const privacyItems = [
		{ value: 'data-ownership', title: 'Who owns my data?' },
		{ value: 'tracking', title: 'Does Grove track me or my readers?' },
		{ value: 'authentication', title: 'How is my account secured?' },
		{ value: 'delete-account', title: 'Can I delete my account and all my data?' }
	];

	const billingItems = [
		{ value: 'plans', title: 'What plans are available?' },
		{ value: 'payment-methods', title: 'What payment methods do you accept?' },
		{ value: 'cancel-anytime', title: 'Can I cancel my subscription anytime?' },
		{ value: 'what-is-rooted', title: 'What does it mean to be "Rooted"?' }
	];

	const troubleshootingItems = [
		{ value: 'blog-not-loading', title: "My blog isn't loading. What should I do?" },
		{ value: 'post-not-showing', title: "I published a post but it's not showing up." },
		{ value: 'images-not-uploading', title: "My images aren't uploading." },
		{ value: 'contact-support', title: 'How do I get help?' }
	];
</script>

<div class="max-w-3xl mx-auto px-3 py-4 md:px-4 md:py-8">
	<!-- Hero header -->
	<Glass variant="tint" as="header" class="rounded-2xl p-8 md:p-12 mb-10 text-center">
		<div class="flex items-center justify-center gap-3 mb-4">
			<MessageCircleQuestion aria-hidden="true" class="w-8 h-8 text-grove-600 dark:text-grove-400" />
			<h1 class="text-3xl md:text-4xl font-bold text-foreground">
				Frequently Asked Questions
			</h1>
		</div>
		<p class="text-muted-foreground text-lg max-w-2xl mx-auto">
			Everything you might want to know about <GroveTerm term="your-grove">Grove</GroveTerm>, all in one place. If you don't find your answer here, we're always happy to help.
		</p>
	</Glass>

	<!-- FAQ sections -->
	<div class="space-y-8">
		<!-- Getting Started -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<Sprout aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Getting Started</h2>
						<p class="text-sm text-muted-foreground">New to the <GroveSwap term="your-grove">Grove</GroveSwap>? Start here.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={gettingStartedItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'what-is-grove'}
						<GroveTerm term="your-grove">Grove</GroveTerm> is a cozy corner of the internet where you can have your own <GroveSwap term="your-garden">blog</GroveSwap>, your own space, away from algorithms and big tech. Think of it as a digital <GroveSwap term="your-garden">garden</GroveSwap> you actually own -- a place to write, share, and belong.
					{:else if item.value === 'how-do-i-sign-up'}
						Head to <a href="https://grove.place" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">grove.place</a> and sign in with your Google account -- no lengthy forms, no passwords to remember. We're also adding passkey support and magic link sign-in soon, so you'll have even more ways to get in without fussing with passwords. Once you're in, you can pick a username and start setting up your <GroveSwap term="your-garden">garden</GroveSwap>.
					{:else if item.value === 'what-is-a-wanderer'}
						Everyone who enters <GroveSwap term="your-grove">the Grove</GroveSwap> is a <GroveTerm term="wanderer" />. It's our way of saying "welcome" without the cold, corporate feel of "user." You're exploring, finding your path -- and that's a beautiful thing.
					{:else if item.value === 'is-grove-free'}
						<GroveSwap term="your-grove">Grove</GroveSwap> offers a free tier so you can start writing right away. If you want more features -- like custom domains, extra storage, or advanced customization -- our <a href="https://grove.place/pricing" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">paid plans</a> (<GroveTerm term="seedling" />, <GroveTerm term="sapling" />, <GroveTerm term="oak" />, and <GroveTerm term="evergreen" />) grow with you.
					{:else if item.value === 'what-is-lattice'}
						<GroveTerm term="lattice" /> is the framework that powers <GroveSwap term="your-grove">Grove</GroveSwap>. Like a garden lattice supports climbing vines, our <GroveSwap term="lattice">Lattice</GroveSwap> supports your <GroveSwap term="your-garden">blog</GroveSwap>, your pages, and everything you build here. You don't need to think about it -- it just works beneath the surface.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>

		<!-- Your Blog -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<PenLine aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Your <GroveSwap term="your-garden">Blog</GroveSwap></h2>
						<p class="text-sm text-muted-foreground">Writing, customizing, and managing your space.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={blogItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'how-to-write'}
						Head to your <GroveTerm term="arbor">admin panel</GroveTerm> and click "New Post." You'll get a clean editor where you can write in Markdown or rich text, add images, set tags, and preview before publishing.
					{:else if item.value === 'custom-domain'}
						Yes! Paid plans support custom domains. You can point your own domain to your <GroveSwap term="your-grove">Grove</GroveSwap> <GroveSwap term="your-garden">blog</GroveSwap> so readers visit yourname.com instead of yourname.grove.place. Setup instructions are in the <GroveSwap term="arbor">Arbor</GroveSwap> under Settings.
					{:else if item.value === 'themes-customization'}
						Absolutely. You can choose fonts, accent colors, toggle the <GroveSwap term="your-grove">Grove</GroveSwap> logo, and adjust your layout. <GroveSwap term="your-grove">Grove</GroveSwap> <GroveSwap term="your-garden">blogs</GroveSwap> have a warm, nature-inspired aesthetic by default, but the details are yours to shape.
					{:else if item.value === 'rss-feed'}
						Every <GroveSwap term="your-grove">Grove</GroveSwap> <GroveSwap term="your-garden">blog</GroveSwap> automatically has an RSS feed at /rss.xml. Readers can subscribe in their favorite feed reader to follow your writing without needing an account.
					{:else if item.value === 'import-export'}
						We're working on import tools for common platforms. In the meantime, you can copy your content over manually -- Markdown <GroveSwap term="blooms">posts</GroveSwap> transfer especially well. Your writing is always yours, and we'll never lock you in.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>

		<!-- Community -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<Users aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Community</h2>
						<p class="text-sm text-muted-foreground">The <GroveSwap term="meadow">Meadow</GroveSwap>, sharing, and belonging.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={communityItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'what-is-meadow'}
						The <GroveTerm term="meadow">Meadow</GroveTerm> is <GroveSwap term="your-grove">Grove's</GroveSwap> community feed -- a shared space where <GroveSwap term="your-garden">blogs</GroveSwap> can optionally publish <GroveSwap term="blooms">posts</GroveSwap> for others to discover. Think of it as a town square in the forest, where <GroveSwap term="wanderer">Wanderers</GroveSwap> gather to read and share.
					{:else if item.value === 'do-i-have-to-share'}
						Not at all. Sharing to the <GroveSwap term="meadow">Meadow</GroveSwap> is completely optional on a per-<GroveSwap term="blooms">post</GroveSwap> basis. Your <GroveSwap term="your-garden">blog</GroveSwap> is your private <GroveSwap term="your-garden">garden</GroveSwap> first. The community is there when you want it, invisible when you don't.
					{:else if item.value === 'moderation'}
						<GroveSwap term="your-grove">Grove</GroveSwap> is a safe space by design. On the automated side, <GroveTerm term="thorn">Thorn</GroveTerm> scans text for harmful content and <GroveTerm term="petal">Petal</GroveTerm> checks uploaded images -- both work quietly in the background without storing or training on your content. On the human side, <GroveTerm term="pathfinder">Pathfinders</GroveTerm> (trusted community guides) and the <GroveTerm term="wayfinder">Wayfinder</GroveTerm> help keep things welcoming. We have clear community guidelines, and the combination of careful technology and caring people means harmful content doesn't get a foothold here.
					{:else if item.value === 'queer-friendly'}
						Yes, fundamentally. <GroveSwap term="your-grove">Grove</GroveSwap> was built to be a refuge -- a place where queer creators, writers, and friends can exist freely without hostility. This isn't a policy bolted on after the fact; it's in the foundation.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>

		<!-- Privacy & Security -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<ShieldCheck aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Privacy & Security</h2>
						<p class="text-sm text-muted-foreground">Your data, your rules.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={privacyItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'data-ownership'}
						You do. Your writing, your images, your <GroveSwap term="your-garden">blog</GroveSwap> -- they belong to you. We don't sell your data, we don't mine it for ads, and we don't train AI models on your content. <GroveSwap term="your-grove">Grove</GroveSwap> exists to serve you, not to extract from you.
					{:else if item.value === 'tracking'}
						<GroveSwap term="your-grove">Grove</GroveSwap> uses privacy-first <GroveTerm term="rings">analytics</GroveTerm> that count page views without tracking individuals. No cookies for tracking, no fingerprinting, no third-party scripts watching your readers. We believe you can understand your audience without surveilling them.
					{:else if item.value === 'authentication'}
						We built our own sign-in system called <GroveTerm term="heartwood">Heartwood</GroveTerm>. You sign in through your existing accounts (like Google), so <GroveSwap term="your-grove">Grove</GroveSwap> never sees or stores a password. Your sessions are encrypted, and we're adding passkey support so you can sign in with just your fingerprint or face -- no passwords anywhere in the chain.
					{:else if item.value === 'delete-account'}
						Yes, completely. If you choose to leave, we'll delete your account, your <GroveSwap term="blooms">posts</GroveSwap>, your images -- everything. No "we keep your data for 90 days" games. When you say delete, we mean delete.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>

		<!-- Billing & Plans -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<CreditCard aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Billing & Plans</h2>
						<p class="text-sm text-muted-foreground">Subscriptions, payments, and tiers.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={billingItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'plans'}
						We offer four tiers: <GroveTerm term="seedling" /> (free, great for getting started), <GroveTerm term="sapling" /> (for growing <GroveSwap term="your-garden">blogs</GroveSwap>), <GroveTerm term="oak" /> (for established writers), and <GroveTerm term="evergreen" /> (for those who want everything). Each tier adds more storage, features, and customization options. <a href="https://grove.place/pricing" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">Compare plans</a>
					{:else if item.value === 'payment-methods'}
						We process payments through Stripe, which supports all major credit and debit cards. Your payment information is handled entirely by Stripe -- we never see or store your card details.
					{:else if item.value === 'cancel-anytime'}
						Yes, no questions asked. Cancel from your account settings and you'll keep access through the end of your billing period. Your content stays yours -- downgrade gracefully, no data held hostage.
					{:else if item.value === 'what-is-rooted'}
						When you subscribe to a paid plan, you've "taken root" -- you're <GroveTerm term="rooted">Rooted</GroveTerm>. It's our way of thanking you for putting down roots with us and supporting the <GroveSwap term="your-grove">Grove</GroveSwap> community.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>

		<!-- Troubleshooting -->
		<GlassCard as="section">
			{#snippet header()}
				<div class="flex items-center gap-3">
					<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-grove-100 dark:bg-grove-900/40">
						<LifeBuoy aria-hidden="true" class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					</div>
					<div>
						<h2 class="text-xl font-semibold text-foreground">Troubleshooting</h2>
						<p class="text-sm text-muted-foreground">Something not working? Let's fix it.</p>
					</div>
				</div>
			{/snippet}

			<Accordion items={troubleshootingItems} type="single" collapsible class="w-full">
				{#snippet contentSnippet(item)}
					{#if item.value === 'blog-not-loading'}
						First, check our <GroveTerm term="clearing" href="https://status.grove.place">status page</GroveTerm> to see if there's a known issue. If everything looks normal, try clearing your browser cache and refreshing. If it persists, <a href="https://grove.place/contact" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">reach out to us</a> -- we're here to help.
					{:else if item.value === 'post-not-showing'}
						Make sure the <GroveSwap term="blooms">post</GroveSwap> is set to "Published" (not "Draft") in your <GroveTerm term="arbor">Arbor</GroveTerm> editor. If you're sharing to the <GroveSwap term="meadow">Meadow</GroveSwap>, it can take a moment for community <GroveSwap term="blooms">posts</GroveSwap> to appear. Check your <GroveSwap term="blooms">post</GroveSwap> status in the <GroveSwap term="arbor">Arbor</GroveSwap> dashboard.
					{:else if item.value === 'images-not-uploading'}
						Check that your image is under the size limit for your plan and in a supported format (JPG, PNG, WebP, GIF). If uploads keep failing, it may be a temporary storage issue -- try again in a few minutes or <a href="https://grove.place/contact" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">contact support</a>.
					{:else if item.value === 'contact-support'}
						You can reach us through the <a href="https://grove.place/contact" class="text-grove-700 dark:text-grove-400 underline underline-offset-2">contact page</a>, or email us directly. We're a small team, so responses might take a day, but we read everything and genuinely care about helping you.
					{/if}
				{/snippet}
			</Accordion>
		</GlassCard>
	</div>

	<!-- CTA footer -->
	<Glass variant="tint" as="section" class="rounded-2xl p-8 md:p-10 mt-10 text-center">
		<h2 class="text-xl font-semibold text-foreground mb-2">Still have questions?</h2>
		<p class="text-muted-foreground mb-6 max-w-lg mx-auto">
			I'm a real person, and I'd love to hear from you. Reach out anytime.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<GlassButton variant="accent" href="https://grove.place/contact">
				<span class="inline-flex items-center gap-2">
					<Mail class="w-4 h-4" />
					Contact Us
				</span>
			</GlassButton>
		</div>
	</Glass>
</div>
