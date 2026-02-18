<script lang="ts">
	import { GlassCard, Button, Spinner } from "$lib/ui";
	import { toast } from "$lib/ui/components/ui/toast";
	import { api } from "$lib/utils";
	import {
		Download,
		Mail,
		Package,
		Clock,
		AlertTriangle,
		CheckCircle,
		Archive,
		XCircle,
	} from "lucide-svelte";

	let { data } = $props();

	// Form state
	let includeImages = $state(true);
	let deliveryMethod = $state<"email" | "download">("email");
	let starting = $state(false);
	let cancelling = $state(false);

	// Active export tracking
	// svelte-ignore state_referenced_locally
	let activeExportId = $state<string | null>(data.activeExport?.id ?? null);
	// svelte-ignore state_referenced_locally
	let activeStatus = $state(data.activeExport?.status ?? null);
	// svelte-ignore state_referenced_locally
	let activeProgress = $state(data.activeExport?.progress ?? 0);
	let pollTimer = $state<ReturnType<typeof setInterval> | null>(null);

	// Size estimate (rough: ~2KB per post/page, actual size for images)
	let estimatedSize = $derived(() => {
		const textSize = (data.counts.posts + data.counts.pages) * 2048;
		const imageSize = includeImages ? data.estimatedImageSize : 0;
		return textSize + imageSize;
	});

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
	}

	function formatDate(dateValue: string | number): string {
		const date = typeof dateValue === "string" ? new Date(dateValue) : new Date(dateValue * 1000);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	}

	// Phase-friendly labels
	function getPhaseLabel(status: string): string {
		switch (status) {
			case "pending":
				return "Preparing...";
			case "querying":
				return "Gathering your blooms...";
			case "assembling":
				return "Bundling everything together...";
			case "uploading":
				return "Almost there...";
			case "notifying":
				return "Sending you a heads up...";
			case "complete":
				return "Done!";
			case "failed":
				return "Something went wrong";
			default:
				return "Working...";
		}
	}

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case "complete":
				return "badge-success";
			case "expired":
				return "badge-muted";
			case "failed":
				return "badge-error";
			default:
				return "badge-active";
		}
	}

	async function startExport() {
		starting = true;
		try {
			const result = await api.post<{ exportId: string; status: string }>("/api/export/start", {
				includeImages,
				deliveryMethod,
			});

			if (!result) {
				toast.error("Failed to start export. Please try again.");
				return;
			}

			activeExportId = result.exportId;
			activeStatus = "pending";
			activeProgress = 0;
			startPolling();

			toast.success(
				"Export started! " +
					(deliveryMethod === "email"
						? "We'll email you when it's ready."
						: "Hang tight while we bundle your data."),
			);
		} catch (err: any) {
			const message = err?.userMessage || err?.message || "Failed to start export";
			toast.error(message);
		} finally {
			starting = false;
		}
	}

	async function cancelExport() {
		if (!activeExportId) return;
		cancelling = true;
		try {
			await api.post(`/api/export/${activeExportId}/cancel`, {});
			stopPolling();
			activeStatus = "failed";
			activeProgress = 0;
			toast.success("Export cancelled.");
		} catch (err: any) {
			const message = err?.userMessage || err?.message || "Failed to cancel export";
			toast.error(message);
		} finally {
			cancelling = false;
		}
	}

	function startPolling() {
		stopPolling();
		// Smart polling: fast initially (2s), then back off to 8s after 30s
		let pollCount = 0;
		const poll = async () => {
			await pollStatus();
			pollCount++;
			if (pollCount > 15) {
				// After ~30s of polling, slow down to reduce load
				clearInterval(pollTimer!);
				pollTimer = setInterval(pollStatus, 8000);
			}
		};
		pollTimer = setInterval(poll, 2000);
	}

	function stopPolling() {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	async function pollStatus() {
		if (!activeExportId) {
			stopPolling();
			return;
		}

		try {
			const result = await api.get<{
				id: string;
				status: string;
				progress: number;
				error: string | null;
				fileSize: number | null;
				itemCounts: { posts: number; pages: number; images: number } | null;
			}>(`/api/export/${activeExportId}/status`);

			if (!result) return;

			activeStatus = result.status;
			activeProgress = result.progress;

			if (result.status === "complete") {
				stopPolling();
				if (deliveryMethod === "email") {
					toast.success("Your export is ready! Check your email for the download link.");
				} else {
					toast.success("Your export is ready to download!");
				}
			} else if (result.status === "failed") {
				stopPolling();
				toast.error(result.error || "Export failed. Please try again.");
			}
		} catch {
			// Silently retry on next poll
		}
	}

	// Resume polling if we loaded with an active export
	$effect(() => {
		if (data.activeExport && !pollTimer) {
			activeExportId = data.activeExport.id;
			activeStatus = data.activeExport.status;
			activeProgress = data.activeExport.progress;
			startPolling();
		}

		return () => stopPolling();
	});

	let hasActiveExport = $derived(
		activeExportId && activeStatus && !["complete", "failed", "expired"].includes(activeStatus),
	);
</script>

<svelte:head>
	<title>Export Your Data - Grove</title>
</svelte:head>

<div class="export-page">
	<header class="page-header">
		<h1><Archive class="header-icon" aria-hidden="true" /> Your Data, Your Way Out</h1>
		<p class="page-description">
			You own your content. Download everything — posts, pages, and images — as a tidy zip file with
			standard Markdown files you can take anywhere. Data portability means you're never locked in.
		</p>
	</header>

	<!-- Section 1: Export Form -->
	<GlassCard variant="default" class="mb-6">
		<h2>New Export</h2>

		<div class="export-options">
			<!-- Include Images Toggle -->
			<label class="toggle-option">
				<input
					id="include-images"
					type="checkbox"
					bind:checked={includeImages}
					disabled={!!hasActiveExport}
				/>
				<div class="toggle-info">
					<span class="toggle-label">Include images</span>
					<span class="toggle-desc">
						Download your uploaded images alongside your posts
						{#if data.counts.media > 0}
							({data.counts.media} files, ~{formatBytes(data.estimatedImageSize)})
						{/if}
					</span>
				</div>
			</label>

			<!-- Delivery Method -->
			<fieldset class="delivery-options">
				<legend class="sr-only">Delivery method</legend>

				<label class="delivery-option">
					<input
						type="radio"
						name="deliveryMethod"
						value="email"
						bind:group={deliveryMethod}
						disabled={!!hasActiveExport}
					/>
					<Mail class="delivery-icon" aria-hidden="true" />
					<div class="delivery-info">
						<span class="delivery-name">Email me a link</span>
						<span class="delivery-desc">We'll email you when it's ready</span>
					</div>
				</label>

				<label class="delivery-option">
					<input
						type="radio"
						name="deliveryMethod"
						value="download"
						bind:group={deliveryMethod}
						disabled={!!hasActiveExport}
					/>
					<Download class="delivery-icon" aria-hidden="true" />
					<div class="delivery-info">
						<span class="delivery-name">Download in browser</span>
						<span class="delivery-desc">Wait here and download when done</span>
					</div>
				</label>
			</fieldset>
		</div>

		<!-- Size Estimate -->
		<p class="size-estimate">
			<Package class="estimate-icon" aria-hidden="true" />
			Estimated export: {data.counts.posts} posts, {data.counts.pages} pages{#if includeImages}, {data
					.counts.media} images{/if}
			(~{formatBytes(estimatedSize())})
		</p>

		<Button
			variant="primary"
			onclick={startExport}
			disabled={starting || !!hasActiveExport}
			aria-busy={starting}
		>
			{#if starting}
				<Spinner size="sm" />
				Starting export...
			{:else if hasActiveExport}
				Export in progress...
			{:else}
				<Download class="btn-icon" aria-hidden="true" />
				Start Export
			{/if}
		</Button>
	</GlassCard>

	<!-- Section 2: Active Export Progress -->
	{#if hasActiveExport}
		<GlassCard variant="default" class="mb-6">
			<h2>Export in Progress</h2>

			<div class="progress-section" aria-live="polite" aria-atomic="true">
				<p class="phase-label">{getPhaseLabel(activeStatus ?? "")}</p>

				<div
					class="progress-bar-container"
					role="progressbar"
					aria-valuenow={activeProgress}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Export progress"
				>
					<div class="progress-bar-fill" style="width: {activeProgress}%"></div>
				</div>

				<p class="progress-percent">{activeProgress}%</p>
			</div>

			{#if deliveryMethod === "email"}
				<p class="progress-note">
					Feel free to close this page — we'll email you when your export is ready.
				</p>
			{:else}
				<p class="progress-note">Hang tight! Your download will be ready in a moment.</p>
			{/if}

			<Button variant="secondary" onclick={cancelExport} disabled={cancelling} class="cancel-btn">
				{#if cancelling}
					<Spinner size="sm" />
					Cancelling...
				{:else}
					<XCircle class="btn-icon" aria-hidden="true" />
					Cancel Export
				{/if}
			</Button>
		</GlassCard>
	{/if}

	<!-- Section 2b: Completed export — download prompt -->
	{#if activeExportId && activeStatus === "complete" && deliveryMethod === "download"}
		<GlassCard variant="default" class="mb-6">
			<h2><CheckCircle class="header-icon success-icon" aria-hidden="true" /> Export Ready!</h2>
			<p class="section-desc">Your export is bundled and ready to download.</p>
			<Button
				variant="primary"
				onclick={() => {
					window.location.href = `/api/export/${activeExportId}/download`;
				}}
			>
				<Download class="btn-icon" aria-hidden="true" />
				Download Zip
			</Button>
		</GlassCard>
	{/if}

	<!-- Section 2c: Failed export -->
	{#if activeExportId && activeStatus === "failed"}
		<GlassCard variant="default" class="mb-6">
			<div class="error-banner" role="alert">
				<AlertTriangle class="error-icon" aria-hidden="true" />
				<div>
					<strong>Export failed</strong>
					<p>
						Something went wrong while preparing your export. Please try again — if the issue
						persists, reach out to support.
					</p>
				</div>
			</div>
		</GlassCard>
	{/if}

	<!-- Section 3: Past Exports -->
	{#if data.pastExports.length > 0}
		<GlassCard variant="default">
			<h2><Clock class="header-icon" aria-hidden="true" /> Past Exports</h2>

			<div class="exports-list">
				{#each data.pastExports as exp (exp.id)}
					<div class="export-row">
						<div class="export-meta">
							<span class="export-date">{formatDate(exp.createdAt)}</span>
							<span class="export-badge {getStatusBadgeClass(exp.status)}">
								{exp.status}
							</span>
							{#if exp.fileSize}
								<span class="export-size">{formatBytes(exp.fileSize)}</span>
							{/if}
							{#if exp.itemCounts}
								<span class="export-counts">
									{exp.itemCounts.posts} posts, {exp.itemCounts.pages} pages{#if exp.includeImages}, {exp
											.itemCounts.images} images{/if}
								</span>
							{/if}
						</div>
						<div class="export-actions">
							{#if exp.status === "complete"}
								<Button
									variant="secondary"
									size="sm"
									onclick={() => {
										window.location.href = `/api/export/${exp.id}/download`;
									}}
								>
									<Download class="btn-icon-sm" aria-hidden="true" />
									Download
								</Button>
							{:else if exp.status === "expired"}
								<span class="expired-label">Expired</span>
							{:else if exp.status === "failed"}
								<span class="failed-label">
									<XCircle class="failed-icon" aria-hidden="true" />
									Failed
								</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</GlassCard>
	{/if}
</div>

<style>
	.export-page {
		max-width: 720px;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.page-header h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
	}

	:global(.header-icon) {
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-primary);
	}

	.page-description {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	/* Export Options */
	.export-options {
		margin-bottom: 1.25rem;
	}

	.toggle-option {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem 0;
		cursor: pointer;
	}

	.toggle-option input[type="checkbox"] {
		width: 20px;
		height: 20px;
		margin-top: 2px;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	.toggle-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.toggle-label {
		font-weight: 500;
		color: var(--color-text);
	}

	.toggle-desc {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	/* Delivery Options */
	.delivery-options {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
		border: none;
		padding: 0;
	}

	.delivery-option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.delivery-option:hover {
		border-color: var(--color-primary);
	}

	.delivery-option:has(input:checked) {
		border-color: var(--color-primary);
		background: rgba(44, 95, 45, 0.05);
	}

	.delivery-option input[type="radio"] {
		display: none;
	}

	:global(.delivery-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.delivery-option:has(input:checked) :global(.delivery-icon) {
		color: var(--color-primary);
	}

	.delivery-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.delivery-name {
		font-weight: 500;
		font-size: 0.9rem;
		color: var(--color-text);
	}

	.delivery-desc {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	/* Size Estimate */
	.size-estimate {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 1.25rem 0;
		padding: 0.75rem 1rem;
		background: rgba(44, 95, 45, 0.05);
		border-radius: var(--border-radius-small);
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	:global(.estimate-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	/* Progress Section */
	.progress-section {
		margin-bottom: 1rem;
	}

	.phase-label {
		margin: 0 0 0.5rem 0;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background: var(--grove-overlay-12);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: 4px;
		transition: width 0.5s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.progress-bar-fill {
			transition: none;
		}
	}

	.progress-percent {
		margin: 0.25rem 0 0 0;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		text-align: right;
	}

	.progress-note {
		margin: 0 0 1rem 0;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.section-desc {
		margin: 0 0 1rem 0;
		color: var(--color-text-muted);
	}

	:global(.success-icon) {
		color: var(--color-primary) !important;
	}

	/* Error Banner */
	.error-banner {
		display: flex;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--border-radius-standard);
		color: var(--color-text);
	}

	:global(.error-icon) {
		flex-shrink: 0;
		width: 1.25rem;
		height: 1.25rem;
		color: #dc2626;
	}

	.error-banner strong {
		display: block;
		margin-bottom: 0.25rem;
		color: #dc2626;
	}

	.error-banner p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	/* Past Exports */
	.exports-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.export-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		gap: 1rem;
	}

	.export-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		min-width: 0;
	}

	.export-date {
		font-size: 0.85rem;
		color: var(--color-text);
		font-weight: 500;
	}

	.export-badge {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.badge-success {
		background: rgba(34, 197, 94, 0.15);
		color: #16a34a;
		border: 1px solid rgba(34, 197, 94, 0.3);
		font-weight: 600;
	}

	:global(.dark) .badge-success {
		background: rgba(34, 197, 94, 0.2);
		color: #4ade80;
		border: 1px solid rgba(34, 197, 94, 0.5);
	}

	.badge-muted {
		background: var(--grove-overlay-12);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
	}

	.badge-error {
		background: rgba(239, 68, 68, 0.15);
		color: #dc2626;
		border: 1px solid rgba(239, 68, 68, 0.3);
		font-weight: 600;
	}

	:global(.dark) .badge-error {
		background: rgba(239, 68, 68, 0.2);
		color: #f87171;
		border: 1px solid rgba(239, 68, 68, 0.5);
	}

	.badge-active {
		background: rgba(59, 130, 246, 0.15);
		color: #2563eb;
		border: 1px solid rgba(59, 130, 246, 0.3);
		font-weight: 600;
	}

	:global(.dark) .badge-active {
		background: rgba(59, 130, 246, 0.2);
		color: #60a5fa;
		border: 1px solid rgba(59, 130, 246, 0.5);
	}

	.export-size {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.export-counts {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.export-actions {
		flex-shrink: 0;
	}

	:global(.btn-icon) {
		width: 1rem;
		height: 1rem;
		margin-right: 0.375rem;
	}

	:global(.btn-icon-sm) {
		width: 0.875rem;
		height: 0.875rem;
		margin-right: 0.25rem;
	}

	.expired-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	.failed-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: #dc2626;
	}

	:global(.failed-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	/* Screen reader only */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	/* Mobile */
	@media (max-width: 640px) {
		.delivery-options {
			flex-direction: column;
		}

		.export-row {
			flex-direction: column;
			align-items: flex-start;
		}

		.export-actions {
			width: 100%;
		}
	}
</style>
