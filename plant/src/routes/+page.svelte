<script lang="ts">
	import {
		GlassCard,
		Logo,
		RoadmapPreview
	} from '@autumnsgrove/groveengine/ui';
	import {
		// Auth icons
		Mail,
		LogIn,
		ChevronDown,
		// Feature icons
		Leaf,
		Shield,
		Palette,
		Download,
		Rss,
		HardDrive,
		// Community icons
		Users,
		Heart,
		Eye,
		MessageCircle,
		// Journey
		ArrowRight,
		Clock,
		Lock,
		// Pricing tier icon (only need Sprout for Get Started button)
		Sprout
	} from '@autumnsgrove/groveengine/ui/icons';

	// Shared data
	import { tierIcons, getPlanPreviews } from '$lib/data/plans';
	// Auth section state
	let authExpanded = $state(false);

	// Config - could be fetched from API or environment
	const WAITLIST_COUNT = 59;

	// Google icon component (no Lucide equivalent with brand colors)
	const GoogleIcon = `<svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
	</svg>`;

	// Feature list for "What you'll get" section
	const features = [
		{
			icon: Leaf,
			title: 'Your own subdomain',
			description: 'yourname.grove.place — a corner of the web that\'s truly yours.'
		},
		{
			icon: Shield,
			title: 'Shade protection',
			description: 'Your words are not training data. AI crawlers blocked at the gate.'
		},
		{
			icon: Palette,
			title: 'Beautiful themes',
			description: 'Start beautiful by default. Customize when you\'re ready.'
		},
		{
			icon: Rss,
			title: 'RSS built in',
			description: 'The open web, the way it should be. Readers can follow you anywhere.'
		},
		{
			icon: HardDrive,
			title: 'Image hosting',
			description: 'Upload your images. We\'ll optimize them for you.'
		},
		{
			icon: Download,
			title: 'Data export',
			description: 'Your words are yours. Export everything, anytime.'
		}
	];

	// Get plan preview data from shared module
	const planPreviews = getPlanPreviews();
</script>

