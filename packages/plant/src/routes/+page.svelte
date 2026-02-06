<script lang="ts">
	import { page } from '$app/state';
	import {
		GlassCard,
		Logo,
		RoadmapPreview
	} from '@autumnsgrove/groveengine/ui';
	import { LoginGraft } from '@autumnsgrove/groveengine/grafts/login';
	import {
		// Auth icons
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
		Sprout,
		// Notice icon
		AlertTriangle
	} from '@autumnsgrove/groveengine/ui/icons';

	// Use graft config for tier data
	import { transformAllTiers, type PricingTier } from '@autumnsgrove/groveengine/grafts/pricing';

	// Shared icon mapping
	import { tierIcons } from '$lib/ui/tier-icons';

	// Phase 1: Only Seedling available at launch
	// Shows just Seedling - keeps onboarding focused and simple
	const allTiers = transformAllTiers({ includeTiers: ['seedling'] });
	const planPreviews = allTiers.map((tier) => ({
		key: tier.key,
		name: tier.name,
		tagline: tier.tagline,
		monthlyPrice: tier.monthlyPrice,
		highlights: tier.featureStrings.slice(0, 3),
		status: tier.status,
		icon: tier.icon,
	}));

	// Auth section state
	let authExpanded = $state(false);

	// Check for signup gate redirect notice
	const showSignupGateNotice = $derived(page.url.searchParams.get('notice') === 'coming_soon');

	// Check for expired/invalid invite link notice
	const showInviteExpiredNotice = $derived(page.url.searchParams.get('notice') === 'invite_expired');

	// Config - could be fetched from API or environment
	const WAITLIST_COUNT = 67;

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
</script>

<div class="space-y-12 animate-fade-in">
	<!-- Returning user banner -->
	<div class="flex justify-center">
		<button
			onclick={() => {
				authExpanded = true;
				// Scroll to auth section smoothly
				document.querySelector('#auth-section')?.scrollIntoView({ behavior: 'smooth' });
			}}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-full
				bg-slate-100/60 dark:bg-slate-800/40 backdrop-blur-md
				border border-slate-200/50 dark:border-slate-700/40
				text-foreground-muted hover:text-foreground hover:border-primary/50
				transition-all cursor-pointer"
		>
			<LogIn class="w-4 h-4" />
			<span>Already have a blog? <span class="text-primary font-medium">Sign in</span></span>
		</button>
	</div>

	<!-- Invite Expired Notice (shown when invite link is invalid or already used) -->
	{#if showInviteExpiredNotice}
		<GlassCard variant="frosted" class="text-center border-amber-300/50 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
			<div class="flex items-center justify-center gap-2 mb-2">
				<AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
				<span class="font-medium text-foreground">Invite link expired</span>
			</div>
			<p class="text-foreground-muted text-sm">
				This invite link is no longer valid — it may have already been used or expired. If you think this is a mistake, reach out to whoever invited you.
			</p>
		</GlassCard>
	{/if}

	<!-- Signup Gate Notice (shown when user tries to sign up but payments aren't ready) -->
	{#if showSignupGateNotice}
		<GlassCard variant="frosted" class="text-center border-amber-300/50 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20">
			<div class="flex items-center justify-center gap-2 mb-2">
				<AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
				<span class="font-medium text-foreground">Almost there!</span>
			</div>
			<p class="text-foreground-muted text-sm">
				We're just finishing setting up payments. Join the waitlist at <a href="https://grove.place" class="text-primary hover:underline">grove.place</a> and we'll let you know the moment signups open!
			</p>
		</GlassCard>
	{/if}

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

		<!-- Phase 1: Single tier centered. When more tiers launch, use grid-cols-2 -->
		<div class="flex justify-center gap-6 stagger-children">
			{#each planPreviews as plan (plan.key)}
				{@const PlanIcon = tierIcons[plan.icon]}
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
				href="https://grove.place/pricing/full"
				class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
			>
				See future plans
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</section>

	<!-- Section 5: Auth (Begin your journey) -->
	<section id="auth-section">
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
				<!-- Expanded: Auth options (Passkey first for users who prefer it) -->
				<p class="text-center text-foreground-muted mb-6">
					Sign in to get started.
				</p>

				<LoginGraft
					providers={['email', 'passkey', 'google']}
					returnTo="/profile"
					variant="default"
					class="!p-0 !bg-transparent !border-none !shadow-none"
				/>

				<p class="text-xs text-foreground-subtle text-center mt-6">
					By continuing, you agree to our
					<a href="https://grove.place/knowledge/legal/terms-of-service" class="text-primary hover:underline">Terms of Service</a>
					and
					<a href="https://grove.place/knowledge/legal/privacy-policy" class="text-primary hover:underline">Privacy Policy</a>.
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
