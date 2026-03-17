<script lang="ts">
	import { onMount } from "svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import Spinner from "@autumnsgrove/lattice/ui/components/ui/Spinner.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassConfirmDialog from "@autumnsgrove/lattice/ui/components/ui/GlassConfirmDialog.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { GreenhouseStatusCard, GraftControlPanel } from "@autumnsgrove/lattice/grafts/greenhouse";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import {
		chromeIcons,
		natureIcons,
		stateIcons,
		metricIcons,
		navIcons,
	} from "@autumnsgrove/prism/icons";
	import { DomainCheckerModal } from "@autumnsgrove/lattice/ui/components/domain";
	import { groveModeStore } from "@autumnsgrove/lattice/ui/stores/grove-mode.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api, apiRequest } from "@autumnsgrove/lattice/utils";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";

	const Leaf = natureIcons.leaf;
	const Check = stateIcons.check;
	const X = stateIcons.x;
	const Loader2 = stateIcons.loader;
	const AlertTriangle = stateIcons.warning;
	const Clock = metricIcons.clock;
	const Globe = navIcons.globe;

	let { data } = $props();

	// Profile photo state
	let avatarUrl = $state<string | null>(null);
	let uploadingAvatar = $state(false);
	let clearingAvatar = $state(false);
	const oauthAvatarUrl = $derived(data.oauthAvatarUrl ?? null);
	const displayAvatar = $derived(avatarUrl || oauthAvatarUrl);

	// Header branding state
	let groveTitle = $state("");
	let savingTitle = $state(false);
	let showGroveLogo = $state(false);
	let savingLogo = $state(false);

	// Domain checker
	let showDomainChecker = $state(false);
	const tenantUsername = $derived(
		data.context?.type === "tenant" ? data.context.tenant.subdomain : "",
	);
	const tenantTier = $derived(
		data.context?.type === "tenant" ? data.context.tenant.plan || "seedling" : "seedling",
	);

	// Greenhouse graft toggle state
	let loadingGraftId = $state<string | undefined>(undefined);
	let resettingGrafts = $state(false);
	let toggleGraftForm = $state<HTMLFormElement | undefined>();
	let resetGraftsForm = $state<HTMLFormElement | undefined>();
	let toggleGraftId = $state("");
	let toggleGraftEnabled = $state("");

	// Username change state
	let showUsernameChange = $state(false);
	let newUsername = $state("");
	let checkingUsername = $state(false);
	let usernameAvailable = $state<boolean | null>(null);
	let usernameError = $state("");
	let changingUsername = $state(false);
	let showUsernameConfirmDialog = $state(false);
	let usernameDebounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined);
	let usernameAbortController = $state<AbortController | null>(null);

	function checkUsernameAvailability(value: string) {
		const trimmed = value.toLowerCase().trim();
		clearTimeout(usernameDebounceTimer);
		usernameAvailable = null;
		usernameError = "";

		if (usernameAbortController) {
			usernameAbortController.abort();
			usernameAbortController = null;
		}

		if (!trimmed || trimmed.length < 3) {
			checkingUsername = false;
			if (trimmed.length > 0) usernameError = "At least 3 characters";
			return;
		}

		if (trimmed === data.currentSubdomain) {
			usernameError = "That's already your current username";
			usernameAvailable = false;
			return;
		}

		checkingUsername = true;
		usernameDebounceTimer = setTimeout(async () => {
			const controller = new AbortController();
			usernameAbortController = controller;
			try {
				const result = await api.get<{ available: boolean; error?: string }>(
					`/api/username/check?username=${encodeURIComponent(trimmed)}`,
					{ signal: controller.signal },
				);
				if (!controller.signal.aborted) {
					if (result?.available) {
						usernameAvailable = true;
						usernameError = "";
					} else {
						usernameAvailable = false;
						usernameError = result?.error || "Username not available";
					}
					checkingUsername = false;
				}
			} catch (err) {
				if (!controller.signal.aborted) {
					usernameError = "Unable to check availability";
					usernameAvailable = false;
					checkingUsername = false;
				}
			}
		}, 400);
	}

	async function fetchCurrentSettings() {
		try {
			const settings = await api.get("/api/settings");
			groveTitle = settings.grove_title || "";
			showGroveLogo = settings.show_grove_logo === true || settings.show_grove_logo === "true";
			avatarUrl = settings.avatar_url || null;
		} catch (error) {
			console.error("Failed to fetch settings:", error);
		}
	}

	function handleAvatarUpload() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/*";
		input.onchange = async () => {
			const file = input.files?.[0];
			if (!file) return;

			if (file.size > 5 * 1024 * 1024) {
				toast.error("Photo must be under 5 MB");
				return;
			}

			uploadingAvatar = true;
			try {
				const formData = new FormData();
				formData.append("file", file);

				const result = await apiRequest("/api/settings/avatar", {
					method: "POST",
					body: formData,
				});

				if (result?.url) {
					avatarUrl = result.url;
					toast.success("Profile photo updated");
					invalidateAll();
				} else {
					toast.error("Upload completed but no photo URL was returned");
				}
			} catch (error) {
				toast.error(error instanceof Error ? error.message : "Failed to upload photo");
			}
			uploadingAvatar = false;
		};
		input.click();
	}

	async function handleAvatarClear() {
		clearingAvatar = true;
		try {
			await apiRequest("/api/settings/avatar", { method: "DELETE" });
			avatarUrl = null;
			toast.success("Profile photo removed");
			invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to remove photo");
		}
		clearingAvatar = false;
	}

	async function saveGroveTitle() {
		savingTitle = true;
		try {
			await api.put("/api/admin/settings", {
				setting_key: "grove_title",
				setting_value: groveTitle.trim(),
			});
			toast.success(
				groveTitle.trim()
					? "Title saved. Refresh to see it in the header."
					: "Title cleared — your default name will show instead.",
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save title");
		}
		savingTitle = false;
	}

	async function saveGroveLogo() {
		savingLogo = true;
		try {
			await api.put("/api/admin/settings", {
				setting_key: "show_grove_logo",
				setting_value: showGroveLogo ? "true" : "false",
			});
			toast.success(
				showGroveLogo
					? "Grove logo enabled. Tap it to cycle through seasons."
					: "Grove logo hidden from header.",
			);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save logo setting");
		}
		savingLogo = false;
	}

	onMount(() => {
		fetchCurrentSettings();
	});
</script>

<ArborSection
	title="Profile"
	icon={chromeIcons.sliders}
	description="Your identity, address, and grove configuration."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<!-- Profile Photo -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Profile Photo</h2>
		</div>
		<p class="section-description">
			Your photo appears in the <GroveTerm interactive term="canopy">Canopy</GroveTerm> directory and
			across your <GroveTerm interactive term="grove">grove</GroveTerm>.
		</p>

		<div class="avatar-section">
			<div class="avatar-preview">
				{#if displayAvatar}
					<img src={displayAvatar} alt="Your profile photo" class="avatar-image" />
				{:else}
					<span class="avatar-placeholder">
						{data.user?.name?.[0] || data.user?.email?.[0] || "?"}
					</span>
				{/if}
			</div>

			<div class="avatar-actions">
				<Button onclick={handleAvatarUpload} variant="primary" disabled={uploadingAvatar}>
					{#if uploadingAvatar}
						<Spinner size="sm" /> Uploading...
					{:else}
						{avatarUrl ? "Change Photo" : "Upload Photo"}
					{/if}
				</Button>

				{#if avatarUrl}
					<Button onclick={handleAvatarClear} variant="danger" disabled={clearingAvatar}>
						{clearingAvatar ? "Removing..." : "Remove"}
					</Button>
				{/if}

				{#if !avatarUrl && oauthAvatarUrl}
					<p class="avatar-hint">Currently using your sign-in photo</p>
				{/if}
			</div>
		</div>
	</GlassCard>

	<!-- Grove Address -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Grove Address</h2>
		</div>
		<p class="section-description">
			Your grove lives at <strong>{data.currentSubdomain}.grove.place</strong>
		</p>

		{#if !showUsernameChange}
			<div class="username-display">
				{#if data.usernameChangeAllowed}
					<Button onclick={() => (showUsernameChange = true)} variant="secondary">
						Change Username
					</Button>
				{:else}
					<p class="rate-limit-notice">
						<Clock size={14} class="inline-icon" />
						{data.usernameChangeReason || "Username change limit reached."}
						{#if data.usernameChangeNextAllowedAt}
							Available {new Date(data.usernameChangeNextAllowedAt * 1000).toLocaleDateString()}.
						{/if}
					</p>
				{/if}
			</div>
		{:else}
			<div class="username-change-form">
				<div class="username-input-row">
					<div class="username-input-wrapper">
						<input
							type="text"
							class="glass-input"
							placeholder="new-username"
							aria-label="New username"
							bind:value={newUsername}
							oninput={(e) => checkUsernameAvailability((e.target as HTMLInputElement).value)}
							disabled={changingUsername}
						/>
						<span class="username-suffix">.grove.place</span>
					</div>

					<div class="username-status" role="status" aria-live="polite">
						{#if checkingUsername}
							<Loader2
								size={18}
								class="animate-spin"
								style="color: var(--color-text-muted);"
								aria-label="Checking availability"
							/>
						{:else if usernameAvailable === true}
							<Check size={18} style="color: var(--color-success);" aria-label="Available" />
						{:else if usernameAvailable === false}
							<X size={18} style="color: var(--color-error);" aria-label="Not available" />
						{/if}
					</div>
				</div>

				{#if usernameError}
					<p class="username-error" role="alert">{usernameError}</p>
				{/if}

				<p class="username-hint">
					Lowercase letters, numbers, and hyphens. Must start with a letter, 3–30 characters.
				</p>

				<div class="username-actions">
					<Button
						onclick={() => (showUsernameConfirmDialog = true)}
						variant="primary"
						disabled={!usernameAvailable || changingUsername || !newUsername.trim()}
					>
						{changingUsername ? "Changing..." : "Change Username"}
					</Button>
					<Button
						onclick={() => {
							showUsernameChange = false;
							newUsername = "";
							usernameAvailable = null;
							usernameError = "";
						}}
						variant="ghost"
						disabled={changingUsername}
					>
						Cancel
					</Button>
				</div>
			</div>

			<GlassConfirmDialog
				open={showUsernameConfirmDialog}
				title="Change your grove address?"
				confirmLabel={changingUsername ? "Changing..." : "Change Username"}
				variant="warning"
				onconfirm={() => {
					const form = document.getElementById("username-change-form") as HTMLFormElement | null;
					if (form) form.requestSubmit();
				}}
				oncancel={() => (showUsernameConfirmDialog = false)}
			>
				<div class="username-warning">
					<p class="warning-highlight">
						<AlertTriangle size={16} class="inline-icon" />
						Your grove will move from <strong>{data.currentSubdomain}.grove.place</strong> to
						<strong>{newUsername}.grove.place</strong>
					</p>
					<ul class="warning-list">
						<li>External links to your old address will redirect for 30 days</li>
						<li>RSS subscribers may need to update their feed URL</li>
						<li>Your old username will be held for 30 days — you can change back if needed</li>
					</ul>
				</div>
			</GlassConfirmDialog>

			<form
				id="username-change-form"
				method="POST"
				action="?/changeUsername"
				class="hidden"
				use:enhance={() => {
					changingUsername = true;
					showUsernameConfirmDialog = false;
					return async ({ result, update }) => {
						changingUsername = false;
						if (result.type === "success") {
							const newSub = String(result.data?.newSubdomain || newUsername.toLowerCase().trim());
							toast.success(`Username changed to ${newSub}. Redirecting...`);
							setTimeout(() => {
								window.location.href = `https://${newSub}.grove.place/arbor/settings/profile`;
							}, 1500);
						} else if (result.type === "failure") {
							toast.error(String(result.data?.error || "Failed to change username"));
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="newUsername" value={newUsername} />
			</form>
		{/if}

		{#if data.usernameHistory && data.usernameHistory.length > 0}
			<details class="username-history">
				<summary>Previous changes</summary>
				<ul class="history-list">
					{#each data.usernameHistory as entry}
						<li>
							<span class="history-from">{entry.oldSubdomain}</span>
							&rarr;
							<span class="history-to">{entry.newSubdomain}</span>
							<span class="history-date">
								{new Date(entry.changedAt * 1000).toLocaleDateString()}
							</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}
	</GlassCard>

	<!-- Header Branding -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Header Branding</h2>
		</div>
		<p class="section-description">
			Customize what appears in the header of your <GroveTerm interactive term="grove"
				>grove</GroveTerm
			>.
		</p>

		<div class="canopy-field">
			<label for="grove-title" class="field-label">Grove Title</label>
			<input
				type="text"
				id="grove-title"
				bind:value={groveTitle}
				placeholder="My Grove"
				maxlength="50"
				class="canopy-input"
			/>
			<p class="field-help">
				The name that appears in the header and browser tab. Leave empty to use your default display
				name.
				<span class="char-count">{groveTitle.length}/50</span>
			</p>
		</div>

		<div class="button-row">
			<Button onclick={saveGroveTitle} variant="primary" disabled={savingTitle}>
				{savingTitle ? "Saving..." : "Save Title"}
			</Button>
		</div>

		<label class="logo-toggle">
			<input type="checkbox" bind:checked={showGroveLogo} />
			<span class="toggle-label">
				<span class="toggle-title">Show Grove Logo</span>
				<span class="toggle-description">
					Displays the seasonal Grove tree icon next to your site title. Visitors can tap it to
					cycle through seasonal themes.
				</span>
			</span>
		</label>

		<div class="button-row">
			<Button onclick={saveGroveLogo} variant="primary" disabled={savingLogo}>
				{savingLogo ? "Saving..." : "Save Logo Setting"}
			</Button>
		</div>
	</GlassCard>

	<!-- Preferences -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Preferences</h2>
		</div>
		<p class="section-description">
			Personal display preferences for your <GroveTerm interactive term="arbor">Arbor</GroveTerm>.
		</p>

		<label class="logo-toggle">
			<input
				type="checkbox"
				checked={groveModeStore.current}
				onchange={() => groveModeStore.toggle()}
			/>
			<span class="toggle-label">
				<span class="toggle-title">
					<Leaf class="inline-icon" size={16} />
					Grove Mode
				</span>
				<span class="toggle-description">
					{groveModeStore.current
						? "Nature-themed terminology is active. Navigation and features use Grove names."
						: "Standard terminology is active. Navigation and features use familiar web terms."}
				</span>
			</span>
		</label>
	</GlassCard>

	<!-- Greenhouse Status -->
	<GreenhouseStatusCard
		inGreenhouse={data.greenhouseStatus?.inGreenhouse ?? false}
		enrolledAt={data.greenhouseStatus?.enrolledAt}
		notes={data.greenhouseStatus?.notes}
		waystone="what-is-greenhouse"
		waystoneLabel="Learn about the Greenhouse"
		class="mb-6"
	/>

	<!-- Graft Control Panel (greenhouse members) -->
	{#if data.greenhouseStatus?.inGreenhouse && data.tenantGrafts?.length > 0}
		<form
			method="POST"
			action="?/toggleGraft"
			bind:this={toggleGraftForm}
			class="hidden"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === "success") {
						toast.success(String(result.data?.message || "Feature updated"));
						await invalidateAll();
					} else if (result.type === "failure") {
						toast.error(String(result.data?.error || "Failed to toggle feature"));
					}
					loadingGraftId = undefined;
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="graftId" bind:value={toggleGraftId} />
			<input type="hidden" name="enabled" bind:value={toggleGraftEnabled} />
		</form>

		<form
			method="POST"
			action="?/resetGrafts"
			bind:this={resetGraftsForm}
			class="hidden"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === "success") {
						toast.success(String(result.data?.message || "Preferences reset"));
						await invalidateAll();
					} else if (result.type === "failure") {
						toast.error(String(result.data?.error || "Failed to reset preferences"));
					}
					resettingGrafts = false;
					await update({ reset: false });
				};
			}}
		></form>

		<div class="mb-6">
			<GraftControlPanel
				grafts={data.tenantGrafts}
				currentValues={data.grafts}
				onToggle={(graftId, enabled) => {
					loadingGraftId = graftId;
					toggleGraftId = graftId;
					toggleGraftEnabled = String(enabled);
					toggleGraftForm?.requestSubmit();
				}}
				onReset={() => {
					resettingGrafts = true;
					resetGraftsForm?.requestSubmit();
				}}
				{loadingGraftId}
				resetting={resettingGrafts}
			/>
		</div>
	{/if}

	<!-- Custom Domain CTA -->
	<div class="domain-cta mb-6">
		<div class="domain-cta__inner">
			<div class="domain-cta__content">
				<div class="domain-cta__icon">
					<Globe size={18} />
				</div>
				<div>
					<p class="domain-cta__title">Want your own domain?</p>
					<p class="domain-cta__description">
						Check if your dream .com is available — or <a href="/arbor/domain"
							>explore on a full page</a
						>.
					</p>
				</div>
			</div>
			<Button variant="outline" size="sm" onclick={() => (showDomainChecker = true)}>
				Check Availability
			</Button>
		</div>
	</div>
</ArborSection>

<DomainCheckerModal bind:open={showDomainChecker} username={tenantUsername} userTier={tenantTier} />

<style>
	.hidden {
		display: none;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.section-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--color-text);
	}
	.section-description {
		margin: 0 0 1rem 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}
	.button-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	/* Profile photo */
	.avatar-section {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		margin-bottom: 0.5rem;
	}
	.avatar-preview {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		border: 3px solid var(--color-border);
		background: var(--color-surface-elevated);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: border-color 0.2s ease;
	}
	.avatar-preview:hover {
		border-color: var(--color-primary);
	}
	.avatar-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.avatar-placeholder {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text-muted);
		text-transform: uppercase;
		user-select: none;
	}
	.avatar-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-start;
	}
	.avatar-hint {
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		margin: 0;
		font-style: italic;
	}

	/* Username change */
	.username-display {
		margin-top: 0.75rem;
	}
	.rate-limit-notice {
		color: var(--color-text-muted);
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.username-change-form {
		margin-top: 1rem;
	}
	.username-input-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.username-input-wrapper {
		display: flex;
		align-items: center;
		flex: 1;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		overflow: hidden;
	}
	.username-input-wrapper .glass-input {
		flex: 1;
		border: none;
		background: transparent;
		padding: 0.5rem 0.75rem;
		color: var(--color-text);
		font-size: 0.95rem;
	}
	.username-input-wrapper .glass-input:focus {
		outline: none;
	}
	.username-suffix {
		padding: 0.5rem 0.75rem;
		color: var(--color-text-subtle);
		font-size: 0.85rem;
		white-space: nowrap;
		border-left: 1px solid var(--color-border);
	}
	.username-status {
		width: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.username-error {
		color: var(--color-error);
		font-size: 0.8rem;
		margin-top: 0.4rem;
	}
	.username-hint {
		color: var(--color-text-subtle);
		font-size: 0.75rem;
		margin-top: 0.3rem;
	}
	.username-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.username-warning {
		font-size: 0.9rem;
	}
	.warning-highlight {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: hsl(var(--warning));
		margin-bottom: 0.75rem;
	}
	.warning-list {
		padding-left: 1.25rem;
		list-style: disc;
		color: var(--color-text-muted);
		line-height: 1.6;
	}
	.username-history {
		margin-top: 1rem;
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
	.username-history summary {
		cursor: pointer;
		color: var(--color-text-subtle);
		font-size: 0.8rem;
	}
	.history-list {
		list-style: none;
		padding: 0;
		margin-top: 0.5rem;
	}
	.history-list li {
		font-size: 0.8rem;
		color: var(--color-text-subtle);
		padding: 0.25rem 0;
	}
	.history-from {
		text-decoration: line-through;
		opacity: 0.6;
	}
	.history-to {
		color: var(--color-text-muted);
	}
	.history-date {
		margin-left: 0.5rem;
		opacity: 0.4;
	}

	/* Header branding */
	.canopy-field {
		margin-bottom: 1.5rem;
	}
	.field-label {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}
	.canopy-input {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 0.95rem;
		transition: border-color 0.2s;
	}
	.canopy-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.field-help {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0.5rem 0 0 0;
	}
	.char-count {
		float: right;
		opacity: 0.7;
	}

	/* Toggle styles */
	.logo-toggle {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background-color 0.2s;
		margin-bottom: 1rem;
	}
	.logo-toggle:hover {
		border-color: var(--color-primary);
	}
	.logo-toggle:has(input:checked) {
		border-color: var(--color-primary);
		background: hsl(var(--primary-color) / 0.05);
	}
	:global(.dark) .logo-toggle:has(input:checked) {
		border-color: var(--color-primary-light);
		background: hsl(var(--primary-color) / 0.1);
	}
	.logo-toggle input[type="checkbox"] {
		width: 20px;
		height: 20px;
		accent-color: var(--color-primary);
		margin-top: 2px;
		flex-shrink: 0;
	}
	.toggle-label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.toggle-title {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.toggle-description {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	/* Domain CTA */
	.domain-cta {
		border: 2px dashed var(--color-border);
		border-radius: var(--border-radius-standard);
		padding: 1rem 1.25rem;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}
	.domain-cta:hover {
		border-color: var(--color-primary);
		background: hsl(var(--primary-color) / 0.03);
	}
	:global(.dark) .domain-cta:hover {
		background: hsl(var(--primary-color) / 0.05);
	}
	.domain-cta__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.domain-cta__content {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}
	.domain-cta__icon {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--color-primary);
	}
	.domain-cta__title {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text);
	}
	.domain-cta__description {
		margin: 0.125rem 0 0 0;
		font-size: 0.825rem;
		color: var(--color-text-muted);
	}
	.domain-cta__description a {
		color: var(--color-primary);
		text-decoration: none;
	}
	.domain-cta__description a:hover {
		text-decoration: underline;
	}
	@media (max-width: 600px) {
		.domain-cta__inner {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
