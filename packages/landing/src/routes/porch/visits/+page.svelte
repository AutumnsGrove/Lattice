<script lang="ts">
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { MessageCircle, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const statusConfig = {
		open: { label: 'Open', icon: MessageCircle, color: 'text-blue-600 bg-blue-100' },
		pending: { label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-100' },
		resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
	} as const;

	const categoryLabels: Record<string, string> = {
		billing: 'Billing',
		technical: 'Technical',
		account: 'Account',
		hello: 'Just saying hi',
		other: 'Other',
	};

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
	}
</script>

<svelte:head>
	<title>Your Visits - The Porch</title>
	<meta name="description" content="View your support conversations with Grove." />
</svelte:head>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Page Header -->
		<div class="text-center mb-8">
			<div class="inline-block mb-6">
				<Logo class="w-16 h-16" season={seasonStore.current} />
			</div>
			<h1 class="text-3xl font-serif text-foreground mb-3">Your Visits</h1>
			<p class="text-lg text-foreground-muted font-sans max-w-xl mx-auto">
				Your past conversations with the <GroveSwap term="wayfinder">Wayfinder</GroveSwap>.
			</p>
		</div>

		<!-- Not authenticated -->
		{#if !data.user}
			<GlassCard class="text-center">
				<AlertCircle class="w-12 h-12 mx-auto text-amber-500 mb-4" />
				<h2 class="text-xl font-serif text-foreground mb-2">Sign in to view your visits</h2>
				<p class="text-foreground-muted font-sans mb-4">
					Visit history is available for signed-in wanderers.
				</p>
				<a
					href="/auth/login?redirect=/porch/visits"
					class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg font-sans hover:bg-grove-700 transition-colors"
				>
					Sign in
				</a>
			</GlassCard>
		{:else if data.visits.length === 0}
			<!-- No visits -->
			<GlassCard class="text-center">
				<MessageCircle class="w-12 h-12 mx-auto text-grove-400 mb-4" />
				<h2 class="text-xl font-serif text-foreground mb-2">No visits yet</h2>
				<p class="text-foreground-muted font-sans mb-4">
					When you start a conversation, it'll show up here.
				</p>
				<a
					href="/porch/new"
					class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg font-sans hover:bg-grove-700 transition-colors"
				>
					Start a visit
					<ArrowRight class="w-4 h-4" />
				</a>
			</GlassCard>
		{:else}
			<!-- Visits list -->
			<div class="space-y-4">
				{#each data.visits as visit}
					{@const config = statusConfig[visit.status as keyof typeof statusConfig] || statusConfig.open}
					<a href="/porch/visits/{visit.id}" class="block">
						<GlassCard class="hover:border-grove-300 transition-colors">
							<div class="flex items-start gap-4">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1">
										<span class="text-xs font-mono text-foreground/50">{visit.visit_number}</span>
										<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans {config.color}">
											<svelte:component this={config.icon} class="w-3 h-3" />
											{config.label}
										</span>
									</div>
									<h3 class="font-serif text-foreground truncate">{visit.subject}</h3>
									<p class="text-sm text-foreground-muted font-sans mt-1">
										{categoryLabels[visit.category] || visit.category} &middot; {formatDate(visit.created_at)}
									</p>
								</div>
								<ArrowRight class="w-5 h-5 text-foreground/30 flex-shrink-0 mt-2" />
							</div>
						</GlassCard>
					</a>
				{/each}
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex justify-center gap-4 mt-8">
			<a href="/porch" class="text-sm text-foreground-subtle hover:text-foreground font-sans">
				Back to the Porch
			</a>
			{#if data.user}
				<a href="/porch/new" class="text-sm text-primary hover:text-primary/80 font-sans">
					Start a new visit
				</a>
			{/if}
		</div>
	</div>
</main>

<Footer />
