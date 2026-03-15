<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import {
		TenantGreenhouseSection,
		TenantUploadSection,
		TenantGraftSection
	} from '@autumnsgrove/lattice/grafts/greenhouse';
	import { navIcons, featureIcons, actionIcons, stateIcons } from '@autumnsgrove/prism/icons';
	const ArrowLeft = navIcons.arrowLeft;
	const Globe = navIcons.globe;
	const FileText = featureIcons.fileText;
	const BookOpen = featureIcons.bookOpen;
	const Image = featureIcons.image;
	const HardDrive = featureIcons.hardDrive;
	const Copy = actionIcons.copy;
	const Check = stateIcons.check;
	const AlertTriangle = stateIcons.warning;
	const ExternalLink = navIcons.external;
	const CheckCircle = stateIcons.checkCircle;
	const XCircle = stateIcons.xCircle;
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let copiedCommand = $state<string | null>(null);

	// ── Hidden form refs ──────────────────────────────────────────────
	let enrollFormRef = $state<HTMLFormElement | null>(null);
	let unenrollFormRef = $state<HTMLFormElement | null>(null);
	let toggleGreenhouseFormRef = $state<HTMLFormElement | null>(null);
	let updateNotesFormRef = $state<HTMLFormElement | null>(null);
	let toggleUploadFormRef = $state<HTMLFormElement | null>(null);
	let toggleGraftFormRef = $state<HTMLFormElement | null>(null);
	let resetGraftsFormRef = $state<HTMLFormElement | null>(null);

	// ── Hidden input values ───────────────────────────────────────────
	let enrollNotes = $state('');
	let toggleGreenhouseEnabled = $state('');
	let updateNotesValue = $state('');
	let toggleUploadSuspended = $state('');
	let toggleGraftFlagId = $state('');
	let toggleGraftEnabled = $state('');

	// ── Loading states ────────────────────────────────────────────────
	let greenhouseLoading = $state(false);
	let uploadLoading = $state(false);
	let loadingGraftId = $state<string | undefined>(undefined);
	let resettingGrafts = $state(false);

	// ── Plan and storage config ───────────────────────────────────────
	const planConfig: Record<string, { label: string; color: string; bg: string }> = {
		seedling: {
			label: 'Seedling',
			color: 'text-success text-success-foreground',
			bg: 'bg-success-bg'
		},
		sapling: {
			label: 'Sapling',
			color: 'text-accent text-accent-foreground',
			bg: 'bg-accent-subtle'
		},
		oak: {
			label: 'Oak',
			color: 'text-warning text-warning-foreground',
			bg: 'bg-warning-bg'
		},
		evergreen: {
			label: 'Evergreen',
			color: 'text-success text-success-foreground',
			bg: 'bg-success-bg'
		}
	};

	const storageLimits: Record<string, number> = {
		seedling: 1 * 1024 * 1024 * 1024,
		sapling: 5 * 1024 * 1024 * 1024,
		oak: 20 * 1024 * 1024 * 1024,
		evergreen: 100 * 1024 * 1024 * 1024
	};

	function formatStorage(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function storagePercent(used: number, plan: string): number {
		const limit = storageLimits[plan] || storageLimits.seedling;
		return Math.min(100, Math.round((used / limit) * 100));
	}

	async function copyCommand(command: string, label: string) {
		try {
			await navigator.clipboard.writeText(command);
			copiedCommand = label;
			setTimeout(() => {
				copiedCommand = null;
			}, 2000);
		} catch {
			// Clipboard may not be available
		}
	}

	// ── Derived values ────────────────────────────────────────────────
	let plan = $derived(planConfig[data.tenant.plan] || planConfig.seedling);
	let storageLimit = $derived(storageLimits[data.tenant.plan] || storageLimits.seedling);
	let storagePct = $derived(storagePercent(data.tenant.storage_used, data.tenant.plan));

	// ── Admin control handlers ────────────────────────────────────────
	function handleEnroll(notes: string) {
		greenhouseLoading = true;
		enrollNotes = notes;
		requestAnimationFrame(() => enrollFormRef?.requestSubmit());
	}

	function handleUnenroll() {
		greenhouseLoading = true;
		requestAnimationFrame(() => unenrollFormRef?.requestSubmit());
	}

	function handleToggleGreenhouse(enabled: boolean) {
		greenhouseLoading = true;
		toggleGreenhouseEnabled = enabled.toString();
		requestAnimationFrame(() => toggleGreenhouseFormRef?.requestSubmit());
	}

	function handleUpdateNotes(notes: string) {
		greenhouseLoading = true;
		updateNotesValue = notes;
		requestAnimationFrame(() => updateNotesFormRef?.requestSubmit());
	}

	function handleToggleUpload(suspended: boolean) {
		uploadLoading = true;
		toggleUploadSuspended = suspended.toString();
		requestAnimationFrame(() => toggleUploadFormRef?.requestSubmit());
	}

	function handleToggleGraft(graftId: string, enabled: boolean) {
		loadingGraftId = graftId;
		toggleGraftFlagId = graftId;
		toggleGraftEnabled = enabled.toString();
		requestAnimationFrame(() => toggleGraftFormRef?.requestSubmit());
	}

	function handleResetGrafts() {
		resettingGrafts = true;
		requestAnimationFrame(() => resetGraftsFormRef?.requestSubmit());
	}

	function enhanceCallback() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			greenhouseLoading = false;
			uploadLoading = false;
			loadingGraftId = undefined;
			resettingGrafts = false;
			await invalidateAll();
		};
	}
