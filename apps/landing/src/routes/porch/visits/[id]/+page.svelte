<script lang="ts">
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import Header from '$lib/components/Header.svelte';
	import { seasonStore } from '@autumnsgrove/lattice/ui/chrome';
	import Footer from '$lib/components/Footer.svelte';
	import { Logo } from '@autumnsgrove/lattice/ui/nature';
	import { MessageCircle, Clock, CheckCircle, ArrowLeft, Send } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let reply = $state('');
	let submitting = $state(false);

	const statusConfig = {
		open: { label: 'Open', icon: MessageCircle, color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' },
		pending: { label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30' },
		resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' },
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
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	const charCount = $derived(reply.length);
	const isValidLength = $derived(charCount >= 1 && charCount <= 5000);
</script>

<svelte:head>
	<title>{data.visit?.subject || 'Visit'} - The Porch</title>
</svelte:head>

<Header user={data.user} />

<main class="min-h-screen py-12 px-4">
	<div class="max-w-2xl mx-auto">
		<!-- Back link -->
		<a
			href="/porch/visits"
			class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground font-sans mb-6"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to visits
		</a>

		{#if !data.visit}
			<!-- Visit not found -->
			<GlassCard class="text-center">
				<Logo class="w-12 h-12 mx-auto mb-4" season={seasonStore.current} />
				<h2 class="text-xl font-serif text-foreground mb-2">Visit not found</h2>
				<p class="text-foreground-muted font-sans">
					This visit doesn't exist or you don't have access to it.
				</p>
			</GlassCard>
		{:else}
			{@const config = statusConfig[data.visit.status as keyof typeof statusConfig] || statusConfig.open}

			<!-- Visit Header -->
			<GlassCard class="mb-6">
				<div class="flex items-start justify-between gap-4 mb-4">
					<div>
						<span class="text-xs font-mono text-foreground/50">{data.visit.visit_number}</span>
						<h1 class="text-xl font-serif text-foreground mt-1">{data.visit.subject}</h1>
						<p class="text-sm text-foreground-muted font-sans mt-1">
							{categoryLabels[data.visit.category] || data.visit.category} &middot; Started {formatDate(data.visit.created_at)}
						</p>
					</div>
					<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-sans {config.color}">
						<config.icon class="w-4 h-4" />
						{config.label}
					</span>
				</div>
			</GlassCard>

			<!-- Messages -->
			<div class="space-y-4 mb-6">
				{#each data.messages as message}
					<div class="flex {message.sender_type === 'autumn' ? 'justify-start' : 'justify-end'}">
						<div class="max-w-[85%] {message.sender_type === 'autumn' ? 'order-2' : 'order-1'}">
							<GlassCard
								class={message.sender_type === 'autumn'
									? 'bg-grove-50/80 border-grove-200 dark:bg-grove-900/20 dark:border-grove-800'
									: 'bg-white/80 dark:bg-cream-200/50'}
							>
								<div class="flex items-center gap-2 mb-2">
									<span class="text-sm font-medium text-foreground">
										{message.sender_type === 'autumn' ? 'Autumn' : message.sender_name || 'You'}
									</span>
									<span class="text-xs text-foreground/50">
										{formatDate(message.created_at)}
									</span>
								</div>
								<p class="text-foreground font-sans whitespace-pre-wrap">{message.content}</p>
							</GlassCard>
						</div>
					</div>
				{/each}
			</div>

			<!-- Reply Form -->
			{#if data.visit.status !== 'resolved'}
				{#if form?.success}
					<GlassCard class="bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-800 mb-4">
						<p class="text-sm text-green-800 dark:text-green-300 font-sans">Reply sent! Autumn will see it soon.</p>
					</GlassCard>
				{/if}

				{#if form?.error}
					<GlassCard class="bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-4">
						<p class="text-sm text-red-800 dark:text-red-300 font-sans">{form.error}</p>
					</GlassCard>
				{/if}

				<GlassCard>
					<form
						method="POST"
						action="?/reply"
						use:enhance={() => {
							submitting = true;
							return async ({ update }) => {
								await update();
								submitting = false;
								if (form?.success) {
									reply = '';
								}
							};
						}}
					>
						<label for="reply" class="block text-sm font-sans font-medium text-foreground mb-2">
							Add a reply
						</label>
						<textarea
							id="reply"
							name="content"
							bind:value={reply}
							placeholder="Continue the conversation..."
							rows="4"
							required
							maxlength="5000"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 dark:border-cream-300 bg-white/50 dark:bg-cream-200/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all resize-y"
							disabled={submitting}
						></textarea>
						<div class="flex justify-between items-center mt-3">
							<span class="text-xs text-foreground/50 font-sans">{charCount}/5000</span>
							<button
								type="submit"
								disabled={submitting || !isValidLength}
								class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg font-sans text-sm hover:bg-grove-700 disabled:bg-grove-300 dark:disabled:bg-grove-800 disabled:cursor-not-allowed transition-colors"
							>
								{#if submitting}
									<svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Sending...
								{:else}
									<Send class="w-4 h-4" />
									Send reply
								{/if}
							</button>
						</div>
					</form>
				</GlassCard>
			{:else}
				<GlassCard class="text-center bg-grove-50/50 dark:bg-grove-900/20">
					<CheckCircle class="w-8 h-8 mx-auto text-grove-600 dark:text-grove-400 mb-2" />
					<p class="text-sm text-foreground-muted font-sans">
						This conversation has been resolved. Need more help?
						<a href="/porch/new" class="text-primary hover:text-primary/80 underline">Start a new visit</a>
					</p>
				</GlassCard>
			{/if}
		{/if}
	</div>
</main>

<Footer />
