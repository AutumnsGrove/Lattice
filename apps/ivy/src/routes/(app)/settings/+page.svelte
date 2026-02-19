<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";
	import { theme, currentUser } from "$lib/stores";
	import { onMount } from "svelte";

	let unsendDelay = "10";
	let signature = "";
	let notifyNewMail = true;
	let notifyNewsletter = false;

	function toggleTheme() {
		theme.update((t) => {
			const newTheme = t === "dark" ? "light" : "dark";
			if (typeof document !== "undefined") {
				document.documentElement.setAttribute("data-theme", newTheme);
			}
			return newTheme;
		});
	}

	// Mock storage data
	const storageUsed = 245; // MB
	const storageTotal = 1024; // MB
	const storagePercent = Math.round((storageUsed / storageTotal) * 100);

	// --- Triage Settings ---
	let digestTimes = $state<string[]>(["08:00", "13:00", "18:00"]);
	let digestTimezone = $state("America/New_York");
	let digestRecipient = $state("");
	let digestEnabled = $state(false);
	let savingDigest = $state(false);
	let digestSaved = $state(false);

	// Filter management
	interface FilterRule {
		id: string;
		type: "blocklist" | "allowlist";
		pattern: string;
		match_type: "exact" | "domain" | "contains";
		notes: string | null;
		created_at: string;
	}

	let filters = $state<FilterRule[]>([]);
	let loadingFilters = $state(true);
	let newFilterPattern = $state("");
	let newFilterType = $state<"blocklist" | "allowlist">("blocklist");
	let newFilterMatchType = $state<"exact" | "domain" | "contains">("domain");
	let addingFilter = $state(false);

	// Digest trigger
	let sendingDigest = $state(false);
	let digestMessage = $state("");

	async function loadTriageSettings() {
		try {
			const res = await fetch("/api/settings", { credentials: "include" }); // csrf-ok
			if (res.ok) {
				const data = await res.json();
				digestTimes = data.digest_times || ["08:00", "13:00", "18:00"];
				digestTimezone = data.digest_timezone || "America/New_York";
				digestRecipient = data.digest_recipient || "";
				digestEnabled = Boolean(data.digest_enabled);
			}
		} catch (err) {
			console.error("Failed to load settings:", err);
		}
	}

	async function loadFilters() {
		loadingFilters = true;
		try {
			const res = await fetch("/api/triage/filters", { credentials: "include" }); // csrf-ok
			if (res.ok) {
				const data = await res.json();
				filters = data.filters || [];
			}
		} catch (err) {
			console.error("Failed to load filters:", err);
		} finally {
			loadingFilters = false;
		}
	}

	async function saveDigestSettings() {
		savingDigest = true;
		digestSaved = false;
		try {
			const res = await fetch("/api/settings", {
				// csrf-ok
				method: "PUT",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					digest_times: digestTimes,
					digest_timezone: digestTimezone,
					digest_recipient: digestRecipient,
					digest_enabled: digestEnabled,
				}),
			});
			if (res.ok) {
				digestSaved = true;
				setTimeout(() => {
					digestSaved = false;
				}, 2000);
			}
		} catch (err) {
			console.error("Failed to save settings:", err);
		} finally {
			savingDigest = false;
		}
	}

	async function addFilter() {
		if (!newFilterPattern.trim()) return;
		addingFilter = true;
		try {
			const res = await fetch("/api/triage/filters", {
				// csrf-ok
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					type: newFilterType,
					pattern: newFilterPattern.trim(),
					match_type: newFilterMatchType,
				}),
			});
			if (res.ok) {
				newFilterPattern = "";
				await loadFilters();
			}
		} catch (err) {
			console.error("Failed to add filter:", err);
		} finally {
			addingFilter = false;
		}
	}

	async function removeFilter(id: string) {
		try {
			const res = await fetch(`/api/triage/filters/${id}`, {
				// csrf-ok
				method: "DELETE",
				credentials: "include",
			});
			if (res.ok) {
				filters = filters.filter((f) => f.id !== id);
			}
		} catch (err) {
			console.error("Failed to remove filter:", err);
		}
	}

	async function triggerDigest() {
		sendingDigest = true;
		digestMessage = "";
		try {
			const res = await fetch("/api/triage/digest/send", {
				// csrf-ok
				method: "POST",
				credentials: "include",
			});
			if (res.ok) {
				digestMessage = "Digest sent successfully!";
			} else {
				digestMessage = "Failed to send digest";
			}
		} catch (err) {
			digestMessage = "Network error";
		} finally {
			sendingDigest = false;
			setTimeout(() => {
				digestMessage = "";
			}, 3000);
		}
	}

	function updateDigestTime(index: number, value: string) {
		digestTimes = digestTimes.map((t, i) => (i === index ? value : t));
	}

	function addDigestTime() {
		if (digestTimes.length < 6) {
			digestTimes = [...digestTimes, "12:00"];
		}
	}

	function removeDigestTime(index: number) {
		if (digestTimes.length > 1) {
			digestTimes = digestTimes.filter((_, i) => i !== index);
		}
	}

	onMount(() => {
		loadTriageSettings();
		loadFilters();
	});
