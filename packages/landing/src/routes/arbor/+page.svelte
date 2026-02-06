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
		LogOut,
		Gift
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
