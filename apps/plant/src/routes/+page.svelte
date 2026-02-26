<script lang="ts">
	import { page } from "$app/state";
	import { GlassCard, Glass, Logo, GroveTerm, RoadmapPreview } from "@autumnsgrove/lattice/ui";
	import { LoginRedirectButton } from "@autumnsgrove/lattice/grafts/login";
	import {
		TreePine,
		TreeCherry,
		FallingPetalsLayer,
		FallingLeavesLayer,
		SnowfallLayer,
		Robin,
		Cardinal,
		Chickadee,
	} from "@autumnsgrove/lattice/ui/nature";
	import { seasonStore } from "@autumnsgrove/lattice/ui/chrome";
	import {
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
		// Notice icon
		AlertTriangle,
	} from "@autumnsgrove/lattice/ui/icons";

	// Use graft config for tier data
	import { transformAllTiers, type PricingTier } from "@autumnsgrove/lattice/grafts/pricing";

	// Shared icon mapping
	import { tierIcons } from "$lib/ui/tier-icons";

	// Seasonal awareness
	const season = $derived(seasonStore.current);
	const isSpring = $derived(season === "spring");
	const isAutumn = $derived(season === "autumn");
	const isWinter = $derived(season === "winter");
	const isSummer = $derived(season === "summer");

	// Seasonal accent color classes — shift the whole page's feel with the season
	const accentBg = $derived(
		isSpring
			? "bg-pink-100/40 dark:bg-pink-900/30"
			: isAutumn
				? "bg-amber-100/40 dark:bg-amber-900/30"
				: isWinter
					? "bg-sky-100/40 dark:bg-sky-900/30"
					: "bg-emerald-100/40 dark:bg-emerald-900/30",
	);
	const accentIconBg = $derived(
		isSpring
			? "bg-pink-100/50 dark:bg-pink-900/30"
			: isAutumn
				? "bg-amber-100/50 dark:bg-amber-900/30"
				: isWinter
					? "bg-sky-100/50 dark:bg-sky-900/30"
					: "bg-emerald-100/50 dark:bg-emerald-900/30",
	);
	const accentIconText = $derived(
		isSpring
			? "text-pink-600 dark:text-pink-400"
			: isAutumn
				? "text-amber-600 dark:text-amber-400"
				: isWinter
					? "text-sky-600 dark:text-sky-400"
					: "text-emerald-600 dark:text-emerald-400",
	);
	const accentText = $derived(
		isSpring
			? "text-pink-600 dark:text-pink-400"
			: isAutumn
				? "text-amber-600 dark:text-amber-400"
				: isWinter
					? "text-sky-600 dark:text-sky-400"
					: "text-emerald-600 dark:text-emerald-400",
	);

	// Available tiers: Wanderer (free) and Seedling ($8/mo)
	const allTiers = transformAllTiers({ includeTiers: ["free", "seedling"] });
	const planPreviews = allTiers.map((tier) => ({
		key: tier.key,
		name: tier.name,
		tagline: tier.tagline,
		monthlyPrice: tier.monthlyPrice,
		highlights: tier.featureStrings.slice(0, 3),
		status: tier.status,
		icon: tier.icon,
	}));

	// Check for expired/invalid invite link notice
	const showInviteExpiredNotice = $derived(
		page.url.searchParams.get("notice") === "invite_expired",
	);

	// Auth error display (redirected here with ?error= and ?error_code= from callbacks)
	const authError = $derived(page.url.searchParams.get("error"));
	const authErrorCode = $derived(page.url.searchParams.get("error_code"));
	const showAuthError = $derived(!!authError);

	// Feature list for "What you'll get" section
	const features = [
		{
			icon: Leaf,
			title: "Your own subdomain",
			description: "yourname.grove.place — a corner of the web that's truly yours.",
		},
		{
			icon: Shield,
			title: "Shade protection",
			description: "Your words are not training data. AI crawlers blocked at the gate.",
		},
		{
			icon: Palette,
			title: "Beautiful themes",
			description: "Start beautiful by default. Customize when you're ready.",
		},
		{
			icon: Rss,
			title: "RSS built in",
			description: "The open web, the way it should be. Readers can follow you anywhere.",
		},
		{
			icon: HardDrive,
			title: "Image hosting",
			description: "Upload your images. We'll optimize them for you.",
		},
		{
			icon: Download,
			title: "Data export",
			description: "Your words are yours. Export everything, anytime.",
		},
	];