<div class="space-y-12 animate-fade-in">
	<!-- Returning user banner -->
	<div class="flex justify-center">
		<a
			href="/auth?provider=google"
			class="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full
				bg-slate-100/60 dark:bg-slate-800/40 backdrop-blur-md
				border border-slate-200/50 dark:border-slate-700/40
				text-foreground-muted hover:text-foreground hover:border-primary/50
				transition-all"
		>
			<LogIn class="w-4 h-4" />
			<span>Already have a blog? <span class="text-primary font-medium">Sign in</span></span>
		</a>
	</div>

	<!-- Coming Soon Notice -->
	<GlassCard variant="accent" class="text-center">
		<div class="flex items-center justify-center gap-2 mb-2">
			<Clock class="w-5 h-5 text-primary" />
			<span class="font-medium text-foreground">We're growing carefully</span>
		</div>
		<p class="text-foreground-muted text-sm">
			Signups aren't open quite yet, but we're almost ready. Take a look around and see what's coming.
		</p>
	</GlassCard>

	<!-- Section 1: Welcome -->
	<section class="text-center space-y-6">
		<div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100/40 dark:bg-emerald-900/30 backdrop-blur-md border border-emerald-200/40 dark:border-emerald-700/30 mb-2">
			<Logo class="w-12 h-12" />
		</div>

		<div>
			<h1 class="text-3xl md:text-4xl font-medium text-foreground mb-3">
				Plant your blog
			</h1>
			<p class="text-lg text-foreground-muted max-w-lg mx-auto leading-relaxed">
				A warm corner of the internet for your words to grow. No algorithms, no ads, no tracking.
				Just a quiet space that's truly yours.
			</p>
		</div>

		<div class="flex flex-wrap items-center justify-center gap-4 text-foreground-subtle text-sm">
			<span class="flex items-center gap-1.5">
				<Leaf class="w-4 h-4 text-primary" />
				yourname.grove.place
			</span>
			<span class="text-foreground-faint hidden sm:inline">|</span>
			<span class="flex items-center gap-1.5">
				<Shield class="w-4 h-4 text-primary" />
				AI-free zone
			</span>
		</div>

		<p class="text-sm text-foreground-subtle flex items-center justify-center gap-1.5 flex-wrap">
			<Users class="w-4 h-4 flex-shrink-0" />
			<span>Join {WAITLIST_COUNT} writers already on the waitlist</span>
		</p>
	</section>

	<!-- Section 2: What You Get -->
	<section>
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">What you'll get</h2>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
			{#each features as feature}
				<div class="glass-grove rounded-xl p-5 hover-lift">
					<div class="flex items-center gap-3 mb-2">
						<div class="p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30">
							<feature.icon class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<h3 class="font-medium text-foreground">{feature.title}</h3>
					</div>
					<p class="text-sm text-foreground-muted">{feature.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Section 3: What You're Joining -->
	<section>
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">What you're joining</h2>

		<GlassCard variant="muted" class="text-center space-y-6">
			<p class="text-foreground leading-relaxed max-w-md mx-auto">
				Grove isn't just a blog host. It's a community of people who believe the internet can be better —
				calmer, kinder, more intentional.
			</p>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
				<div class="space-y-2">
					<div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
						<Users class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p class="text-sm text-foreground-muted">Queer-friendly</p>
				</div>
				<div class="space-y-2">
					<div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
						<Eye class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p class="text-sm text-foreground-muted">No public metrics</p>
				</div>
				<div class="space-y-2">
					<div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
						<Heart class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p class="text-sm text-foreground-muted">Built with care</p>
				</div>
				<div class="space-y-2">
					<div class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100/50 dark:bg-emerald-900/30">
						<MessageCircle class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
					</div>
					<p class="text-sm text-foreground-muted">Private reactions</p>
				</div>
			</div>

			<p class="text-sm text-foreground-subtle italic">
				"A forest of voices. A place to be."
			</p>
		</GlassCard>
	</section>

	<!-- Section 4: Plans Preview -->
	<section>
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">Simple, honest pricing</h2>

		<div class="grid grid-cols-2 gap-6 stagger-children">
			{#each planPreviews as plan}
				{@const PlanIcon = tierIcons[plan.id]}
				{@const isAvailable = plan.status === 'available'}
				{@const isComingSoon = plan.status === 'coming_soon'}
				{@const isFuture = plan.status === 'future'}

				<div class="relative group">
					<!-- Status badge -->
					{#if isComingSoon}
						<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
							<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500 text-white shadow-lg shadow-amber-500/25">
								<Clock class="w-2.5 h-2.5" />
								Soon
							</span>
						</div>
					{:else if isFuture}
						<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
							<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-400 dark:bg-slate-600 text-white shadow-lg">
								<Lock class="w-2.5 h-2.5" />
								Future
							</span>
						</div>
					{/if}

					<a
						href="/plans"
						class="block {isFuture ? 'opacity-50 grayscale' : ''} {isComingSoon ? 'opacity-90' : ''}"
					>
						<GlassCard
							variant={isAvailable ? 'default' : 'muted'}
							class="relative text-center {isAvailable ? 'hover-lift' : ''} {isComingSoon || isFuture ? 'pt-4' : ''}"
						>
							<!-- Subtle overlay for unavailable tiers -->
							{#if isComingSoon}
								<div class="absolute inset-0 bg-amber-500/5 dark:bg-amber-500/5 rounded-xl pointer-events-none"></div>
							{:else if isFuture}
								<div class="absolute inset-0 bg-slate-500/5 dark:bg-slate-500/10 rounded-xl pointer-events-none"></div>
							{/if}

							<div class="relative z-10">
								<!-- Tier Icon -->
								<div
									class="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3
										{isAvailable
										? 'bg-emerald-100/60 dark:bg-emerald-900/40'
										: isComingSoon
											? 'bg-amber-100/60 dark:bg-amber-900/30'
											: 'bg-slate-100/60 dark:bg-slate-800/40'}"
								>
									<PlanIcon
										class="w-5 h-5 {isAvailable
											? 'text-emerald-600 dark:text-emerald-400'
											: isComingSoon
												? 'text-amber-600 dark:text-amber-400'
												: 'text-slate-400 dark:text-slate-500'}"
									/>
								</div>

								<h3 class="font-medium text-foreground">{plan.name}</h3>
								<p class="text-xs {isAvailable ? 'text-emerald-600 dark:text-emerald-400' : isComingSoon ? 'text-amber-600 dark:text-amber-400' : 'text-foreground-subtle'} mb-2">
									{plan.tagline}
								</p>

								<p class="text-2xl font-semibold text-foreground mb-3">
									${plan.monthlyPrice}<span class="text-sm font-normal text-foreground-muted">/mo</span>
								</p>

								<ul class="text-xs text-foreground-muted space-y-1">
									{#each plan.highlights as highlight}
										<li>{highlight}</li>
									{/each}
								</ul>

								{#if isAvailable}
									<span class="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
										Get started <ArrowRight class="w-3 h-3" />
									</span>
								{/if}
							</div>
						</GlassCard>
					</a>
				</div>
			{/each}
		</div>

		<div class="text-center mt-6">
			<a
				href="/plans"
				class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
			>
				See all plans
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</section>

	<!-- Section 5: Auth (Begin your journey) -->
	<section>
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">Begin your journey</h2>

		<GlassCard variant="frosted" class="max-w-lg mx-auto">
			{#if !authExpanded}
				<!-- Collapsed: Get Started button -->
				<div class="text-center space-y-5 py-2">
					<p class="text-foreground-muted">
						Ready to plant your blog? We'll walk you through the rest.
					</p>
					<button
						onclick={() => authExpanded = true}
						class="btn-primary w-full flex items-center justify-center gap-2"
					>
						<Sprout class="w-5 h-5" />
						Get Started
						<ChevronDown class="w-4 h-4" />
					</button>
				</div>
			{:else}
				<!-- Expanded: Auth options -->
				<p class="text-center text-foreground-muted mb-6">
					Choose how you'd like to get started.
				</p>

				<div class="space-y-3">
					<!-- Google -->
					<a href="/auth?provider=google" class="btn-auth bg-grove-600 hover:bg-grove-700 text-white border-grove-600 hover:border-grove-700">
						{@html GoogleIcon}
						<span>Continue with Google</span>
					</a>

					<!-- Divider -->
					<div class="relative my-5">
						<div class="absolute inset-0 flex items-center">
							<div class="w-full border-t border-slate-300 dark:border-slate-600"></div>
						</div>
						<div class="relative flex justify-center text-sm">
							<span class="px-3 bg-white/70 dark:bg-slate-800/70 text-foreground-subtle rounded">or</span>
						</div>
					</div>

					<!-- Email magic code -->
					<a href="/auth?provider=email" class="btn-auth">
						<Mail size={20} />
						<span>Continue with Email</span>
					</a>
				</div>

				<p class="text-xs text-foreground-subtle text-center mt-6">
					By continuing, you agree to our
					<a href="https://grove.place/legal/terms" class="text-primary hover:underline">Terms of Service</a>
					and
					<a href="https://grove.place/legal/privacy" class="text-primary hover:underline">Privacy Policy</a>.
				</p>
			{/if}
		</GlassCard>
	</section>

	<!-- Section 6: The Journey Ahead -->
	<section>
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">The journey ahead</h2>

		<RoadmapPreview
			phase="Thaw"
			subtitle="The ice begins to crack"
			description="Grove opens its doors. The first trees take root. We're growing carefully, building something meant to last."
			progress={33}
			href="https://grove.place/roadmap"
			class="max-w-md mx-auto"
		/>
	</section>

	<!-- Opening Soon Message -->
	<section class="text-center space-y-4 pb-4">
		<div class="flex items-center justify-center gap-2 animate-pulse-subtle">
			<Leaf class="w-5 h-5 text-primary" />
			<span class="text-foreground-muted">Opening soon</span>
			<Leaf class="w-5 h-5 text-primary" />
		</div>
		<p class="text-sm text-foreground-subtle max-w-sm mx-auto">
			We're putting the finishing touches on a few things. When we're ready, you'll be the first to know.
		</p>
		<a
			href="https://grove.place"
			class="inline-flex items-center gap-2 text-sm text-primary hover:underline"
		>
			Join the waitlist
			<ArrowRight class="w-4 h-4" />
		</a>
	</section>
</div>
