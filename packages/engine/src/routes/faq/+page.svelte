<script lang="ts">
	import { Glass, GlassCard, GlassButton, Accordion } from '$lib/ui/components/ui';
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

	// --- Getting Started ---
	const gettingStartedItems = [
		{
			value: 'what-is-grove',
			title: 'What is Grove?',
			content:
				'Grove is a cozy corner of the internet where you can have your own blog, your own space, away from algorithms and big tech. Think of it as a digital garden you actually own -- a place to write, share, and belong.'
		},
		{
			value: 'how-do-i-sign-up',
			title: 'How do I create an account?',
			content:
				'Head to grove.place and sign in with your Google account. That\'s it -- no lengthy forms, no passwords to remember. Once you\'re in, you can pick a username and start setting up your garden.'
		},
		{
			value: 'what-is-a-wanderer',
			title: 'What does "Wanderer" mean?',
			content:
				'Everyone who enters the Grove is a Wanderer. It\'s our way of saying "welcome" without the cold, corporate feel of "user." You\'re exploring, finding your path -- and that\'s a beautiful thing.'
		},
		{
			value: 'is-grove-free',
			title: 'Is Grove free to use?',
			content:
				'Grove offers a free tier so you can start writing right away. If you want more features -- like custom domains, extra storage, or advanced customization -- our paid plans (Seedling, Sapling, Oak, and Evergreen) grow with you.'
		},
		{
			value: 'what-is-lattice',
			title: 'What is Lattice?',
			content:
				'Lattice is the framework that powers Grove. Like a garden lattice supports climbing vines, our Lattice supports your blog, your pages, and everything you build here. You don\'t need to think about it -- it just works beneath the surface.'
		}
	];

	// --- Your Blog ---
	const blogItems = [
		{
			value: 'how-to-write',
			title: 'How do I write a new post?',
			content:
				'Head to your admin panel (the Arbor) and click "New Post." You\'ll get a clean editor where you can write in Markdown or rich text, add images, set tags, and preview before publishing.'
		},
		{
			value: 'custom-domain',
			title: 'Can I use my own domain name?',
			content:
				'Yes! Paid plans support custom domains. You can point your own domain to your Grove blog so readers visit yourname.com instead of yourname.grove.place. Setup instructions are in the Arbor under Settings.'
		},
		{
			value: 'themes-customization',
			title: 'Can I customize how my blog looks?',
			content:
				'Absolutely. You can choose fonts, accent colors, toggle the Grove logo, and adjust your layout. Grove blogs have a warm, nature-inspired aesthetic by default, but the details are yours to shape.'
		},
		{
			value: 'rss-feed',
			title: 'Does my blog have an RSS feed?',
			content:
				'Every Grove blog automatically has an RSS feed at /rss.xml. Readers can subscribe in their favorite feed reader to follow your writing without needing an account.'
		},
		{
			value: 'import-export',
			title: 'Can I import posts from another platform?',
			content:
				'We\'re working on import tools for common platforms. In the meantime, you can copy your content over manually -- Markdown posts transfer especially well. Your writing is always yours, and we\'ll never lock you in.'
		}
	];

	// --- Community ---
	const communityItems = [
		{
			value: 'what-is-meadow',
			title: 'What is the Meadow?',
			content:
				'The Meadow is Grove\'s community feed -- a shared space where blogs can optionally publish posts for others to discover. Think of it as a town square in the forest, where Wanderers gather to read and share.'
		},
		{
			value: 'do-i-have-to-share',
			title: 'Do I have to share my posts in the community feed?',
			content:
				'Not at all. Sharing to the Meadow is completely optional on a per-post basis. Your blog is your private garden first. The community is there when you want it, invisible when you don\'t.'
		},
		{
			value: 'moderation',
			title: 'How is the community moderated?',
			content:
				'Grove is a safe space by design. Pathfinders (trusted community guides) and the Wayfinder help keep things welcoming. We have clear community guidelines, and harmful content is not tolerated.'
		},
		{
			value: 'queer-friendly',
			title: 'Is Grove a safe space for queer folks?',
			content:
				'Yes, fundamentally. Grove was built to be a refuge -- a place where queer creators, writers, and friends can exist freely without hostility. This isn\'t a policy bolted on after the fact; it\'s in the foundation.'
		}
	];

	// --- Privacy & Security ---
	const privacyItems = [
		{
			value: 'data-ownership',
			title: 'Who owns my data?',
			content:
				'You do. Your writing, your images, your blog -- they belong to you. We don\'t sell your data, we don\'t mine it for ads, and we don\'t train AI models on your content. Grove exists to serve you, not to extract from you.'
		},
		{
			value: 'tracking',
			title: 'Does Grove track me or my readers?',
			content:
				'Grove uses privacy-first analytics (Rings) that count page views without tracking individuals. No cookies for tracking, no fingerprinting, no third-party scripts watching your readers. We believe you can understand your audience without surveilling them.'
		},
		{
			value: 'authentication',
			title: 'How is my account secured?',
			content:
				'We use Heartwood, our own authentication system built on OAuth 2.0 with PKCE. Your password is never stored by Grove -- authentication is handled securely through your identity provider. Sessions are encrypted and scoped.'
		},
		{
			value: 'delete-account',
			title: 'Can I delete my account and all my data?',
			content:
				'Yes, completely. If you choose to leave, we\'ll delete your account, your posts, your images -- everything. No "we keep your data for 90 days" games. When you say delete, we mean delete.'
		}
	];

	// --- Billing ---
	const billingItems = [
		{
			value: 'plans',
			title: 'What plans are available?',
			content:
				'We offer four tiers: Seedling (free, great for getting started), Sapling (for growing blogs), Oak (for established writers), and Evergreen (for those who want everything). Each tier adds more storage, features, and customization options.'
		},
		{
			value: 'payment-methods',
			title: 'What payment methods do you accept?',
			content:
				'We process payments through Stripe, which supports all major credit and debit cards. Your payment information is handled entirely by Stripe -- we never see or store your card details.'
		},
		{
			value: 'cancel-anytime',
			title: 'Can I cancel my subscription anytime?',
			content:
				'Yes, no questions asked. Cancel from your account settings and you\'ll keep access through the end of your billing period. Your content stays yours -- downgrade gracefully, no data held hostage.'
		},
		{
			value: 'what-is-rooted',
			title: 'What does it mean to be "Rooted"?',
			content:
				'When you subscribe to a paid plan, you\'ve "taken root" -- you\'re Rooted. It\'s our way of thanking you for putting down roots with us and supporting the Grove community.'
		}
	];

	// --- Troubleshooting ---
	const troubleshootingItems = [
		{
			value: 'blog-not-loading',
			title: 'My blog isn\'t loading. What should I do?',
			content:
				'First, check our status page to see if there\'s a known issue. If everything looks normal, try clearing your browser cache and refreshing. If it persists, reach out to us -- we\'re here to help.'
		},
		{
			value: 'post-not-showing',
			title: 'I published a post but it\'s not showing up.',
			content:
				'Make sure the post is set to "Published" (not "Draft") in your Arbor editor. If you\'re sharing to the Meadow, it can take a moment for community posts to appear. Check your post status in the Arbor dashboard.'
		},
		{
			value: 'images-not-uploading',
			title: 'My images aren\'t uploading.',
			content:
				'Check that your image is under the size limit for your plan and in a supported format (JPG, PNG, WebP, GIF). If uploads keep failing, it may be a temporary storage issue -- try again in a few minutes or contact support.'
		},
		{
			value: 'contact-support',
			title: 'How do I get help?',
			content:
				'You can reach us through the contact page, or email us directly. We\'re a small team, so responses might take a day, but we read everything and genuinely care about helping you.'
		}
	];

	const sections = [
		{
			icon: Sprout,
			title: 'Getting Started',
			description: 'New to the Grove? Start here.',
			items: gettingStartedItems
		},
		{
			icon: PenLine,
			title: 'Your Blog',
			description: 'Writing, customizing, and managing your space.',
			items: blogItems
		},
		{
			icon: Users,
			title: 'Community',
			description: 'The Meadow, sharing, and belonging.',
			items: communityItems
		},
		{
			icon: ShieldCheck,
			title: 'Privacy & Security',
			description: 'Your data, your rules.',
			items: privacyItems
		},
		{
			icon: CreditCard,
			title: 'Billing & Plans',
			description: 'Subscriptions, payments, and tiers.',
			items: billingItems
		},
		{
			icon: LifeBuoy,
			title: 'Troubleshooting',
			description: 'Something not working? Let\u2019s fix it.',
			items: troubleshootingItems
		}
	];
