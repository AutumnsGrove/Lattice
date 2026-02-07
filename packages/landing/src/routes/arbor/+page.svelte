<script lang="ts">
	import type { PageData } from './$types';
	import { getUserDisplayName } from '@autumnsgrove/groveengine/utils';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import {
		MessageCircle,
		AtSign,
		Upload,
		MessageSquare,
		Sprout,
		Home,
		Gift,
		Activity,
		Users,
		Gamepad2,
		Github,
		Cloud,
		Bot,
		BarChart3,
		CreditCard,
		CircleDot,
		ExternalLink,
		Trees,
		Kanban
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Get display name for greeting (see docs/grove-user-identity.md)
	const userName = $derived(getUserDisplayName(data.user));
</script>

<svelte:head>
	<title>Admin Dashboard - Grove</title>
</svelte:head>

<!-- Welcome Section -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Welcome back, {userName}.</h1>
	<p class="text-foreground-muted font-sans mt-1">What would you like to manage today?</p>
</div>

<!-- Quick Links Grid -->
<section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	<!-- Feedback Card -->
	<a href="/arbor/feedback" class="block">
		<GlassCard hoverable class="p-6 h-full">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-grove-100 dark:bg-grove-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
					<MessageCircle class="w-6 h-6 text-grove-600 dark:text-grove-400" />
				</div>
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-serif text-foreground mb-1"><GroveSwap term="wanderer" standard="Visitor">Wanderer</GroveSwap> Feedback</h2>
					<p class="text-sm text-foreground-muted font-sans">
						View and respond to feedback from the community.
					</p>
				</div>
			</div>
		</GlassCard>
	</a>

	<!-- Subscribers Card -->
	<a href="/arbor/subscribers" class="block">
		<GlassCard hoverable class="p-6 h-full">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-grove-100 dark:bg-grove-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
					<AtSign class="w-6 h-6 text-grove-600 dark:text-grove-400" />
				</div>
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-serif text-foreground mb-1">Email Subscribers</h2>
					<p class="text-sm text-foreground-muted font-sans">
						View and manage email signups. Copy all subscriber emails for mass communication.
					</p>
				</div>
			</div>
		</GlassCard>
	</a>

	<!-- CDN Card -->
	<a href="/arbor/cdn" class="block">
		<GlassCard hoverable class="p-6 h-full">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-grove-100 dark:bg-grove-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
					<Upload class="w-6 h-6 text-grove-600 dark:text-grove-400" />
				</div>
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-serif text-foreground mb-1">CDN Manager</h2>
					<p class="text-sm text-foreground-muted font-sans">
						Upload and manage CDN assets including images, fonts, and other files.
					</p>
				</div>
			</div>
		</GlassCard>
	</a>

	<!-- Porch Card (Wayfinder only) -->
	{#if data.isWayfinder}
		<a href="/arbor/porch" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-grove-100 dark:bg-grove-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<MessageSquare class="w-6 h-6 text-grove-600 dark:text-grove-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1"><GroveSwap term="porch">The Porch</GroveSwap></h2>
						<p class="text-sm text-foreground-muted font-sans">
							View and respond to support conversations from <GroveSwap term="wanderer" standard="visitors">Wanderers</GroveSwap>.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Greenhouse Card (Wayfinder only) -->
		<a href="/arbor/greenhouse" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Sprout class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1">Greenhouse</h2>
						<p class="text-sm text-foreground-muted font-sans">
							Manage early access to experimental features for trusted tenants.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Comped Invites Card (Wayfinder only) -->
		<a href="/arbor/comped-invites" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Gift class="w-6 h-6 text-amber-600 dark:text-amber-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1">Comped Invites</h2>
						<p class="text-sm text-foreground-muted font-sans">
							Invite beta testers and friends to Grove with free accounts.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Status Card (Wayfinder only) -->
		<a href="/arbor/status" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Activity class="w-6 h-6 text-sky-600 dark:text-sky-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1">Status</h2>
						<p class="text-sm text-foreground-muted font-sans">
							Monitor service health, uptime, and infrastructure status.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Tenants Card (Wayfinder only) -->
		<a href="/arbor/tenants" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Users class="w-6 h-6 text-violet-600 dark:text-violet-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1">Tenants</h2>
						<p class="text-sm text-foreground-muted font-sans">
							View and manage tenant accounts across the Grove ecosystem.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>

		<!-- Minecraft Card (Wayfinder only) -->
		<a href="/arbor/minecraft" class="block">
			<GlassCard hoverable class="p-6 h-full">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 bg-lime-100 dark:bg-lime-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
						<Gamepad2 class="w-6 h-6 text-lime-600 dark:text-lime-400" />
					</div>
					<div class="flex-1 min-w-0">
						<h2 class="text-lg font-serif text-foreground mb-1">Minecraft</h2>
						<p class="text-sm text-foreground-muted font-sans">
							Manage the Grove Minecraft server and player settings.
						</p>
					</div>
				</div>
			</GlassCard>
		</a>
	{/if}
</section>

<!-- Quick Actions -->
<section class="mt-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Quick Actions</h2>
	<GlassCard class="p-6">
		<div class="flex flex-col gap-3">
			<a href="/" class="flex items-center gap-2 text-foreground-muted hover:text-foreground font-sans text-sm transition-colors">
				<Home class="w-4 h-4" />
				Back to Grove
			</a>
		</div>
	</GlassCard>
</section>

<!-- My Links (Wayfinder only) -->
{#if data.isWayfinder}
	<section class="mt-8">
		<h2 class="text-lg font-serif text-foreground mb-4">My Links</h2>
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<a href="https://github.com/AutumnsGrove/GroveEngine" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-cream-100 dark:bg-bark-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
							<Github class="w-5 h-5 text-foreground" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">GroveEngine</p>
							<p class="text-xs text-foreground-muted font-sans">GitHub Repository</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://dash.cloudflare.com/04e847fa7655624e84414a8280b3a4d0/home/domains" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<Cloud class="w-5 h-5 text-orange-600 dark:text-orange-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Cloudflare</p>
							<p class="text-xs text-foreground-muted font-sans">Domain Management</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://knownagents.com/projects/378d0348-a640-4be0-9a60-fbd306d6bf4e/crawlers-and-scrapers" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<Bot class="w-5 h-5 text-violet-600 dark:text-violet-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Known Agents</p>
							<p class="text-xs text-foreground-muted font-sans">Crawlers & Scrapers</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://dash.cloudflare.com/04e847fa7655624e84414a8280b3a4d0/grove.place" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-sky-100 dark:bg-sky-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<BarChart3 class="w-5 h-5 text-sky-600 dark:text-sky-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Grove.place</p>
							<p class="text-xs text-foreground-muted font-sans">Cloudflare Analytics</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<CreditCard class="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Stripe</p>
							<p class="text-xs text-foreground-muted font-sans">Payments & Billing</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://github.com/AutumnsGrove/GroveEngine/issues" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-grove-100 dark:bg-grove-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<CircleDot class="w-5 h-5 text-grove-600 dark:text-grove-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Issues</p>
							<p class="text-xs text-foreground-muted font-sans">GitHub Issue Tracker</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://github.com/users/AutumnsGrove/projects/1" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<Kanban class="w-5 h-5 text-purple-600 dark:text-purple-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">Lattice Board</p>
							<p class="text-xs text-foreground-muted font-sans">GitHub Project Kanban</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>

			<a href="https://autumn.grove.place/arbor" target="_blank" rel="noopener noreferrer" class="block">
				<GlassCard hoverable class="p-4 h-full">
					<div class="flex items-center gap-3">
						<div class="w-9 h-9 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
							<Trees class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-sans font-medium text-foreground">My Arbor</p>
							<p class="text-xs text-foreground-muted font-sans">autumn.grove.place</p>
						</div>
						<ExternalLink class="w-3.5 h-3.5 text-foreground-muted flex-shrink-0" />
					</div>
				</GlassCard>
			</a>
		</div>
	</section>
{/if}