</script>

<svelte:head>
	<title>{data.tenant.subdomain} - Grove Admin</title>
</svelte:head>

<!-- Hidden forms with progressive enhancement -->
<form
	bind:this={enrollFormRef}
	method="POST"
	action="?/enroll"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="notes" value={enrollNotes} />
</form>

<form
	bind:this={unenrollFormRef}
	method="POST"
	action="?/unenroll"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
</form>

<form
	bind:this={toggleGreenhouseFormRef}
	method="POST"
	action="?/toggleGreenhouse"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="enabled" value={toggleGreenhouseEnabled} />
</form>

<form
	bind:this={updateNotesFormRef}
	method="POST"
	action="?/updateNotes"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="notes" value={updateNotesValue} />
</form>

<form
	bind:this={toggleUploadFormRef}
	method="POST"
	action="?/toggleUploadSuspension"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="suspended" value={toggleUploadSuspended} />
</form>

<form
	bind:this={toggleGraftFormRef}
	method="POST"
	action="?/toggleGraft"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={toggleGraftFlagId} />
	<input type="hidden" name="enabled" value={toggleGraftEnabled} />
</form>

<form
	bind:this={resetGraftsFormRef}
	method="POST"
	action="?/resetGrafts"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
</form>

<div class="mb-8">
	<a
		href="/arbor/tenants"
		class="inline-flex items-center gap-1 text-sm font-sans text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400 transition-colors mb-4"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Tenants
	</a>

	<!-- Tenant Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-serif text-foreground">{data.tenant.display_name}</h1>
			<div class="flex items-center gap-3 mt-2">
				<a
					href="https://{data.tenant.subdomain}.grove.place"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1 text-sm font-sans text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300"
				>
					{data.tenant.subdomain}.grove.place
					<ExternalLink class="w-3 h-3" />
				</a>
				<span class="text-xs font-sans px-2 py-1 rounded {plan.bg} {plan.color}">
					{plan.label}
				</span>
				{#if data.tenant.active}
					<span
						class="text-xs font-sans bg-success-bg text-success-foreground px-2 py-1 rounded"
					>
						Active
					</span>
				{:else}
					<span
						class="text-xs font-sans bg-error-bg text-error-foreground px-2 py-1 rounded"
					>
						Suspended
					</span>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Info Card -->
<GlassCard class="mb-6 p-6">
	<div class="grid grid-cols-2 gap-4 text-sm font-sans">
		<div>
			<div class="text-foreground-muted mb-1">Email</div>
			<div class="text-foreground">{data.tenant.email}</div>
		</div>
		<div>
			<div class="text-foreground-muted mb-1">Created</div>
			<div class="text-foreground">{formatDate(data.tenant.created_at)}</div>
		</div>
		<div>
			<div class="text-foreground-muted mb-1">Theme</div>
			<div class="text-foreground">{data.tenant.theme}</div>
		</div>
		{#if data.tenant.custom_domain}
			<div>
				<div class="text-foreground-muted mb-1">Custom Domain</div>
				<div class="flex items-center gap-1 text-foreground">
					<Globe class="w-4 h-4 text-foreground-muted" />
					{data.tenant.custom_domain}
				</div>
			</div>
		{/if}
	</div>
</GlassCard>

<!-- Stats Grid -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
	<GlassCard class="p-4 text-center">
		<FileText class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{data.postCount}</div>
		<div class="text-sm text-foreground-muted font-sans">Posts</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<BookOpen class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{data.pageCount}</div>
		<div class="text-sm text-foreground-muted font-sans">Pages</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<Image class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{data.mediaCount}</div>
		<div class="text-sm text-foreground-muted font-sans">Media</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<HardDrive class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">
			{formatStorage(data.tenant.storage_used)}
		</div>
		<div class="text-sm text-foreground-muted font-sans">
			of {formatStorage(storageLimit)}
		</div>
	</GlassCard>
</div>

<!-- Storage Bar -->
<GlassCard class="mb-8 p-4">
	<div class="flex items-center justify-between mb-2">
		<span class="text-sm font-sans font-medium text-foreground">Storage Usage</span>
		<span class="text-sm font-sans text-foreground-muted">{storagePct}%</span>
	</div>
	<div class="w-full h-2 bg-surface-subtle rounded-full overflow-hidden">
		<div
			role="progressbar"
			aria-valuenow={storagePct}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Storage usage"
			class="h-full rounded-full transition-all {storagePct > 90
				? 'bg-error'
				: storagePct > 70
					? 'bg-warning'
					: 'bg-grove-500'}"
			style="width: {storagePct}%"
		></div>
	</div>
</GlassCard>

<!-- Admin Controls -->
<h2 class="text-xl font-serif text-foreground mb-4">Admin Controls</h2>

{#if form?.success || form?.error}
	<GlassCard class="mb-4 p-4">
		<div class="flex items-center gap-2 text-sm font-sans">
			{#if form?.success}
				<CheckCircle class="w-4 h-4 text-success shrink-0" />
				<span class="text-foreground">{form.message || 'Action completed'}</span>
			{:else}
				<XCircle class="w-4 h-4 text-error shrink-0" />
				<span class="text-error">{form.error}</span>
			{/if}
		</div>
	</GlassCard>
{/if}

<div class="space-y-4 mb-8">
	<TenantGreenhouseSection
		greenhouse={data.greenhouse}
		onEnroll={handleEnroll}
		onUnenroll={handleUnenroll}
		onToggle={handleToggleGreenhouse}
		onUpdateNotes={handleUpdateNotes}
		loading={greenhouseLoading}
	/>

	<TenantUploadSection
		suspended={data.uploadSuspended}
		onToggle={handleToggleUpload}
		loading={uploadLoading}
	/>

	{#if data.greenhouse}
		<TenantGraftSection
			grafts={data.tenantGrafts}
			onToggle={handleToggleGraft}
			onReset={handleResetGrafts}
			{loadingGraftId}
			resetting={resettingGrafts}
		/>
	{/if}
</div>

<!-- Danger Zone -->
<GlassCard class="p-6 border-error">
	<div class="flex items-center gap-2 mb-4">
		<AlertTriangle class="w-5 h-5 text-error" />
		<h2 class="text-lg font-serif text-error">Danger Zone</h2>
	</div>
	<p class="text-sm font-sans text-foreground-muted mb-4">
		These commands must be run locally via the CLI. They cannot be executed from this panel.
	</p>

	<div class="space-y-4">
		<!-- Suspend Command -->
		<div class="flex items-center justify-between gap-4 p-3 rounded-lg bg-error-bg">
			<div>
				<div class="text-sm font-sans font-medium text-foreground">Suspend Tenant</div>
				<code class="text-xs font-mono text-foreground-muted">
					gw db query --write "UPDATE tenants SET active = 0 WHERE subdomain = '{data.tenant.subdomain}'"
				</code>
			</div>
			<button
				type="button"
				onclick={() =>
					copyCommand(
						`gw db query --write "UPDATE tenants SET active = 0 WHERE subdomain = '${data.tenant.subdomain}'"`,
						'suspend'
					)}
				class="shrink-0 p-2 rounded-lg hover:bg-error hover:bg-opacity-20 transition-colors"
				aria-label={copiedCommand === 'suspend' ? 'Copied!' : 'Copy suspend command'}
			>
				{#if copiedCommand === 'suspend'}
					<Check class="w-4 h-4 text-success" />
				{:else}
					<Copy class="w-4 h-4 text-error" />
				{/if}
			</button>
		</div>

		<!-- Reactivate Command -->
		{#if !data.tenant.active}
			<div class="flex items-center justify-between gap-4 p-3 rounded-lg bg-success-bg">
				<div>
					<div class="text-sm font-sans font-medium text-foreground">Reactivate Tenant</div>
					<code class="text-xs font-mono text-foreground-muted">
						gw db query --write "UPDATE tenants SET active = 1 WHERE subdomain = '{data.tenant.subdomain}'"
					</code>
				</div>
				<button
					type="button"
					onclick={() =>
						copyCommand(
							`gw db query --write "UPDATE tenants SET active = 1 WHERE subdomain = '${data.tenant.subdomain}'"`,
							'reactivate'
						)}
					class="shrink-0 p-2 rounded-lg hover:bg-success hover:bg-opacity-20 transition-colors"
					aria-label={copiedCommand === 'reactivate' ? 'Copied!' : 'Copy reactivate command'}
				>
					{#if copiedCommand === 'reactivate'}
						<Check class="w-4 h-4 text-success" />
					{:else}
						<Copy class="w-4 h-4 text-success" />
					{/if}
				</button>
			</div>
		{/if}

		<!-- Delete Command -->
		<div class="flex items-center justify-between gap-4 p-3 rounded-lg bg-error-bg">
			<div>
				<div class="text-sm font-sans font-medium text-error">
					Delete Tenant
				</div>
				<code class="text-xs font-mono text-foreground-muted">
					gw tenant delete {data.tenant.subdomain} --write
				</code>
			</div>
			<button
				type="button"
				onclick={() =>
					copyCommand(`gw tenant delete ${data.tenant.subdomain} --write`, 'delete')}
				class="shrink-0 p-2 rounded-lg hover:bg-error hover:bg-opacity-20 transition-colors"
				aria-label={copiedCommand === 'delete' ? 'Copied!' : 'Copy delete command'}
			>
				{#if copiedCommand === 'delete'}
					<Check class="w-4 h-4 text-success" />
				{:else}
					<Copy class="w-4 h-4 text-error" />
				{/if}
			</button>
		</div>
	</div>
</GlassCard>
