<script lang="ts">
	import { enhance } from '$app/forms';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { MessageCircle, Clock, CheckCircle, ArrowLeft, Send, User, Mail, StickyNote } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let reply = $state('');
	let adminNotes = $state(data.visit?.admin_notes || '');
	let submitting = $state(false);
	let savingNotes = $state(false);

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
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	// Get reply email
	const replyToEmail = $derived(data.visit?.guest_email || data.userEmail || null);
</script>

<svelte:head>
	<title>{data.visit?.visit_number || 'Visit'} - Admin</title>
</svelte:head>

<!-- Back link -->
	<a
		href="/arbor/porch"
		class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground font-sans mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Porch
	</a>

	{#if !data.visit}
		<GlassCard class="text-center py-12">
			<MessageCircle class="w-12 h-12 mx-auto text-foreground/20 mb-4" />
			<h2 class="text-xl font-serif text-foreground mb-2">Visit not found</h2>
		</GlassCard>
	{:else}
		{@const config = statusConfig[data.visit.status as keyof typeof statusConfig] || statusConfig.open}

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Main Column -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Visit Header -->
				<GlassCard>
					<div class="flex items-start justify-between gap-4 mb-4">
						<div>
							<span class="text-xs font-mono text-foreground/50">{data.visit.visit_number}</span>
							<h1 class="text-xl font-serif text-foreground mt-1">{data.visit.subject}</h1>
							<p class="text-sm text-foreground-muted font-sans mt-1">
								{categoryLabels[data.visit.category] || data.visit.category} &middot; {formatDate(data.visit.created_at)}
							</p>
						</div>
					</div>
				</GlassCard>

				<!-- Messages -->
				<div class="space-y-4">
					{#each data.messages as message}
						<GlassCard class="{message.sender_type === 'autumn' ? 'bg-grove-50/80 border-grove-200 ml-8' : 'mr-8'}">
							<div class="flex items-center gap-2 mb-2">
								<span class="text-sm font-medium text-foreground">
									{#if message.sender_type === 'autumn'}
									Autumn (you)
								{:else if message.sender_name}
									{message.sender_name}
								{:else}
									<GroveSwap term="wanderer">Wanderer</GroveSwap>
								{/if}
								</span>
								<span class="text-xs text-foreground/50">
									{formatDate(message.created_at)}
								</span>
							</div>
							<p class="text-foreground font-sans whitespace-pre-wrap">{message.content}</p>
						</GlassCard>
					{/each}
				</div>

				<!-- Reply Form -->
				{#if form?.replySuccess}
					<div role="status" aria-live="polite">
						<GlassCard class="bg-green-50/80 border-green-200">
							<p class="text-sm text-green-800 font-sans">Reply sent to {replyToEmail}!</p>
						</GlassCard>
					</div>
				{/if}

				{#if form?.error}
					<div role="alert">
						<GlassCard class="bg-red-50/80 border-red-200">
							<p class="text-sm text-red-800 font-sans">{form.error}</p>
						</GlassCard>
					</div>
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
								if (form?.replySuccess) {
									reply = '';
								}
							};
						}}
					>
						<label for="reply" class="block text-sm font-sans font-medium text-foreground mb-2">
							Reply as Autumn
						</label>
						<textarea
							id="reply"
							name="content"
							bind:value={reply}
							placeholder="Write your reply..."
							rows="4"
							required
							aria-required="true"
							class="w-full px-4 py-3 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans transition-all resize-y"
							disabled={submitting}
						></textarea>
						{#if replyToEmail}
							<p class="text-xs text-foreground/50 font-sans mt-2">
								Will be emailed to {replyToEmail}
							</p>
						{/if}
						<div class="flex justify-end mt-3">
							<button
								type="submit"
								disabled={submitting || reply.length < 1}
								class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg font-sans text-sm hover:bg-grove-700 disabled:bg-grove-300 disabled:cursor-not-allowed transition-colors"
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
			</div>

			<!-- Sidebar -->
			<div class="space-y-4">
				<!-- Visitor Info -->
				<GlassCard>
					<h3 class="text-sm font-sans font-medium text-foreground mb-3 flex items-center gap-2">
						<User class="w-4 h-4" />
						Visitor
					</h3>
					<div class="space-y-2 text-sm font-sans">
						<p class="text-foreground">
							{data.visit.guest_name || 'No name provided'}
						</p>
						{#if replyToEmail}
							<p class="text-foreground-muted flex items-center gap-2">
								<Mail class="w-3 h-3" />
								<a href="mailto:{replyToEmail}" class="text-primary hover:underline">{replyToEmail}</a>
							</p>
						{/if}
						{#if data.visit.user_id}
							<p class="text-xs text-foreground/40">
								User ID: {data.visit.user_id}
							</p>
						{:else}
							<p class="text-xs text-foreground/40">(Guest)</p>
						{/if}
					</div>
				</GlassCard>

				<!-- Status -->
				<GlassCard>
					<h3 class="text-sm font-sans font-medium text-foreground mb-3">Status</h3>
					<div class="flex items-center gap-2 mb-3">
						<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-sans {config.color}">
							<svelte:component this={config.icon} class="w-4 h-4" />
							{config.label}
						</span>
					</div>
					<form method="POST" action="?/updateStatus" class="flex gap-2">
						<label for="update-status" class="sr-only">Update status</label>
						<select
							id="update-status"
							name="status"
							class="flex-1 px-3 py-2 rounded-lg border border-grove-200 bg-white/50 text-foreground font-sans text-sm focus:outline-none focus:ring-2 focus:ring-grove-500"
						>
							<option value="open" selected={data.visit.status === 'open'}>Open</option>
							<option value="pending" selected={data.visit.status === 'pending'}>Pending</option>
							<option value="resolved" selected={data.visit.status === 'resolved'}>Resolved</option>
						</select>
						<button
							type="submit"
							class="px-3 py-2 bg-grove-100 text-grove-700 rounded-lg font-sans text-sm hover:bg-grove-200 transition-colors"
						>
							Update
						</button>
					</form>
				</GlassCard>

				<!-- Admin Notes -->
				<GlassCard>
					<h3 class="text-sm font-sans font-medium text-foreground mb-3 flex items-center gap-2">
						<StickyNote class="w-4 h-4" />
						Internal Notes
					</h3>
					<form
						method="POST"
						action="?/saveNotes"
						use:enhance={() => {
							savingNotes = true;
							return async ({ update }) => {
								await update();
								savingNotes = false;
							};
						}}
					>
						<textarea
							name="notes"
							bind:value={adminNotes}
							placeholder="Private notes (not visible to visitor)..."
							rows="4"
							class="w-full px-3 py-2 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans text-sm transition-all resize-y"
							disabled={savingNotes}
						></textarea>
						<div class="flex justify-end mt-2">
							<button
								type="submit"
								disabled={savingNotes}
								class="px-3 py-1.5 bg-grove-100 text-grove-700 rounded-lg font-sans text-sm hover:bg-grove-200 transition-colors disabled:opacity-50"
							>
								{savingNotes ? 'Saving...' : 'Save notes'}
							</button>
						</div>
					</form>
					{#if form?.notesSuccess}
						<p role="status" aria-live="polite" class="text-xs text-green-600 mt-2">Notes saved!</p>
					{/if}
				</GlassCard>
			</div>
		</div>
	{/if}
