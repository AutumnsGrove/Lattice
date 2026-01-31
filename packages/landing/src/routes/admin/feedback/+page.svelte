<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

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

	function getSentimentEmoji(sentiment: string | null): string {
		if (sentiment === 'positive') return '😊';
		if (sentiment === 'negative') return '😟';
		if (sentiment === 'neutral') return '😐';
		return '';
	}

	function getSentimentLabel(sentiment: string | null): string {
		if (sentiment === 'positive') return 'Positive';
		if (sentiment === 'negative') return 'Concern';
		if (sentiment === 'neutral') return 'Neutral';
		return 'None';
	}

	function getSourceIcon(source: string): string {
		return source === 'email' ? '✉️' : '🌐';
	}

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

<div class="min-h-screen bg-cream">
	<!-- Header -->
	<header class="bg-white border-b border-grove-200 px-6 py-4">
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<div class="flex items-center gap-4">
				<a href="/" class="text-grove-600 hover:text-grove-700 transition-colors" aria-label="Go to home">
					<svg class="w-8 h-8" viewBox="0 0 100 100" fill="none">
						<path
							d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z"
							fill="currentColor"
							fill-opacity="0.3"
						/>
						<path
							d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z"
							fill="currentColor"
						/>
						<path d="M50 70V85" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
					</svg>
				</a>
				<div>
					<h1 class="text-xl font-serif text-bark">Wanderer Feedback</h1>
					<p class="text-sm text-bark/50 font-sans">
						{stats.total} total
						{#if stats.new_count > 0}
							<span class="text-grove-600">· {stats.new_count} new</span>
						{/if}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-bark/60 font-sans">{data.user.email}</span>
				<a
					href="/admin"
					class="text-sm text-grove-600 hover:text-grove-700 font-sans transition-colors"
				>
					Dashboard
				</a>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-6 py-8">
		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
			<div class="bg-white border border-grove-200 rounded-xl p-4">
				<div class="text-2xl font-serif text-bark">{stats.total}</div>
				<div class="text-sm text-bark/60 font-sans">Total Feedback</div>
			</div>
			<div class="bg-green-50 border border-green-200 rounded-xl p-4">
				<div class="text-2xl font-serif text-green-700">{stats.new_count}</div>
				<div class="text-sm text-green-700/80 font-sans">New</div>
			</div>
			<div class="bg-white border border-grove-200 rounded-xl p-4">
				<div class="text-2xl font-serif text-bark">{stats.web_count}</div>
				<div class="text-sm text-bark/60 font-sans">Web Form</div>
			</div>
			<div class="bg-white border border-grove-200 rounded-xl p-4">
				<div class="text-2xl font-serif text-bark">{stats.email_count}</div>
				<div class="text-sm text-bark/60 font-sans">Email</div>
			</div>
		</div>

		<!-- Feedback List -->
		<section>
			{#if feedback.length === 0}
				<div class="text-center py-12 bg-white rounded-xl border border-grove-200">
					<div class="w-16 h-16 mx-auto mb-4 text-grove-300">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
						</svg>
					</div>
					<p class="text-bark/50 font-sans">No feedback yet</p>
				</div>
			{:else}
				<div class="bg-white rounded-xl border border-grove-200 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full" aria-label="Wanderer feedback">
							<thead class="bg-grove-50 border-b border-grove-200">
								<tr>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider w-12"><span class="sr-only">Source</span></th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										From
									</th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Message
									</th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Date
									</th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Status
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grove-100">
								{#each feedback as item}
									<tr
										class="hover:bg-grove-50/50 transition-colors cursor-pointer"
										tabindex="0"
										role="button"
										aria-expanded={expandedId === item.id}
										aria-controls="details-{item.id}"
										onclick={() => toggleExpand(item.id)}
										onkeydown={(e) => handleRowKeydown(e, item.id)}
									>
										<td class="px-6 py-4 text-center">
											<span class="text-lg" title={item.source === 'email' ? 'Email' : 'Web form'}>
												{getSourceIcon(item.source)}
											</span>
										</td>
										<td class="px-6 py-4">
											<div class="flex items-center gap-2">
												{#if item.sentiment}
													<span class="text-lg">{getSentimentEmoji(item.sentiment)}</span>
												{/if}
												<div>
													<div class="text-sm font-sans text-bark font-medium">
														{item.name || 'Anonymous Wanderer'}
													</div>
													{#if item.email}
														<div class="text-xs font-sans text-bark/50">{item.email}</div>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-6 py-4">
											<div class="text-sm font-sans text-bark">
												{#if item.subject}
													<div class="font-medium mb-1">{item.subject}</div>
												{/if}
												<div class="text-bark/70 line-clamp-2">
													{item.message.substring(0, 100)}{item.message.length > 100 ? '...' : ''}
												</div>
											</div>
										</td>
										<td class="px-6 py-4">
											<span class="text-sm font-sans text-bark/60">{formatRelativeDate(item.created_at)}</span>
										</td>
										<td class="px-6 py-4">
											{#if item.status === 'new'}
												<span class="text-xs font-sans bg-green-100 text-green-700 px-2 py-1 rounded">New</span>
											{:else if item.status === 'read'}
												<span class="text-xs font-sans bg-blue-100 text-blue-700 px-2 py-1 rounded">Read</span>
											{:else}
												<span class="text-xs font-sans bg-gray-100 text-gray-700 px-2 py-1 rounded">Archived</span>
											{/if}
										</td>
									</tr>
									{#if expandedId === item.id}
										<tr id="details-{item.id}" class="bg-grove-50/30">
											<td colspan="5" class="px-6 py-6">
												<div class="max-w-3xl">
													<!-- Full Details -->
													<div class="mb-4 space-y-2 text-sm font-sans">
														<div><strong>From:</strong> {item.name || 'Anonymous Wanderer'} {#if item.email}({item.email}){/if}</div>
														<div><strong>Source:</strong> {item.source === 'email' ? 'Email' : 'Web form'}</div>
														{#if item.subject}
															<div><strong>Subject:</strong> {item.subject}</div>
														{/if}
														{#if item.sentiment}
															<div><strong>Sentiment:</strong> {getSentimentEmoji(item.sentiment)} {getSentimentLabel(item.sentiment)}</div>
														{/if}
														<div><strong>Submitted:</strong> {formatDate(item.created_at)}</div>
													</div>

													<!-- Full Message -->
													<div class="bg-white border border-grove-200 rounded-lg p-4 mb-4">
														<p class="text-sm font-sans text-bark whitespace-pre-wrap">{item.message}</p>
													</div>

													<!-- Admin Notes -->
													<div class="mb-4">
														<label class="block text-sm font-sans font-medium text-bark mb-2">Admin Notes</label>
														{#if editingNotesId === item.id}
															<form method="POST" action="?/saveNotes" use:enhance>
																<input type="hidden" name="id" value={item.id} />
																<textarea
																	name="notes"
																	bind:value={notesText[item.id]}
																	rows="3"
																	class="w-full px-3 py-2 border border-grove-200 rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-grove-500"
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
																		class="px-4 py-2 bg-white border border-grove-200 text-bark rounded-lg text-sm font-sans hover:bg-grove-50 transition-colors"
																	>
																		Cancel
																	</button>
																</div>
															</form>
														{:else}
															<div class="bg-white border border-grove-200 rounded-lg p-3 text-sm font-sans text-bark/70 mb-2">
																{item.admin_notes || 'No notes yet'}
															</div>
															<button
																type="button"
																onclick={() => startEditingNotes(item.id, item.admin_notes)}
																class="text-sm text-grove-600 hover:text-grove-700 font-sans"
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
																	class="px-4 py-2 bg-white border border-grove-200 text-bark rounded-lg text-sm font-sans hover:bg-grove-50 transition-colors"
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
	</main>
</div>
