<script lang="ts">
	import { GlassCard, GlassButton, GroveTerm, GroveIntro } from '@autumnsgrove/groveengine/ui';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { MessageCircle, Clock, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>The Porch - Grove Support</title>
	<meta name="description" content="Have a seat on the porch. Whether you're stuck, confused, or just want to say hi, we're here to help." />
</svelte:head>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Page Header -->
		<div class="text-center mb-10">
			<div class="inline-block mb-6">
				<Logo class="w-16 h-16" season={seasonStore.current} />
			</div>
			<h1 class="text-3xl font-serif text-foreground mb-3">The <GroveTerm term="porch">Porch</GroveTerm></h1>
			<GroveIntro term="porch" />
			<p class="text-lg text-foreground-muted font-sans max-w-xl mx-auto">
				Have a seat. Whether you're stuck, confused, or just want to say hi—I'm here to help. This is a conversation, not a ticket queue.
			</p>
		</div>

		<!-- Main Action -->
		<GlassCard class="mb-6 text-center">
			<div class="py-4">
				<MessageCircle class="w-12 h-12 mx-auto text-grove-600 mb-4" />
				<h2 class="text-xl font-serif text-foreground mb-2">Start a Visit</h2>
				<p class="text-foreground-muted font-sans mb-6 max-w-md mx-auto">
					Tell me what's going on. I read everything personally and respond as quickly as I can.
				</p>
				<GlassButton href="/porch/new" variant="accent" class="inline-flex items-center gap-2">
					Start a conversation
					<ArrowRight class="w-4 h-4" />
				</GlassButton>
			</div>
		</GlassCard>

		<!-- Visit History (if authenticated) -->
		{#if data.user}
			<GlassCard class="mb-6">
				<div class="flex items-start gap-4">
					<div class="w-10 h-10 bg-grove-100 rounded-lg flex items-center justify-center text-grove-600 flex-shrink-0">
						<Clock class="w-5 h-5" />
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-serif text-foreground mb-1">Your Visits</h3>
						<p class="text-sm text-foreground-muted font-sans mb-3">
							View your past conversations and their status.
						</p>
						<a
							href="/porch/visits"
							class="text-sm text-primary hover:text-primary/80 font-sans inline-flex items-center gap-1"
						>
							View visit history
							<ArrowRight class="w-3 h-3" />
						</a>
					</div>
				</div>
			</GlassCard>
		{/if}

		<!-- What to Expect -->
		<div class="text-center">
			<p class="text-sm text-foreground-subtle font-sans">
				<span class="font-medium">What to expect:</span> I typically respond within a day, often much sooner.
				You'll get an email when I reply.
			</p>
		</div>
	</div>
</main>

<Footer />
