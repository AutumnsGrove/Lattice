<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { Smile, Frown, Meh, Mail, Globe, MessageCircle } from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	interface Feedback {
		id: string;
		source: 'web' | 'email';
		name: string | null;
		email: string | null;
		subject: string | null;
		message: string;
		sentiment: 'positive' | 'negative' | 'neutral' | null;
		ip_address: string | null;
		user_agent: string | null;
		status: 'new' | 'read' | 'archived';
		read_at: number | null;
		archived_at: number | null;
		admin_notes: string | null;
		created_at: number;
		updated_at: number;
	}

	let { data }: { data: PageData } = $props();

	let feedback = $derived(data.feedback as Feedback[]);
	let stats = $derived(data.stats);
	let expandedId = $state<string | null>(null);
	let editingNotesId = $state<string | null>(null);
	let notesText = $state<Record<string, string>>({});

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatRelativeDate(timestamp: number): string {
		const now = Date.now();
		const date = timestamp * 1000;
		const diff = now - date;
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return formatDate(timestamp);
	}

	// Sentiment icon mapping (replacing emojis)
	const sentimentIcons: Record<string, ComponentType> = {
		positive: Smile,
		negative: Frown,
		neutral: Meh
	};

	const sentimentColors: Record<string, string> = {
		positive: 'text-green-500 dark:text-green-400',
		negative: 'text-red-500 dark:text-red-400',
		neutral: 'text-amber-500 dark:text-amber-400'
	};

	function getSentimentLabel(sentiment: string | null): string {
		if (sentiment === 'positive') return 'Positive';
		if (sentiment === 'negative') return 'Concern';
		if (sentiment === 'neutral') return 'Neutral';
		return 'None';
	}

	// Source icon mapping (replacing emojis)
	const sourceIcons: Record<string, ComponentType> = {
		email: Mail,
		web: Globe
	};

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

	function handleRowKeydown(event: KeyboardEvent, id: string) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggleExpand(id);
		}
	}

	function startEditingNotes(id: string, currentNotes: string | null) {
		editingNotesId = id;
		notesText[id] = currentNotes || '';
	}

	function cancelEditingNotes() {
		editingNotesId = null;
	}
</script>

