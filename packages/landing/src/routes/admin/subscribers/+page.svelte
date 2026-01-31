<script lang="ts">
	import type { PageData } from './$types';

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
					<h1 class="text-xl font-serif text-bark">Email Subscribers</h1>
					<p class="text-sm text-bark/50 font-sans">
						{data.totalActive} active
						{#if data.totalUnsubscribed > 0}
							<span class="text-bark/30">· {data.totalUnsubscribed} unsubscribed</span>
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
		<!-- Danger Zone - Copy All Emails -->
		<section class="mb-8">
			<div class="bg-red-50 border-2 border-red-200 rounded-xl p-6">
				<div class="flex items-start gap-4">
					<div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 flex-shrink-0">
						<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
						</svg>
					</div>
					<div class="flex-1">
						<h2 class="text-lg font-serif text-red-900 mb-2">⚠️ Mass Email Zone</h2>
						<p class="text-sm text-red-800 font-sans mb-4">
							Use with extreme care. This copies all {data.totalActive} subscriber email{data.totalActive === 1 ? '' : 's'} at once for mass communication.
						</p>
						<div class="flex flex-wrap gap-3">
							<button
								onclick={copyAllEmails}
								class="px-4 py-2 bg-red-600 text-white font-sans text-sm rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
							>
								{#if copiedAll}
									<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
										<path
											fill-rule="evenodd"
											d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
											clip-rule="evenodd"
										/>
									</svg>
									Copied!
								{:else}
									<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
										<path
											d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
										/>
										<path
											d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
										/>
									</svg>
									Copy All Emails (comma-separated)
								{/if}
							</button>
							<button
								onclick={exportAsList}
								class="px-4 py-2 bg-white border border-red-300 text-red-700 font-sans text-sm rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
							>
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
									<path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
								</svg>
								Export as List (.txt)
							</button>
							<button
								onclick={exportAsCSV}
								class="px-4 py-2 bg-white border border-red-300 text-red-700 font-sans text-sm rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
							>
								<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
									<path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
									<path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
								</svg>
								Export as CSV
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Subscribers List -->
		<section>
			<h2 class="text-lg font-serif text-bark mb-4">All Subscribers</h2>

			{#if subscribers.length === 0}
				<div class="text-center py-12 bg-white rounded-xl border border-grove-200">
					<div class="w-16 h-16 mx-auto mb-4 text-grove-300">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
						</svg>
					</div>
					<p class="text-bark/50 font-sans">No subscribers yet</p>
				</div>
			{:else}
				<div class="bg-white rounded-xl border border-grove-200 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full" aria-label="Email subscribers">
							<thead class="bg-grove-50 border-b border-grove-200">
								<tr>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Email
									</th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Signed Up
									</th>
									<th scope="col" class="text-left px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Source
									</th>
									<th scope="col" class="text-right px-6 py-3 text-xs font-sans font-semibold text-bark/60 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-grove-100">
								{#each subscribers as subscriber}
									<tr class="hover:bg-grove-50/50 transition-colors">
										<td class="px-6 py-4">
											<span class="text-sm font-sans text-bark font-medium">{subscriber.email}</span>
										</td>
										<td class="px-6 py-4">
											<span class="text-sm font-sans text-bark/60">{formatDate(subscriber.created_at)}</span>
										</td>
										<td class="px-6 py-4">
											<span class="text-xs font-sans text-bark/50 bg-grove-100 px-2 py-1 rounded">
												{subscriber.source}
											</span>
										</td>
										<td class="px-6 py-4 text-right">
											<button
												onclick={() => copyEmail(subscriber.email)}
												class="text-xs font-sans text-grove-600 hover:text-grove-700 transition-colors flex items-center gap-1 ml-auto"
											>
												{#if copiedEmail === subscriber.email}
													<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
														<path
															fill-rule="evenodd"
															d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
															clip-rule="evenodd"
														/>
													</svg>
													Copied
												{:else}
													<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
														<path
															d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z"
														/>
														<path
															d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z"
														/>
													</svg>
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
	</main>
</div>