</script>

<div class="space-y-12 animate-fade-in relative">
	<!-- Seasonal particle layer — very light, atmospheric -->
	{#if isSpring}
		<div class="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
			<FallingPetalsLayer count={12} zIndex={0} />
		</div>
	{:else if isAutumn}
		<div class="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
			<FallingLeavesLayer
				trees={[
					{ id: 1, x: 20, y: 0, size: 80, treeType: "cherry" },
					{ id: 2, x: 70, y: 0, size: 80, treeType: "aspen" },
				]}
				season="autumn"
				minLeavesPerTree={3}
				maxLeavesPerTree={5}
			/>
		</div>
	{:else if isWinter}
		<div class="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
			<SnowfallLayer count={15} zIndex={0} />
		</div>
	{/if}

	<!-- Returning user banner -->
	<div class="flex justify-center relative z-10">
		<LoginRedirectButton
			returnTo="/profile"
			label="Already have a blog? Sign in"
			variant="ghost"
			size="sm"
			showLogo={false}
			class="!rounded-full !px-4 !py-2 !text-sm
				bg-bark-100/60 dark:bg-bark-800/40
				border-bark-200/50 dark:border-bark-700/40
				text-foreground-muted hover:text-foreground hover:border-primary/50"
		/>
	</div>

	<!-- Auth Error Notice (shown when auth callback redirects with ?error=) -->
	{#if showAuthError}
		<GlassCard
			variant="frosted"
			class="text-center border-red-300/50 dark:border-red-500/30 bg-red-50/60 dark:bg-red-950/20"
		>
			<div class="flex items-center justify-center gap-2 mb-2">
				<AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400" />
				<span class="font-medium text-foreground">Sign-in trouble</span>
			</div>
			<p class="text-foreground-muted text-sm">
				{authError}
			</p>
			{#if authErrorCode}
				<p class="text-xs text-red-700/50 dark:text-red-300/40 text-center mt-2 font-mono">
					{authErrorCode}
				</p>
			{/if}
			<LoginRedirectButton
				returnTo="/profile"
				label="Try again"
				variant="ghost"
				size="sm"
				showLogo={false}
				class="mt-3 !text-sm !text-primary hover:underline"
			/>
		</GlassCard>
	{/if}

	<!-- Invite Expired Notice (shown when invite link is invalid or already used) -->
	{#if showInviteExpiredNotice}
		<GlassCard
			variant="frosted"
			class="text-center border-amber-300/50 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20"
		>
			<div class="flex items-center justify-center gap-2 mb-2">
				<AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400" />
				<span class="font-medium text-foreground">Invite link expired</span>
			</div>
			<p class="text-foreground-muted text-sm">
				This invite link is no longer valid — it may have already been used or expired. If you think
				this is a mistake, reach out to whoever invited you.
			</p>
		</GlassCard>
	{/if}

	<!-- Section 1: Welcome — with nature flanking the logo -->
	<section class="text-center space-y-6 relative z-10">
		<!-- Nature decoration: trees flanking the hero -->
		<div class="relative inline-block">
			<!-- Left tree -->
			<div class="absolute -left-16 bottom-0 opacity-40 hidden sm:block" aria-hidden="true">
				<TreePine class="w-10 h-14" {season} />
			</div>

			<!-- Logo circle with seasonal accent -->
			<div
				class="inline-flex items-center justify-center w-20 h-20 rounded-full {accentBg} backdrop-blur-md border border-emerald-200/40 dark:border-emerald-700/30 mb-2"
			>
				<Logo class="w-12 h-12" {season} />
			</div>

			<!-- Right tree -->
			<div class="absolute -right-16 bottom-0 opacity-40 hidden sm:block" aria-hidden="true">
				<TreeCherry class="w-10 h-14" {season} />
			</div>

			<!-- Seasonal bird perched on the right tree -->
			<div class="absolute -right-12 -top-1 opacity-50 hidden sm:block" aria-hidden="true">
				{#if isSpring || isSummer}
					<Robin class="w-5 h-5" facing="left" />
				{:else if isAutumn}
					<Cardinal class="w-5 h-5" facing="left" />
				{:else}
					<Chickadee class="w-5 h-5" facing="left" />
				{/if}
			</div>
		</div>

		<div>
			<h1 class="text-3xl md:text-4xl font-medium text-foreground mb-3">
				Plant your <GroveTerm term="your-garden">blog</GroveTerm>
			</h1>
			<p class="text-lg text-foreground-muted max-w-lg mx-auto leading-relaxed">
				A warm corner of the internet for your words to grow. No algorithms, no ads, no tracking.
				Just a quiet space that's truly yours.
			</p>
		</div>

		<div class="flex flex-wrap items-center justify-center gap-4 text-foreground-subtle text-sm">
			<span class="flex items-center gap-1.5">
				<Leaf class="w-4 h-4 {accentText}" />
				yourname.grove.place
			</span>
			<span class="text-foreground-faint hidden sm:inline">|</span>
			<span class="flex items-center gap-1.5">
				<Shield class="w-4 h-4 {accentText}" />
				AI-free zone
			</span>
		</div>

		<p class="text-sm text-foreground-subtle flex items-center justify-center gap-1.5 flex-wrap">
			<Users class="w-4 h-4 flex-shrink-0" />
			<span
				>Join <GroveTerm term="wanderer">wanderers</GroveTerm> building their corner of the web</span
			>
		</p>
	</section>

	<!-- Section 2: What You Get -->
	<section class="relative z-10">
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">What you'll get</h2>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
			{#each features as feature}
				<Glass variant="tint" class="rounded-xl p-5 hover-lift">
					<div class="flex items-center gap-3 mb-2">
						<div class="p-2 rounded-lg {accentIconBg}">
							<feature.icon class="w-5 h-5 {accentIconText}" />
						</div>
						<h3 class="font-medium text-foreground">{feature.title}</h3>
					</div>
					<p class="text-sm text-foreground-muted">{feature.description}</p>
				</Glass>
			{/each}
		</div>
	</section>

	<!-- Section 3: What You're Joining -->
	<section class="relative z-10">
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">What you're joining</h2>

		<GlassCard variant="muted" class="text-center space-y-6">
			<p class="text-foreground leading-relaxed max-w-md mx-auto">
				<GroveTerm term="your-grove">Grove</GroveTerm> isn't just a blog host. It's a community of people
				who believe the internet can be better — calmer, kinder, more intentional.
			</p>

			<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
				<div class="space-y-2">
					<div
						class="inline-flex items-center justify-center w-10 h-10 rounded-full {accentIconBg}"
					>
						<Users class="w-5 h-5 {accentIconText}" />
					</div>
					<p class="text-sm text-foreground-muted">Queer-friendly</p>
				</div>
				<div class="space-y-2">
					<div
						class="inline-flex items-center justify-center w-10 h-10 rounded-full {accentIconBg}"
					>
						<Eye class="w-5 h-5 {accentIconText}" />
					</div>
					<p class="text-sm text-foreground-muted">No public metrics</p>
				</div>
				<div class="space-y-2">
					<div
						class="inline-flex items-center justify-center w-10 h-10 rounded-full {accentIconBg}"
					>
						<Heart class="w-5 h-5 {accentIconText}" />
					</div>
					<p class="text-sm text-foreground-muted">Built with care</p>
				</div>
				<div class="space-y-2">
					<div
						class="inline-flex items-center justify-center w-10 h-10 rounded-full {accentIconBg}"
					>
						<MessageCircle class="w-5 h-5 {accentIconText}" />
					</div>
					<p class="text-sm text-foreground-muted">Private reactions</p>
				</div>
			</div>

			<p class="text-sm text-foreground-subtle italic">"A forest of voices. A place to be."</p>
		</GlassCard>
	</section>

	<!-- Section 4: Plans Preview -->
	<section class="relative z-10">
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">
			Simple, honest pricing
		</h2>

		<div class="flex justify-center gap-6 stagger-children">
			{#each planPreviews as plan (plan.key)}
				{@const PlanIcon = tierIcons[plan.icon]}
				{@const isAvailable = plan.status === "available"}
				{@const isComingSoon = plan.status === "coming_soon"}
				{@const isFuturePlan = plan.status === "future"}

				<div class="relative group">
					<!-- Status badge -->
					{#if isComingSoon}
						<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
							<span
								class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500 text-white shadow-lg shadow-amber-500/25"
							>
								<Clock class="w-2.5 h-2.5" />
								Soon
							</span>
						</div>
					{:else if isFuturePlan}
						<div class="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
							<span
								class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-bark-400 dark:bg-bark-600 text-white shadow-lg"
							>
								<Lock class="w-2.5 h-2.5" />
								Future
							</span>
						</div>
					{/if}

					<a
						href="/plans"
						class="block {isFuturePlan ? 'opacity-50 grayscale' : ''} {isComingSoon
							? 'opacity-90'
							: ''}"
					>
						<GlassCard
							variant={isAvailable ? "default" : "muted"}
							class="relative text-center {isAvailable ? 'hover-lift' : ''} {isComingSoon ||
							isFuturePlan
								? 'pt-4'
								: ''}"
						>
							<!-- Subtle overlay for unavailable tiers -->
							{#if isComingSoon}
								<div
									class="absolute inset-0 bg-amber-500/5 dark:bg-amber-500/5 rounded-xl pointer-events-none"
								></div>
							{:else if isFuturePlan}
								<div
									class="absolute inset-0 bg-bark-500/5 dark:bg-bark-500/10 rounded-xl pointer-events-none"
								></div>
							{/if}

							<div class="relative z-10">
								<!-- Tier Icon -->
								<div
									class="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3
										{isAvailable
										? accentIconBg
										: isComingSoon
											? 'bg-amber-100/60 dark:bg-amber-900/30'
											: 'bg-bark-100/60 dark:bg-bark-800/40'}"
								>
									<PlanIcon
										class="w-5 h-5 {isAvailable
											? accentIconText
											: isComingSoon
												? 'text-amber-600 dark:text-amber-400'
												: 'text-bark-700 dark:text-bark-500'}"
									/>
								</div>

								<h3 class="font-medium text-foreground">{plan.name}</h3>
								<p
									class="text-xs {isAvailable
										? accentText
										: isComingSoon
											? 'text-amber-600 dark:text-amber-400'
											: 'text-foreground-subtle'} mb-2"
								>
									{plan.tagline}
								</p>

								<p class="text-2xl font-semibold text-foreground mb-3">
									${plan.monthlyPrice}<span class="text-sm font-normal text-foreground-muted"
										>/mo</span
									>
								</p>

								<ul class="text-xs text-foreground-muted space-y-1">
									{#each plan.highlights as highlight}
										<li>{highlight}</li>
									{/each}
								</ul>

								{#if isAvailable}
									<span
										class="mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
									>
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
				href="https://grove.place/pricing"
				class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
			>
				See future plans
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</section>

	<!-- Section 5: Auth (Begin your journey) -->
	<section id="auth-section" class="relative z-10">
		<h2 class="text-lg font-medium text-center text-foreground-muted mb-6">Begin your journey</h2>

		<GlassCard variant="frosted" class="max-w-lg mx-auto">
			<div class="text-center space-y-5 py-2">
				<p class="text-foreground-muted">
					Ready to plant your <GroveTerm term="your-garden">blog</GroveTerm>? We'll walk you through
					the rest.
				</p>

				<LoginRedirectButton
					returnTo="/profile"
					label="Get Started"
					variant="accent"
					size="lg"
					class="w-full"
				/>

				<p class="text-xs text-foreground-subtle">
					By continuing, you agree to our
					<a
						href="https://grove.place/knowledge/legal/terms-of-service"
						class="text-primary hover:underline">Terms of Service</a
					>
					and
					<a
						href="https://grove.place/knowledge/legal/privacy-policy"
						class="text-primary hover:underline">Privacy Policy</a
					>.
				</p>
			</div>
		</GlassCard>
	</section>

	<!-- Section 6: The Journey Ahead -->
	<section class="relative z-10">
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
</div>
