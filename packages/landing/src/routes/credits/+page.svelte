<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { Shredder, Heart, Cpu, Layers, Package, Smile, Type } from 'lucide-svelte';

	let { data } = $props();

	// TOC state
	let isTocOpen = $state(false);

	// TOC items with icons for the floating nav
	const tocItems = [
		{ id: 'supporters', text: 'Supporters', icon: Heart },
		{ id: 'ai-tools', text: 'AI Tools', icon: Cpu },
		{ id: 'tech-stack', text: 'Tech Stack', icon: Layers },
		{ id: 'libraries', text: 'Libraries', icon: Package },
		{ id: 'icons', text: 'Icons', icon: Smile },
		{ id: 'fonts', text: 'Fonts', icon: Type }
	];
</script>

<SEO
	title="Credits — Grove"
	description="The people, projects, and tools that make Grove possible."
	url="/credits"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<!-- Content with TOC -->
	<div class="flex-1 px-6 py-12">
		<div class="credits-layout">
			<!-- Main Content -->
			<article class="credits-content">
				<!-- Header -->
				<header class="mb-12 text-center">
					<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">Credits</h1>
					<p class="text-lg text-foreground-subtle font-sans">
						The people, projects, and tools that make Grove possible.
					</p>
					<div class="flex items-center justify-center gap-4 mt-6">
						<div class="w-12 h-px bg-divider"></div>
						<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
							<circle cx="10" cy="10" r="4" />
						</svg>
						<div class="w-12 h-px bg-divider"></div>
					</div>
				</header>

				<!-- Intro -->
				<p class="text-foreground-muted font-sans leading-relaxed mb-12 text-center">
					Grove is built on the shoulders of incredible open source projects, thoughtful design work,
					and most importantly—the people who believed in this vision from the start.
				</p>

				<!-- Supporters & Community -->
				<section class="mb-16" id="supporters">
					<h2 class="text-2xl font-serif text-foreground mb-2">Supporters & Community</h2>
					<p class="text-foreground-subtle font-sans text-sm mb-8">
						The people who encouraged, supported, and loved on me while building Grove. This project wouldn't exist without you.
					</p>

					<!-- Queer Quest Circle -->
					<div class="supporter-circle mb-10" id="queer-quest">
						<h3 class="text-lg font-serif text-accent-muted mb-4 flex items-center gap-2">
							<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M12 2L2 7l10 5 10-5-10-5z"/>
								<path d="M2 17l10 5 10-5"/>
								<path d="M2 12l10 5 10-5"/>
							</svg>
							Queer Quest Circle
						</h3>
						<div class="supporter-card featured">
							<div class="supporter-header">
								<span class="supporter-name">Dante</span>
								<span class="supporter-context">former DM, LGBTQIA+ center</span>
							</div>
							<p class="supporter-note">
								My old dungeon master from college who ran Queer Quest—D&D one-shots hosted at the LGBTQIA+ center. When I told him about Grove, he sent an incredible message to his communities, championing the vision and encouraging support. That kind of belief in what we're building here means everything.
							</p>
						</div>
					</div>

					<!-- Home Depot Family -->
					<div class="supporter-circle mb-10" id="home-depot-family">
						<h3 class="text-lg font-serif text-accent-muted mb-4 flex items-center gap-2">
							<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
								<polyline points="9,22 9,12 15,12 15,22"/>
							</svg>
							Home Depot Family
						</h3>
						<div class="supporter-list">
							<div class="supporter-card">
								<div class="supporter-header">
									<span class="supporter-name">Jonas Delva</span>
								</div>
								<p class="supporter-note">
									Always telling me how blessed he feels, radiating positivity. He said to me: <em>"You are worth so much more than this place. You are needed elsewhere."</em>
								</p>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Imani Gracious</span>
								<span class="supporter-desc">— passionate about the vision, helped with feedback and design review</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Nicole Wood</span>
								<span class="supporter-desc">— my rock and support, so much love in her heart for this project</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Emily Navarro</span>
								<span class="supporter-desc">— a true believer in what we're building</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Reid Jones</span>
								<span class="supporter-desc">— huge fan from day one</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Red Reinagel</span>
								<span class="supporter-desc">— always cheering this project on</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Alex Rylander</span>
								<span class="supporter-desc">— unwavering support</span>
							</div>
							<div class="supporter-card">
								<div class="supporter-header">
									<span class="supporter-name">Camille Jenkins</span>
									<span class="supporter-context">order picker, wife & mom of 3</span>
								</div>
								<p class="supporter-note">
									One of the best energies around. Always gives me a hug and is thrilled to see me bloom.
								</p>
							</div>
							<div class="supporter-card">
								<div class="supporter-header">
									<span class="supporter-name">Carmen Herrera</span>
									<span class="supporter-context">flooring/appliances</span>
								</div>
								<p class="supporter-note">
									A grounding energy—so encouraging about the Grove project. Might one day get a grove of her own to write about spiritual things.
								</p>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Stephanie</span>
								<span class="supporter-desc">— real supportive person, mature perspectives and excited to see me bloom</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Maggie Cuthbertson</span>
								<span class="supporter-desc">— very supportive, very excited about the Grove, wants to learn how it all works</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Jack Sheckles</span>
								<span class="supporter-desc">— very excited for me, wants to see me bloom</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Rebecca Gordon</span>
								<span class="supporter-desc">— caring and cautious, always checking in to make sure I'm okay out here</span>
							</div>
						</div>
					</div>

					<!-- Kindred Spirits -->
					<div class="supporter-circle" id="kindred-spirits">
						<h3 class="text-lg font-serif text-accent-muted mb-4 flex items-center gap-2">
							<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
							</svg>
							Kindred Spirits
						</h3>
						<div class="supporter-list">
							<div class="supporter-item">
								<span class="supporter-name">Madison & Kyle Hiday</span>
								<span class="supporter-desc">— sending love and support all the way from Belgium</span>
							</div>
							<div class="supporter-card featured">
								<div class="supporter-header">
									<span class="supporter-name">Ariana Garcia</span>
									<span class="supporter-context">first person to sign up</span>
								</div>
								<p class="supporter-note">
									Day zero. The first through the door, a ray of sunshine on stormy days. Excited to learn to code—there's a <a href="https://github.com/AutumnsGrove/AutumnsGrove/blob/main/MUSEUM.md" target="_blank" rel="noopener noreferrer" class="museum-link">museum</a> waiting for her.
								</p>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Arturo Martinez</span>
								<span class="supporter-desc">— best friend who keeps me grounded, doesn't feed my ego but still believes in the vision</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Trent Ice & Savanna</span>
								<span class="supporter-desc">— childhood best friend and his partner, huge fans who let me ramble about Durable Objects over Waffle House</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Sean Amaso</span>
								<span class="supporter-desc">— local artist and high school friend, major supporter</span>
							</div>
							<div class="supporter-item">
								<span class="supporter-name">Ijeoma Odihe</span>
								<span class="supporter-desc">— such a ray of sunshine on dark days, lovely warm personality</span>
							</div>
						</div>
					</div>
				</section>

				<!-- AI Coding Tools -->
			<section class="mb-12" id="ai-tools">
				<h2 class="text-2xl font-serif text-foreground mb-2">AI Coding Assistants</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The AI tools that helped write and refine Grove's code.
				</p>

				<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">Claude Code</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">by Anthropic</p>
								<p class="text-foreground-muted font-sans text-sm">
									Primary development tool. Used with Claude Haiku, Sonnet, and Opus 4.5 models—primarily Opus for complex architectural decisions and implementation.
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3 mt-3">
							<a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
								claude.ai/code →
							</a>
						</div>
					</div>

					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">Kilo Code</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">VS Code Extension</p>
								<p class="text-foreground-muted font-sans text-sm">
									Secondary development tool. Used with frontier open source models all via OpenRouter with ZDR enabled.
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3 mt-3">
							<a href="https://kilocode.ai" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
								kilocode.ai →
							</a>
							<a
								href="/knowledge/help/what-is-zdr"
								class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs text-foreground-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
								title="Zero Data Retention"
							>
								<Shredder class="w-3 h-3" />
								ZDR
							</a>
						</div>
					</div>

					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">OpenCode</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">Interactive CLI Tool</p>
								<p class="text-foreground-muted font-sans text-sm">
									Secondary development tool. Used with frontier open source models all via OpenRouter with ZDR enabled.
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3 mt-3">
							<a href="https://opencode.ai" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
								opencode.ai →
							</a>
							<a
								href="/knowledge/help/what-is-zdr"
								class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs text-foreground-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
								title="Zero Data Retention"
							>
								<Shredder class="w-3 h-3" />
								ZDR
							</a>
						</div>
					</div>

					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">Crush</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">by Charmbracelet</p>
								<p class="text-foreground-muted font-sans text-sm">
									A delightful terminal AI coding agent. Used with frontier open source models via OpenRouter with ZDR enabled.
								</p>
							</div>
						</div>
						<div class="flex items-center gap-3 mt-3">
							<a href="https://github.com/charmbracelet/crush" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
								charmbracelet/crush →
							</a>
							<a
								href="/knowledge/help/what-is-zdr"
								class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/50 text-xs text-foreground-muted hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
								title="Zero Data Retention"
							>
								<Shredder class="w-3 h-3" />
								ZDR
							</a>
						</div>
					</div>
				</div>
			</section>

			<!-- Tech Stack -->
			<section class="mb-12" id="tech-stack">
				<h2 class="text-2xl font-serif text-foreground mb-2">Tech Stack</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The core technologies powering Grove.
				</p>

				<div class="grid gap-4">
					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">SvelteKit</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Full-stack framework for building fast, modern web applications. The foundation of Grove's frontend and server-side rendering.
						</p>
						<a href="https://kit.svelte.dev" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							kit.svelte.dev →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Cloudflare</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Edge computing platform. Grove runs on Workers, stores data in D1 (SQLite), caches with KV, and hosts media on R2.
						</p>
						<a href="https://developers.cloudflare.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							developers.cloudflare.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Better Auth</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Authentication framework powering Heartwood. Handles OAuth, magic links, passkeys, and session management with KV-cached sessions for sub-100ms validation.
						</p>
						<a href="https://better-auth.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							better-auth.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Tailwind CSS</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Utility-first CSS framework. Enables rapid, consistent styling across the entire platform.
						</p>
						<a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							tailwindcss.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Stripe</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Payment processing for subscriptions, billing, and secure checkout. Powers Grove's payment flows with reliability and developer-friendly tooling.
						</p>
						<a href="https://stripe.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							stripe.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Resend</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Email delivery service. Powers transactional emails, magic link authentication, and notifications.
						</p>
						<a href="https://resend.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							resend.com →
						</a>
					</div>
				</div>
			</section>

			<!-- Open Source Libraries -->
			<section class="mb-12" id="libraries">
				<h2 class="text-2xl font-serif text-foreground mb-2">Open Source Libraries</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The packages that power Grove's features.
				</p>

				<div class="grid gap-3">
					<a href="https://github.com/markdown-it/markdown-it" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">markdown-it</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Markdown parser</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/cure53/DOMPurify" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">DOMPurify</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— HTML sanitization</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">Apache 2.0</span>
						</div>
					</a>

					<a href="https://github.com/11ty/gray-matter" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">@11ty/gray-matter</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Frontmatter parsing (Workers-compatible)</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/kvnang/workers-og" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">workers-og</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— OG image generation for Cloudflare Workers</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/jamsinclair/jSquash" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">@jsquash/jxl</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— JPEG XL codec for modern image compression</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">Apache 2.0</span>
						</div>
					</a>

					<a href="https://github.com/1904labs/dom-to-image-more" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">dom-to-image-more</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— DOM node to image export</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/huntabyte/bits-ui" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Bits UI</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Headless UI components</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/huntabyte/shadcn-svelte" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">shadcn-svelte</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Component primitives powering Grove's glass UI</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/wobsoriano/svelte-sonner" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">svelte-sonner</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Toast notifications</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/nextui-org/tailwind-variants" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">tailwind-variants</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Variant-based component styling</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/dcastil/tailwind-merge" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">tailwind-merge</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Class merging utility</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/lukeed/clsx" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">clsx</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Classname utility</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>
				</div>
			</section>

			<!-- Icons -->
			<section class="mb-12" id="icons">
				<h2 class="text-2xl font-serif text-foreground mb-2">Icons</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The icon set used throughout Grove.
				</p>

				<div class="card p-5">
					<h3 class="text-lg font-serif text-foreground mb-1">Lucide</h3>
					<p class="text-foreground-muted font-sans text-sm">
						Beautiful, consistent icon set. Open source fork of Feather Icons with an expanded library and active community.
					</p>
					<div class="flex items-center gap-4 mt-3">
						<a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
							lucide.dev →
						</a>
						<span class="text-foreground-faint text-xs font-sans">ISC License</span>
					</div>
				</div>
			</section>

			<!-- Fonts -->
			<section class="mb-12" id="fonts">
				<h2 class="text-2xl font-serif text-foreground mb-2">Fonts</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The 10 curated typefaces available for Grove blogs. All are open source or free for use. Click a category to explore.
				</p>

				<div class="grid gap-4">
					<!-- Default & Accessibility Fonts -->
					<details class="font-category" open>
						<summary class="card p-4 cursor-pointer list-none flex items-center justify-between hover:border-accent transition-colors">
							<div class="flex items-center gap-3">
								<span class="text-lg font-serif text-foreground">Default & Accessibility</span>
								<span class="text-xs text-foreground-faint bg-surface-alt px-2 py-0.5 rounded">3 fonts</span>
							</div>
							<svg class="w-5 h-5 text-foreground-subtle transition-transform category-chevron" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
							</svg>
						</summary>
						<div class="grid gap-4 mt-4 pl-2">
							<!-- Lexend -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Lexend', sans-serif;">
									Lexend
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Lexend', sans-serif;">
									Grove's default font, designed to improve reading fluency. Research shows it can increase reading speed by up to 20% for struggling readers. The letterforms are optimized to reduce visual crowding, making text feel more spacious and easier to process. Perfect for long-form content where reader comfort matters.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Bonnie Shaver-Troup & Thomas Jockin</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://www.lexend.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Lexend.com</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License</span>
								</div>
							</div>

							<!-- Atkinson Hyperlegible -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Atkinson Hyperlegible', sans-serif;">
									Atkinson Hyperlegible
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Atkinson Hyperlegible', sans-serif;">
									Created by the Braille Institute for readers with low vision. Every character is designed to be maximally distinct from every other—the lowercase 'l' doesn't look like the number '1', the capital 'O' doesn't look like zero. It's accessibility through thoughtful design, not compromise.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Braille Institute of America</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://brailleinstitute.org/freefont" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Braille Institute</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License 1.1</span>
								</div>
							</div>

							<!-- OpenDyslexic -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'OpenDyslexic', sans-serif;">
									OpenDyslexic
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'OpenDyslexic', sans-serif;">
									A typeface designed to mitigate common reading errors caused by dyslexia. The letters have weighted bottoms to help indicate direction and prevent the visual "flipping" that can occur. Each character has a unique shape, making it harder for your brain to rotate or mirror them.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Abbie Gonzalez</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://opendyslexic.org" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">OpenDyslexic.org</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License</span>
								</div>
							</div>
						</div>
					</details>

					<!-- Sans-Serif -->
					<details class="font-category">
						<summary class="card p-4 cursor-pointer list-none flex items-center justify-between hover:border-accent transition-colors">
							<div class="flex items-center gap-3">
								<span class="text-lg font-serif text-foreground">Sans-Serif</span>
								<span class="text-xs text-foreground-faint bg-surface-alt px-2 py-0.5 rounded">2 fonts</span>
							</div>
							<svg class="w-5 h-5 text-foreground-subtle transition-transform category-chevron" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
							</svg>
						</summary>
						<div class="grid gap-4 mt-4 pl-2">
							<!-- Quicksand -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Quicksand', sans-serif;">
									Quicksand
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Quicksand', sans-serif;">
									A geometric sans-serif with rounded terminals that give it a friendly, approachable personality. Modern and clean without being cold or corporate. The kind of font that makes your blog feel like a conversation with a friend, not a press release.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Andrew Paglinawan</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://github.com/andrew-paglinawan/QuicksandFamily" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License</span>
								</div>
							</div>

							<!-- Plus Jakarta Sans -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Plus Jakarta Sans', sans-serif;">
									Plus Jakarta Sans
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Plus Jakarta Sans', sans-serif;">
									Born from a city collaboration project, this font embodies community and cooperation in its DNA. Contemporary geometric shapes with sharp curves give it a modern edge, while its open letterforms keep it friendly. Perfect for a platform about building connections.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Gumpita Rahayu (Tokotype)</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://fonts.google.com/specimen/Plus+Jakarta+Sans" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License 1.1</span>
								</div>
							</div>
						</div>
					</details>

					<!-- Monospace -->
					<details class="font-category">
						<summary class="card p-4 cursor-pointer list-none flex items-center justify-between hover:border-accent transition-colors">
							<div class="flex items-center gap-3">
								<span class="text-lg font-serif text-foreground">Monospace</span>
								<span class="text-xs text-foreground-faint bg-surface-alt px-2 py-0.5 rounded">2 fonts</span>
							</div>
							<svg class="w-5 h-5 text-foreground-subtle transition-transform category-chevron" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
							</svg>
						</summary>
						<div class="grid gap-4 mt-4 pl-2">
							<!-- IBM Plex Mono -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'IBM Plex Mono', monospace;">
									IBM Plex Mono
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'IBM Plex Mono', monospace;">
									IBM's open-source monospace, designed for code and technical content. Clean lines and excellent legibility at any size. Neutral enough to work anywhere, distinctive enough to have character. The professional choice for developer blogs and documentation.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">IBM</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://github.com/IBM/plex" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License 1.1</span>
								</div>
							</div>

							<!-- Cozette -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Cozette', monospace;">
									Cozette
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Cozette', monospace;">
									A bitmap programming font with that perfect retro terminal aesthetic. Excellent readability at small sizes where other fonts blur. For the hackers, tinkerers, and anyone who misses the days when computers felt more personal and less polished.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">slavfox</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://github.com/slavfox/Cozette" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">MIT License</span>
								</div>
							</div>
						</div>
					</details>

					<!-- Display & Special -->
					<details class="font-category">
						<summary class="card p-4 cursor-pointer list-none flex items-center justify-between hover:border-accent transition-colors">
							<div class="flex items-center gap-3">
								<span class="text-lg font-serif text-foreground">Display & Special</span>
								<span class="text-xs text-foreground-faint bg-surface-alt px-2 py-0.5 rounded">3 fonts</span>
							</div>
							<svg class="w-5 h-5 text-foreground-subtle transition-transform category-chevron" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
							</svg>
						</summary>
						<div class="grid gap-4 mt-4 pl-2">
							<!-- Alagard -->
							<div class="card p-5">
								<h3 class="text-2xl text-accent-muted mb-2" style="font-family: 'Alagard', fantasy;">
									Alagard
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Alagard', fantasy; font-size: 1.1rem;">
									A medieval-style pixel font that transports you straight into a fantasy RPG. Perfect for game-inspired blogs, D&D session recaps, or anyone who wants their headlines to feel like the title screen of an epic adventure. Not for body text—but for making a statement? Unmatched.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Hewett Tsoi</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://www.dafont.com/alagard.font" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">DaFont</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">Free for personal and commercial use</span>
								</div>
							</div>

							<!-- Calistoga -->
							<div class="card p-5">
								<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Calistoga', serif;">
									Calistoga
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Calistoga', serif;">
									Cheerful and bold without being aggressive. Inspired by Western US railroad posters—there's an adventurous, frontier spirit in its curves. Confidence and optimism in every letter. Perfect for hero sections, calls to action, or anywhere you want to invite readers into something exciting.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Yvonne Schüttler, Eben Sorkin</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://github.com/nickshanks/Calistoga" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License 1.1</span>
								</div>
							</div>

							<!-- Caveat -->
							<div class="card p-5">
								<h3 class="text-2xl text-accent-muted mb-2" style="font-family: 'Caveat', cursive;">
									Caveat
								</h3>
								<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Caveat', cursive; font-size: 1.15rem;">
									Like receiving a handwritten note from a friend. Rounded edges and a carefree rhythm give it genuine warmth—not the sterile perfection of most "handwriting" fonts. Ideal for personal signatures, annotations, marginalia, or adding a human touch to otherwise digital spaces.
								</p>
								<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
									<span class="text-foreground-subtle">Author</span>
									<span class="text-foreground-muted">Pablo Impallari</span>
									<span class="text-foreground-subtle">Source</span>
									<a href="https://fonts.google.com/specimen/Caveat" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
									<span class="text-foreground-subtle">License</span>
									<span class="text-foreground-muted">SIL Open Font License 1.1</span>
								</div>
							</div>
						</div>
					</details>
				</div>
			</section>

			<!-- Closing -->
			<section class="text-center py-8 border-t border-default">
				<p class="text-foreground-subtle font-sans text-sm mb-4">
					Grove is open source. View the code and contribute on GitHub.
				</p>
				<a
					href="https://github.com/AutumnsGrove/GroveEngine"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 text-accent-muted font-sans hover:underline"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					AutumnsGrove/GroveEngine
				</a>
			</section>
			</article>
		</div>
	</div>

	<!-- Floating TOC (Desktop) -->
	<nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-3" aria-label="Page navigation">
		{#each tocItems as item}
			{@const Icon = item.icon}
			<a
				href="#{item.id}"
				class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-md border border-amber-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all duration-200 group"
				aria-label="Jump to {item.text}"
				title={item.text}
			>
				<Icon class="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
			</a>
		{/each}
	</nav>

	<!-- Floating TOC Button & Dropdown (Mobile + always visible) -->
	<div class="fixed bottom-6 right-6 z-grove-fab lg:hidden">
		<button
			type="button"
			onclick={() => isTocOpen = !isTocOpen}
			class="w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-amber-600 transition-colors"
			aria-expanded={isTocOpen}
			aria-label="Table of contents"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
			</svg>
		</button>

		{#if isTocOpen}
			<div class="absolute bottom-16 right-0 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-amber-200 dark:border-slate-700 overflow-hidden">
				<div class="px-4 py-3 border-b border-amber-200 dark:border-slate-700 flex items-center justify-between">
					<span class="font-medium text-foreground">Navigate</span>
					<button type="button" onclick={() => isTocOpen = false} class="text-foreground-muted hover:text-foreground" aria-label="Close">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="py-2">
					{#each tocItems as item}
						{@const Icon = item.icon}
						<a
							href="#{item.id}"
							onclick={() => isTocOpen = false}
							class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
						>
							<Icon class="w-5 h-5 text-amber-500" />
							<span>{item.text}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }

	/* Credits page layout */
	.credits-layout {
		max-width: 800px;
		margin: 0 auto;
	}

	.credits-content {
		max-width: 800px;
	}

	/* Supporter styles */
	.supporter-circle {
		padding-left: 1rem;
		border-left: 2px solid var(--color-divider);
	}

	.supporter-card {
		background: var(--color-surface-alt);
		border: 1px solid var(--color-border);
		border-radius: 0.75rem;
		padding: 1.25rem;
		margin-bottom: 1rem;
	}

	.supporter-card.featured {
		border-left: 3px solid var(--color-accent);
	}

	.supporter-header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.supporter-name {
		font-family: var(--font-serif);
		font-size: 1.1rem;
		color: var(--color-foreground);
		font-weight: 500;
	}

	.supporter-context {
		font-family: var(--font-sans);
		font-size: 0.875rem;
		color: var(--color-foreground-subtle);
	}

	.supporter-note {
		font-family: var(--font-sans);
		font-size: 0.9rem;
		color: var(--color-foreground-muted);
		line-height: 1.6;
		margin: 0;
	}

	.supporter-note em {
		color: var(--color-accent-muted);
		font-style: italic;
	}

	.supporter-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.supporter-item {
		font-family: var(--font-sans);
		font-size: 0.95rem;
		line-height: 1.5;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-divider);
	}

	.supporter-item:last-child {
		border-bottom: none;
	}

	.supporter-item .supporter-name {
		font-size: 1rem;
	}

	.supporter-desc {
		color: var(--color-foreground-muted);
	}

	.museum-link {
		color: var(--color-accent-muted);
		text-decoration: none;
		border-bottom: 1px dotted var(--color-accent-muted);
		transition: border-color 0.2s ease;
	}

	.museum-link:hover {
		border-bottom-style: solid;
	}

	/* Font category collapsible styling */
	.font-category summary::-webkit-details-marker {
		display: none;
	}

	.font-category[open] .category-chevron {
		transform: rotate(180deg);
	}

	.font-category summary {
		user-select: none;
	}
</style>
