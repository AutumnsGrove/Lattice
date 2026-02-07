<script lang="ts">
	import type { PageData } from './$types';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { Copy, Download, Check, AlertTriangle, AtSign } from 'lucide-svelte';

	interface Subscriber {
		id: number;
		email: string;
		created_at: string;
		confirmed_at: string | null;
		unsubscribed_at: string | null;
		source: string;
	}

	let { data }: { data: PageData } = $props();

	let subscribers = $derived(data.subscribers as Subscriber[]);
	let copiedAll = $state(false);
	let copiedEmail = $state<string | null>(null);

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function copyAllEmails() {
		const allEmails = subscribers.map((s) => s.email).join(', ');
		await navigator.clipboard.writeText(allEmails);
		copiedAll = true;
		setTimeout(() => {
			copiedAll = false;
		}, 2000);
	}

	async function copyEmail(email: string) {
		await navigator.clipboard.writeText(email);
		copiedEmail = email;
		setTimeout(() => {
			copiedEmail = null;
		}, 2000);
	}

	async function exportAsList() {
		const emailList = subscribers.map((s) => s.email).join('\n');
		const blob = new Blob([emailList], { type: 'text/plain' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `grove-subscribers-${new Date().toISOString().split('T')[0]}.txt`;
		a.click();
		URL.revokeObjectURL(url);
	}

	async function exportAsCSV() {
		const csv = [
			'Email,Signed Up,Source',
			...subscribers.map((s) => `${s.email},${s.created_at},${s.source}`)
		].join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `grove-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<svelte:head>
	<title>Email Subscribers - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Email Subscribers</h1>
	<p class="text-foreground-muted font-sans mt-1">
		{data.totalActive} active
		{#if data.totalUnsubscribed > 0}
			<span class="text-foreground/30">· {data.totalUnsubscribed} unsubscribed</span>
		{/if}
	</p>
</div>

<!-- Danger Zone - Copy All Emails -->
<section class="mb-8">
	<GlassCard class="border-red-500/30 dark:border-red-500/20 bg-red-50/30 dark:bg-red-950/20">
		<div class="flex items-start gap-4 p-6">
			<div class="w-10 h-10 bg-red-100 dark:bg-red-950/50 rounded-lg flex items-center justify-center flex-shrink-0">
				<AlertTriangle class="w-5 h-5 text-red-600 dark:text-red-400" />
			</div>
			<div class="flex-1">
				<h2 class="text-lg font-serif text-red-900 dark:text-red-200 mb-2">Mass Email Zone</h2>
				<p class="text-sm text-red-800 dark:text-red-300 font-sans mb-4">
					Use with extreme care. This copies all {data.totalActive} subscriber email{data.totalActive === 1 ? '' : 's'} at once for mass communication.
				</p>
				<div class="flex flex-wrap gap-3">
					<button
						onclick={copyAllEmails}
						class="px-4 py-2 bg-red-600 text-white font-sans text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
					>
						{#if copiedAll}
							<Check class="w-4 h-4" />
							Copied!
						{:else}
							<Copy class="w-4 h-4" />
							Copy All Emails (comma-separated)
						{/if}
					</button>
					<button
						onclick={exportAsList}
						class="px-4 py-2 bg-white dark:bg-bark-800 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-sans text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
					>
						<Download class="w-4 h-4" />
						Export as List (.txt)
					</button>
					<button
						onclick={exportAsCSV}
						class="px-4 py-2 bg-white dark:bg-bark-800 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 font-sans text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
					>
						<Download class="w-4 h-4" />
						Export as CSV
					</button>
				</div>
			</div>
		</div>
	</GlassCard>
</section>

<!-- Subscribers List -->
<section>
	<h2 class="text-lg font-serif text-foreground mb-4">All Subscribers</h2>

	{#if subscribers.length === 0}
		<GlassCard class="text-center py-12">
			<AtSign class="w-16 h-16 mx-auto mb-4 text-foreground/20" />
			<p class="text-foreground-muted font-sans">No subscribers yet</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-bark-700">
			<div class="overflow-x-auto">
				<table class="w-full" aria-label="Email subscribers">
					<thead class="bg-grove-50 dark:bg-bark-800/50 border-b border-grove-200 dark:border-bark-700">
						<tr>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Email
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Signed Up
							</th>
							<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Source
							</th>
							<th scope="col" class="text-right px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-grove-100 dark:divide-bark-700/50 bg-white dark:bg-bark-800/30">
						{#each subscribers as subscriber}
							<tr class="hover:bg-grove-50/50 dark:hover:bg-bark-700/30 transition-colors">
								<td class="px-6 py-4">
									<span class="text-sm font-sans text-foreground font-medium">{subscriber.email}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-sans text-foreground-muted">{formatDate(subscriber.created_at)}</span>
								</td>
								<td class="px-6 py-4">
									<span class="text-xs font-sans text-foreground-muted bg-grove-100 dark:bg-bark-700 px-2 py-1 rounded">
										{subscriber.source}
									</span>
								</td>
								<td class="px-6 py-4 text-right">
									<button
										onclick={() => copyEmail(subscriber.email)}
										class="text-xs font-sans text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300 transition-colors flex items-center gap-1 ml-auto"
									>
										{#if copiedEmail === subscriber.email}
											<Check class="w-3.5 h-3.5" />
											Copied
										{:else}
											<Copy class="w-3.5 h-3.5" />
											Copy
										{/if}
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</section>