</script>

<svelte:head>
	<title>FAQ - The Grove</title>
	<meta
		name="description"
		content="Frequently asked questions about Grove -- your cozy blog platform away from big tech."
	/>
</svelte:head>

<div class="faq-page">
	<!-- Hero header -->
	<Glass variant="tint" as="header" class="rounded-2xl p-8 md:p-12 mb-10 text-center">
		<div class="flex items-center justify-center gap-3 mb-4">
			<MessageCircleQuestion class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
			<h1 class="text-3xl md:text-4xl font-bold text-foreground">
				Frequently Asked Questions
			</h1>
		</div>
		<p class="text-muted-foreground text-lg max-w-2xl mx-auto">
			Everything you might want to know about Grove, all in one place. If you don't find your answer here, we're always happy to help.
		</p>
	</Glass>

	<!-- FAQ sections -->
	<div class="space-y-8">
		{#each sections as section}
			<GlassCard as="section">
				{#snippet header()}
					<div class="flex items-center gap-3">
						<div class="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
							<section.icon class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<h2 class="text-xl font-semibold text-foreground">{section.title}</h2>
							<p class="text-sm text-muted-foreground">{section.description}</p>
						</div>
					</div>
				{/snippet}

				<Accordion items={section.items} type="single" collapsible class="w-full" />
			</GlassCard>
		{/each}
	</div>

	<!-- CTA footer -->
	<Glass variant="tint" as="section" class="rounded-2xl p-8 md:p-10 mt-10 text-center">
		<h2 class="text-xl font-semibold text-foreground mb-2">Still have questions?</h2>
		<p class="text-muted-foreground mb-6 max-w-lg mx-auto">
			We're a real team of real people, and we'd love to hear from you. Reach out anytime.
		</p>
		<div class="flex flex-wrap items-center justify-center gap-4">
			<GlassButton variant="accent" href="/contact">
				<span class="inline-flex items-center gap-2">
					<Mail class="w-4 h-4" />
					Contact Us
				</span>
			</GlassButton>
		</div>
	</Glass>
</div>

<style>
	.faq-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (max-width: 768px) {
		.faq-page {
			padding: 1rem 0.75rem;
		}
	}
</style>