<svelte:head>
	<title>Feedback - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground"><GroveSwap term="wanderer">Wanderer</GroveSwap> Feedback</h1>
	<p class="text-foreground-muted font-sans mt-1">
		{stats.total} total
		{#if stats.new_count > 0}
			<span class="text-grove-600 dark:text-grove-400">· {stats.new_count} new</span>
		{/if}
	</p>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
	<GlassCard class="p-4 text-center">
		<div class="text-2xl font-serif text-foreground">{stats.total}</div>
		<div class="text-sm text-foreground-muted font-sans">Total</div>
	</GlassCard>
	<GlassCard class="p-4 text-center bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
		<div class="text-2xl font-serif text-green-700 dark:text-green-400">{stats.new_count}</div>
		<div class="text-sm text-green-700/80 dark:text-green-400/80 font-sans">New</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<div class="text-2xl font-serif text-foreground">{stats.web_count}</div>
		<div class="text-sm text-foreground-muted font-sans">Web Form</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<div class="text-2xl font-serif text-foreground">{stats.email_count}</div>
		<div class="text-sm text-foreground-muted font-sans">Email</div>
	</GlassCard>
</div>

<!-- Feedback List -->
<section>
	{#if feedback.length === 0}
		<GlassCard class="text-center py-12">
			<MessageCircle class="w-16 h-16 mx-auto mb-4 text-foreground/20" />
			<p class="text-foreground-muted font-sans">No feedback yet</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-slate-700">
			<div class="overflow-x-auto">
				<table class="w-full" aria-label="Wanderer feedback">
					<thead class="bg-grove-50 dark:bg-slate-800/50 border-b border-grove-200 dark:border-slate-700">
						<tr>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider w-12">
								<span class="sr-only">Source</span>
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								From
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Message
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Date
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Status
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-grove-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800/30">
						{#each feedback as item}
							{@const SourceIcon = sourceIcons[item.source] || Globe}
							{@const SentimentIcon = item.sentiment ? sentimentIcons[item.sentiment] : null}
							<tr
								class="hover:bg-grove-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
								tabindex="0"
								role="button"
								aria-expanded={expandedId === item.id}
								aria-controls="details-{item.id}"
								onclick={() => toggleExpand(item.id)}
								onkeydown={(e) => handleRowKeydown(e, item.id)}
							>
								<td class="px-6 py-4 text-center">
									<span title={item.source === 'email' ? 'Email' : 'Web form'}>
										<svelte:component
											this={SourceIcon}
											class="w-5 h-5 text-foreground-muted mx-auto"
										/>
									</span>
								</td>
								<td class="px-6 py-4">
									<div class="flex items-center gap-2">
										{#if SentimentIcon}
											<svelte:component
												this={SentimentIcon}
												class="w-5 h-5 {sentimentColors[item.sentiment || 'neutral']}"
												aria-label="{getSentimentLabel(item.sentiment)} sentiment"
											/>
										{/if}
										<div>
											<div class="text-sm font-sans text-foreground font-medium">
												{item.name || 'Anonymous Visitor'}
											</div>
											{#if item.email}
												<div class="text-xs font-sans text-foreground-muted">{item.email}</div>
											{/if}
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm font-sans text-foreground">
										{#if item.subject}
											<div class="font-medium mb-1">{item.subject}</div>
										{/if}
										<div class="text-foreground-muted line-clamp-2">
											{item.message.substring(0, 100)}{item.message.length > 100 ? '...' : ''}
										</div>
									</div>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-sans text-foreground-muted">{formatRelativeDate(item.created_at)}</span>
								</td>
								<td class="px-6 py-4">
									{#if item.status === 'new'}
										<span class="text-xs font-sans bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">New</span>
									{:else if item.status === 'read'}
										<span class="text-xs font-sans bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">Read</span>
									{:else}
										<span class="text-xs font-sans bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 px-2 py-1 rounded">Archived</span>
									{/if}
								</td>
							</tr>
							{#if expandedId === item.id}
								<tr id="details-{item.id}" class="bg-grove-50/30 dark:bg-slate-800/50">
									<td colspan="5" class="px-6 py-6">
										<div class="max-w-3xl">
											<!-- Full Details -->
											<div class="mb-4 space-y-2 text-sm font-sans">
												<div class="text-foreground"><strong>From:</strong> {item.name || 'Anonymous Visitor'} {#if item.email}({item.email}){/if}</div>
												<div class="text-foreground"><strong>Source:</strong> {item.source === 'email' ? 'Email' : 'Web form'}</div>
												{#if item.subject}
													<div class="text-foreground"><strong>Subject:</strong> {item.subject}</div>
												{/if}
												{#if item.sentiment}
													{@const DetailSentimentIcon = sentimentIcons[item.sentiment]}
													<div class="flex items-center gap-2 text-foreground">
														<strong>Sentiment:</strong>
														{#if DetailSentimentIcon}
															<svelte:component
																this={DetailSentimentIcon}
																class="w-4 h-4 {sentimentColors[item.sentiment]}"
															/>
														{/if}
														{getSentimentLabel(item.sentiment)}
													</div>
												{/if}
												<div class="text-foreground"><strong>Submitted:</strong> {formatDate(item.created_at)}</div>
											</div>

											<!-- Full Message -->
											<GlassCard class="p-4 mb-4">
												<p class="text-sm font-sans text-foreground whitespace-pre-wrap">{item.message}</p>
											</GlassCard>

											<!-- Admin Notes -->
											<div class="mb-4">
												<label class="block text-sm font-sans font-medium text-foreground mb-2">Admin Notes</label>
												{#if editingNotesId === item.id}
													<form method="POST" action="?/saveNotes" use:enhance>
														<input type="hidden" name="id" value={item.id} />
														<textarea
															name="notes"
															bind:value={notesText[item.id]}
															rows="3"
															class="w-full px-3 py-2 border border-grove-200 dark:border-slate-600 rounded-lg text-sm font-sans bg-white dark:bg-slate-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
															placeholder="Add notes about this feedback..."
														></textarea>
														<div class="flex gap-2 mt-2">
															<button
																type="submit"
																class="px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
															>
																Save Notes
															</button>
															<button
																type="button"
																onclick={cancelEditingNotes}
																class="px-4 py-2 bg-white dark:bg-slate-700 border border-grove-200 dark:border-slate-600 text-foreground rounded-lg text-sm font-sans hover:bg-grove-50 dark:hover:bg-slate-600 transition-colors"
															>
																Cancel
															</button>
														</div>
													</form>
												{:else}
													<GlassCard class="p-3 mb-2">
														<p class="text-sm font-sans text-foreground-muted">
															{item.admin_notes || 'No notes yet'}
														</p>
													</GlassCard>
													<button
														type="button"
														onclick={() => startEditingNotes(item.id, item.admin_notes)}
														class="text-sm text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300 font-sans"
													>
														Edit notes
													</button>
												{/if}
											</div>

											<!-- Actions -->
											<div class="flex gap-2">
												{#if item.status === 'new'}
													<form method="POST" action="?/markRead" use:enhance>
														<input type="hidden" name="id" value={item.id} />
														<button
															type="submit"
															class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-sans hover:bg-blue-700 transition-colors"
														>
															Mark as Read
														</button>
													</form>
												{/if}
												{#if item.status !== 'archived'}
													<form method="POST" action="?/archive" use:enhance>
														<input type="hidden" name="id" value={item.id} />
														<button
															type="submit"
															class="px-4 py-2 bg-white dark:bg-slate-700 border border-grove-200 dark:border-slate-600 text-foreground rounded-lg text-sm font-sans hover:bg-grove-50 dark:hover:bg-slate-600 transition-colors"
														>
															Archive
														</button>
													</form>
												{/if}
											</div>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>
