<script>
	let { data } = $props();

	let subscribers = $state(data.subscribers || []);
	let copiedAll = $state(false);
	let copiedEmail = $state(null);

	function formatDate(dateStr) {
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

	async function copyEmail(email) {
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
	<title>Email Subscribers - Admin</title>
</svelte:head>

<div class="page-header">
	<div>
		<h1>📧 Email Subscribers</h1>
		<p class="subtitle">
			{data.totalActive} active subscriber{data.totalActive === 1 ? '' : 's'}
			{#if data.totalUnsubscribed > 0}
				· {data.totalUnsubscribed} unsubscribed
			{/if}
		</p>
	</div>
</div>

<!-- Danger Zone -->
<div class="danger-zone">
	<div class="danger-header">
		<div>
			<h2>⚠️ Mass Email Zone</h2>
			<p>
				Use with extreme care. This copies all {data.totalActive} subscriber email{data.totalActive ===
				1
					? ''
					: 's'} at once for mass communication.
			</p>
		</div>
	</div>
	<div class="danger-actions">
		<button class="btn-danger" onclick={copyAllEmails}>
			{#if copiedAll}
				✓ Copied!
			{:else}
				📋 Copy All Emails (comma-separated)
			{/if}
		</button>
		<button class="btn-secondary" onclick={exportAsList}> 📥 Export as List (.txt) </button>
		<button class="btn-secondary" onclick={exportAsCSV}> 📥 Export as CSV </button>
	</div>
</div>

<!-- Subscribers Table -->
<div class="card">
	<h2>All Subscribers</h2>

	{#if subscribers.length === 0}
		<div class="empty-state">
			<div class="empty-icon">📭</div>
			<p>No subscribers yet</p>
		</div>
	{:else}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Email</th>
						<th>Signed Up</th>
						<th>Source</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each subscribers as subscriber}
						<tr>
							<td>
								<span class="email">{subscriber.email}</span>
							</td>
							<td>
								<span class="date">{formatDate(subscriber.created_at)}</span>
							</td>
							<td>
								<span class="badge">{subscriber.source}</span>
							</td>
							<td class="text-right">
								<button class="btn-copy" onclick={() => copyEmail(subscriber.email)}>
									{#if copiedEmail === subscriber.email}
										✓ Copied
									{:else}
										📋 Copy
									{/if}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 1.875rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.5rem 0;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: var(--color-text-muted);
		margin: 0;
	}

	.danger-zone {
		background: #fee;
		border: 2px solid #fcc;
		border-radius: var(--border-radius-standard);
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.danger-header h2 {
		color: #c00;
		margin-bottom: 0.5rem;
	}

	.danger-header p {
		color: #800;
		margin: 0 0 1rem 0;
	}

	.danger-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius-button);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	.btn-secondary {
		background: white;
		color: #dc2626;
		border: 1px solid #fcc;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius-button);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn-secondary:hover {
		background: #fee;
	}

	.card {
		background: var(--color-bg-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		padding: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--color-text-muted);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.table-container {
		margin-top: 1rem;
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	thead {
		border-bottom: 1px solid var(--color-border);
	}

	th {
		padding: 0.75rem;
		text-align: left;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	th.text-right {
		text-align: right;
	}

	tbody tr {
		border-bottom: 1px solid var(--color-border);
		transition: background 0.2s;
	}

	tbody tr:hover {
		background: var(--color-bg-secondary);
	}

	td {
		padding: 1rem 0.75rem;
	}

	td.text-right {
		text-align: right;
	}

	.email {
		font-weight: 500;
		color: var(--color-text);
	}

	.date {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.badge {
		display: inline-block;
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
	}

	.btn-copy {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		transition: color 0.2s;
	}

	.btn-copy:hover {
		color: var(--color-primary-hover);
	}

	@media (max-width: 768px) {
		.danger-actions {
			flex-direction: column;
		}

		.btn-danger,
		.btn-secondary {
			width: 100%;
		}
	}
</style>