</script>

<svelte:head>
	<title>Settings - Ivy</title>
</svelte:head>

<div class="settings">
	<header class="settings-header">
		<h1>Settings</h1>
	</header>

	<div class="settings-content">
		<!-- Account Section -->
		<section class="settings-section">
			<h2 class="section-title">Account</h2>

			<div class="setting-card">
				<div class="setting-item">
					<div class="setting-info">
						<div class="setting-avatar">
							{$currentUser?.name?.charAt(0) ?? "U"}
						</div>
						<div class="setting-details">
							<span class="setting-name">{$currentUser?.name ?? "User"}</span>
							<span class="setting-email">{$currentUser?.email ?? "user@grove.place"}</span>
						</div>
					</div>
					<button class="btn-outline">Edit Profile</button>
				</div>
			</div>
		</section>

		<!-- Appearance Section -->
		<section class="settings-section">
			<h2 class="section-title">Appearance</h2>

			<div class="setting-card">
				<div class="setting-item">
					<div class="setting-info">
						<Icon name={$theme === "dark" ? "moon" : "sun"} size={20} />
						<div class="setting-details">
							<span class="setting-label">Theme</span>
							<span class="setting-description">Switch between dark and light mode</span>
						</div>
					</div>
					<button class="theme-toggle" onclick={toggleTheme}>
						<span class="toggle-option" class:active={$theme === "light"}>Light</span>
						<span class="toggle-option" class:active={$theme === "dark"}>Dark</span>
					</button>
				</div>
			</div>
		</section>

		<!-- Email Settings Section -->
		<section class="settings-section">
			<h2 class="section-title">Email</h2>

			<div class="setting-card">
				<div class="setting-item">
					<div class="setting-info">
						<Icon name="send" size={20} />
						<div class="setting-details">
							<span class="setting-label">Unsend delay</span>
							<span class="setting-description">Time to cancel sending an email</span>
						</div>
					</div>
					<select class="select-input" bind:value={unsendDelay}>
						<option value="5">5 seconds</option>
						<option value="10">10 seconds</option>
						<option value="20">20 seconds</option>
						<option value="30">30 seconds</option>
					</select>
				</div>

				<div class="setting-divider"></div>

				<div class="setting-item column">
					<div class="setting-info">
						<Icon name="compose" size={20} />
						<div class="setting-details">
							<span class="setting-label">Email signature</span>
							<span class="setting-description">Added to the end of your emails</span>
						</div>
					</div>
					<textarea
						class="textarea-input"
						placeholder="Enter your signature..."
						bind:value={signature}
						rows="3"
					></textarea>
				</div>
			</div>
		</section>

		<!-- Notifications Section -->
		<section class="settings-section">
			<h2 class="section-title">Notifications</h2>

			<div class="setting-card">
				<label class="setting-item">
					<div class="setting-info">
						<Icon name="inbox" size={20} />
						<div class="setting-details">
							<span class="setting-label">New email notifications</span>
							<span class="setting-description">Get notified when you receive new emails</span>
						</div>
					</div>
					<input type="checkbox" class="toggle-checkbox" bind:checked={notifyNewMail} />
				</label>

				<div class="setting-divider"></div>

				<label class="setting-item">
					<div class="setting-info">
						<Icon name="send" size={20} />
						<div class="setting-details">
							<span class="setting-label">Newsletter updates</span>
							<span class="setting-description">Notifications about sent newsletters</span>
						</div>
					</div>
					<input type="checkbox" class="toggle-checkbox" bind:checked={notifyNewsletter} />
				</label>
			</div>
		</section>

		<!-- Security Section -->
		<section class="settings-section">
			<h2 class="section-title">Security & Encryption</h2>

			<div class="setting-card">
				<div class="setting-item">
					<div class="setting-info">
						<Icon name="leaf" size={20} />
						<div class="setting-details">
							<span class="setting-label">Recovery phrase</span>
							<span class="setting-description">Download your 24-word recovery phrase</span>
						</div>
					</div>
					<button class="btn-outline">Download</button>
				</div>

				<div class="setting-divider"></div>

				<div class="setting-item">
					<div class="setting-info">
						<Icon name="settings" size={20} />
						<div class="setting-details">
							<span class="setting-label">Regenerate encryption key</span>
							<span class="setting-description danger">This will make old emails unreadable</span>
						</div>
					</div>
					<button class="btn-danger">Regenerate</button>
				</div>
			</div>
		</section>

		<!-- Storage Section -->
		<section class="settings-section">
			<h2 class="section-title">Storage</h2>

			<div class="setting-card">
				<div class="setting-item column">
					<div class="setting-info full">
						<Icon name="archive" size={20} />
						<div class="setting-details">
							<span class="setting-label">Storage usage</span>
							<span class="setting-description"
								>{storageUsed} MB of {storageTotal} MB used ({storagePercent}%)</span
							>
						</div>
					</div>
					<div class="storage-bar">
						<div class="storage-fill" style="width: {storagePercent}%"></div>
					</div>
					<div class="storage-breakdown">
						<div class="storage-item">
							<span class="storage-dot emails"></span>
							<span>Emails: 180 MB</span>
						</div>
						<div class="storage-item">
							<span class="storage-dot attachments"></span>
							<span>Attachments: 65 MB</span>
						</div>
					</div>
				</div>

				<div class="setting-divider"></div>

				<div class="setting-item">
					<div class="setting-info">
						<Icon name="file" size={20} />
						<div class="setting-details">
							<span class="setting-label">Export your data</span>
							<span class="setting-description">Download all your emails and settings</span>
						</div>
					</div>
					<button class="btn-outline">Export</button>
				</div>
			</div>
		</section>

		<!-- Triage & Digest Section -->
		<section class="settings-section">
			<h2 class="section-title">Triage & Digest</h2>

			<div class="setting-card">
				<!-- Digest toggle -->
				<label class="setting-item">
					<div class="setting-info">
						<Icon name="inbox" size={20} />
						<div class="setting-details">
							<span class="setting-label">Email digest</span>
							<span class="setting-description"
								>Receive AI-summarized email briefings at scheduled times</span
							>
						</div>
					</div>
					<input type="checkbox" class="toggle-checkbox" bind:checked={digestEnabled} />
				</label>

				<div class="setting-divider"></div>

				<!-- Digest times -->
				<div class="setting-item column">
					<div class="setting-info full">
						<Icon name="settings" size={20} />
						<div class="setting-details">
							<span class="setting-label">Digest schedule</span>
							<span class="setting-description">When to receive digest emails</span>
						</div>
					</div>
					<div class="digest-times">
						{#each digestTimes as time, i}
							<div class="digest-time-row">
								<input
									type="time"
									class="time-input"
									value={time}
									oninput={(e) => updateDigestTime(i, (e.target as HTMLInputElement).value)}
								/>
								{#if digestTimes.length > 1}
									<button
										class="remove-time-btn"
										onclick={() => removeDigestTime(i)}
										title="Remove time"
									>
										<Icon name="x" size={14} />
									</button>
								{/if}
							</div>
						{/each}
						{#if digestTimes.length < 6}
							<button class="add-time-btn" onclick={addDigestTime}>+ Add time</button>
						{/if}
					</div>
				</div>

				<div class="setting-divider"></div>

				<!-- Timezone -->
				<div class="setting-item">
					<div class="setting-info">
						<Icon name="settings" size={20} />
						<div class="setting-details">
							<span class="setting-label">Timezone</span>
						</div>
					</div>
					<select class="select-input" bind:value={digestTimezone}>
						<option value="America/New_York">Eastern (ET)</option>
						<option value="America/Chicago">Central (CT)</option>
						<option value="America/Denver">Mountain (MT)</option>
						<option value="America/Los_Angeles">Pacific (PT)</option>
						<option value="Europe/London">London (GMT)</option>
						<option value="Europe/Berlin">Berlin (CET)</option>
						<option value="Asia/Tokyo">Tokyo (JST)</option>
					</select>
				</div>

				<div class="setting-divider"></div>

				<!-- Recipient -->
				<div class="setting-item">
					<div class="setting-info">
						<Icon name="send" size={20} />
						<div class="setting-details">
							<span class="setting-label">Send digest to</span>
							<span class="setting-description">Email address for digest delivery</span>
						</div>
					</div>
					<input
						type="email"
						class="text-input"
						placeholder="you@example.com"
						bind:value={digestRecipient}
					/>
				</div>

				<div class="setting-divider"></div>

				<!-- Save + Send Now buttons -->
				<div class="setting-item">
					<button class="btn-outline" onclick={saveDigestSettings} disabled={savingDigest}>
						{#if savingDigest}Saving...{:else if digestSaved}Saved!{:else}Save Settings{/if}
					</button>
					<button class="btn-outline" onclick={triggerDigest} disabled={sendingDigest}>
						{#if sendingDigest}Sending...{:else}Send Digest Now{/if}
					</button>
				</div>
				{#if digestMessage}
					<div class="digest-message">{digestMessage}</div>
				{/if}
			</div>
		</section>

		<!-- Filter Management Section -->
		<section class="settings-section">
			<h2 class="section-title">Email Filters</h2>

			<div class="setting-card">
				<!-- Add filter -->
				<div class="setting-item column">
					<div class="setting-info full">
						<Icon name="settings" size={20} />
						<div class="setting-details">
							<span class="setting-label">Add filter rule</span>
							<span class="setting-description">Block or allow specific senders and domains</span>
						</div>
					</div>
					<div class="filter-form">
						<select class="select-input" bind:value={newFilterType}>
							<option value="blocklist">Block</option>
							<option value="allowlist">Allow</option>
						</select>
						<select class="select-input" bind:value={newFilterMatchType}>
							<option value="domain">Domain</option>
							<option value="exact">Exact</option>
							<option value="contains">Contains</option>
						</select>
						<input
							type="text"
							class="text-input filter-pattern"
							placeholder="e.g. instagram.com"
							bind:value={newFilterPattern}
							onkeydown={(e) => e.key === "Enter" && addFilter()}
						/>
						<button
							class="btn-outline"
							onclick={addFilter}
							disabled={addingFilter || !newFilterPattern.trim()}
						>
							{addingFilter ? "Adding..." : "Add"}
						</button>
					</div>
				</div>

				<div class="setting-divider"></div>

				<!-- Filter list -->
				<div class="setting-item column">
					{#if loadingFilters}
						<p class="filter-loading">Loading filters...</p>
					{:else if filters.length === 0}
						<p class="filter-empty">
							No custom filters yet. Default junk domains (Instagram, Facebook, LinkedIn, etc.) are
							blocked automatically.
						</p>
					{:else}
						<div class="filter-list">
							{#each filters as filter (filter.id)}
								<div class="filter-row">
									<span
										class="filter-type"
										class:blocklist={filter.type === "blocklist"}
										class:allowlist={filter.type === "allowlist"}
									>
										{filter.type === "blocklist" ? "Block" : "Allow"}
									</span>
									<span class="filter-match">{filter.match_type}</span>
									<span class="filter-pattern-text">{filter.pattern}</span>
									<button
										class="filter-remove"
										onclick={() => removeFilter(filter.id)}
										title="Remove filter"
									>
										<Icon name="x" size={14} />
									</button>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Danger Zone -->
		<section class="settings-section danger-zone">
			<h2 class="section-title danger">Danger Zone</h2>

			<div class="setting-card danger">
				<div class="setting-item">
					<div class="setting-info">
						<Icon name="trash" size={20} />
						<div class="setting-details">
							<span class="setting-label">Delete account</span>
							<span class="setting-description danger"
								>Permanently delete your account and all data</span
							>
						</div>
					</div>
					<button class="btn-danger">Delete Account</button>
				</div>
			</div>
		</section>
	</div>
</div>

<style>
	.settings {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.settings-header {
		padding: var(--space-4) var(--space-6);
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.settings-header h1 {
		font-size: var(--text-xl);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.settings-content {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-6);
		max-width: 720px;
	}

	.settings-section {
		margin-bottom: var(--space-8);
	}

	.section-title {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-3);
	}

	.section-title.danger {
		color: var(--color-error);
	}

	.setting-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.setting-card.danger {
		border-color: var(--color-error);
		border-opacity: 0.3;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		gap: var(--space-4);
	}

	.setting-item.column {
		flex-direction: column;
		align-items: stretch;
	}

	label.setting-item {
		cursor: pointer;
	}

	label.setting-item:hover {
		background: var(--color-surface-hover);
	}

	.setting-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-secondary);
	}

	.setting-info.full {
		width: 100%;
	}

	.setting-avatar {
		width: 48px;
		height: 48px;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		font-size: var(--text-lg);
	}

	.setting-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.setting-name {
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
	}

	.setting-email {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.setting-label {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.setting-description {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.setting-description.danger {
		color: var(--color-error);
	}

	.setting-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: 0 var(--space-4);
	}

	/* Buttons */
	.btn-outline {
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.btn-outline:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.btn-danger {
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.btn-danger:hover {
		background: var(--color-error);
		color: white;
	}

	/* Theme Toggle */
	.theme-toggle {
		display: flex;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.toggle-option {
		padding: var(--space-2) var(--space-3);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		transition: all var(--transition-fast);
	}

	.toggle-option.active {
		background: var(--color-primary);
		color: var(--color-text-inverse);
	}

	/* Select Input */
	.select-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.select-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	/* Textarea Input */
	.textarea-input {
		width: 100%;
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		line-height: var(--leading-relaxed);
		resize: vertical;
	}

	.textarea-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.textarea-input::placeholder {
		color: var(--color-text-tertiary);
	}

	/* Toggle Checkbox */
	.toggle-checkbox {
		width: 44px;
		height: 24px;
		appearance: none;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		cursor: pointer;
		position: relative;
		transition: all var(--transition-fast);
	}

	.toggle-checkbox::after {
		content: "";
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: var(--color-text-tertiary);
		border-radius: var(--radius-full);
		transition: all var(--transition-fast);
	}

	.toggle-checkbox:checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.toggle-checkbox:checked::after {
		left: 22px;
		background: white;
	}

	/* Storage Bar */
	.storage-bar {
		width: 100%;
		height: 8px;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-top: var(--space-3);
	}

	.storage-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		transition: width var(--transition-slow);
	}

	.storage-breakdown {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-3);
	}

	.storage-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.storage-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
	}

	.storage-dot.emails {
		background: var(--color-primary);
	}

	.storage-dot.attachments {
		background: var(--color-grove-600);
	}

	/* Text Input */
	.text-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.text-input::placeholder {
		color: var(--color-text-tertiary);
	}

	/* Digest Times */
	.digest-times {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.digest-time-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.time-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.time-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.remove-time-btn {
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
	}

	.remove-time-btn:hover {
		color: var(--color-error);
		background: var(--color-surface-hover);
	}

	.add-time-btn {
		padding: var(--space-1) var(--space-2);
		color: var(--color-primary);
		font-size: var(--text-sm);
		font-weight: var(--font-medium);
		background: transparent;
		transition: color var(--transition-fast);
	}

	.add-time-btn:hover {
		color: var(--color-primary-hover);
	}

	/* Digest message */
	.digest-message {
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-sm);
		color: var(--color-primary);
		text-align: center;
	}

	/* Filter Form */
	.filter-form {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		flex-wrap: wrap;
	}

	.filter-pattern {
		flex: 1;
		min-width: 150px;
	}

	.filter-loading,
	.filter-empty {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		padding: var(--space-2) 0;
	}

	.filter-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
	}

	.filter-type {
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}

	.filter-type.blocklist {
		background: var(--color-error);
		color: white;
	}

	.filter-type.allowlist {
		background: var(--color-primary);
		color: white;
	}

	.filter-match {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
	}

	.filter-pattern-text {
		flex: 1;
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		font-family: monospace;
	}

	.filter-remove {
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
	}

	.filter-remove:hover {
		color: var(--color-error);
		background: var(--color-surface-hover);
	}
</style>
