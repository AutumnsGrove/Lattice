<script lang="ts">
	// ModerationQueue.svelte
	// Admin component for moderating community theme submissions

	import type { CommunityTheme, CommunityThemeStatus, Theme } from "../types.js";
	import { validateThemeContrast, getContrastRatio } from "../utils/contrast.js";
	import ThemePreview from "./ThemePreview.svelte";
	import ThemeRating from "./ThemeRating.svelte";

	interface Props {
		themes: CommunityTheme[];
		onStatusChange?: (themeId: string, status: CommunityThemeStatus, reason?: string) => void;
		onPreview?: (theme: CommunityTheme) => void;
	}

	let { themes, onStatusChange, onPreview }: Props = $props();

	// Local state
	let searchQuery = $state("");
	let statusFilter = $state<CommunityThemeStatus | "all">("all");
	let sortBy = $state<"newest" | "oldest" | "popular">("newest");
	let selectedThemes = $state<Set<string>>(new Set());
	let currentThemeIndex = $state(0);
	let showPreviewModal = $state(false);
	let previewTheme = $state<CommunityTheme | null>(null);
	let showCustomizations = $state<string | null>(null);
	let wcagResults = $state<Map<string, ReturnType<typeof validateThemeContrast>>>(new Map());
	let statusChangeTheme = $state<CommunityTheme | null>(null);
	let statusChangeAction = $state<CommunityThemeStatus | null>(null);
	let statusChangeReason = $state("");

	// Status options
	const statusOptions: { value: CommunityThemeStatus | "all"; label: string }[] = [
		{ value: "all", label: "All Statuses" },
		{ value: "pending", label: "Pending" },
		{ value: "in_review", label: "In Review" },
		{ value: "approved", label: "Approved" },
		{ value: "featured", label: "Featured" },
		{ value: "changes_requested", label: "Changes Requested" },
		{ value: "rejected", label: "Rejected" },
		{ value: "removed", label: "Removed" },
	];

	// Status badge colors
	function getStatusColor(status: CommunityThemeStatus): string {
		switch (status) {
			case "pending":
				return "#f59e0b"; // orange/yellow
			case "in_review":
				return "#3b82f6"; // blue
			case "approved":
				return "#16a34a"; // green
			case "featured":
				return "#9333ea"; // purple
			case "changes_requested":
				return "#ea580c"; // orange
			case "rejected":
				return "#dc2626"; // red
			case "removed":
				return "#6b7280"; // gray
			case "draft":
				return "#9ca3af"; // light gray
			default:
				return "#6b7280";
		}
	}

	// Filter and sort themes
	const filteredThemes = $derived(() => {
		let result = [...themes];

		// Status filter
		if (statusFilter !== "all") {
			result = result.filter((theme) => theme.status === statusFilter);
		}

		// Search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(theme) =>
					theme.name.toLowerCase().includes(query) ||
					theme.description?.toLowerCase().includes(query) ||
					theme.creatorTenantId.toLowerCase().includes(query) ||
					theme.tags?.some((tag) => tag.toLowerCase().includes(query)),
			);
		}

		// Sort
		result.sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return b.createdAt - a.createdAt;
				case "oldest":
					return a.createdAt - b.createdAt;
				case "popular":
					return b.downloads - a.downloads;
				default:
					return 0;
			}
		});

		return result;
	});

	// Calculate average rating
	function getAverageRating(theme: CommunityTheme): number {
		if (theme.ratingCount === 0) return 0;
		return theme.ratingSum / theme.ratingCount;
	}

	// Format date
	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	// Shorten creator ID
	function shortenCreatorId(id: string): string {
		if (id.length <= 12) return id;
		return `${id.slice(0, 8)}...${id.slice(-4)}`;
	}

	// Toggle theme selection for bulk actions
	function toggleThemeSelection(themeId: string) {
		if (selectedThemes.has(themeId)) {
			selectedThemes.delete(themeId);
		} else {
			selectedThemes.add(themeId);
		}
		selectedThemes = new Set(selectedThemes);
	}

	// Toggle all themes selection
	function toggleSelectAll() {
		if (selectedThemes.size === filteredThemes().length) {
			selectedThemes = new Set();
		} else {
			selectedThemes = new Set(filteredThemes().map((t) => t.id));
		}
	}

	// Handle preview
	function handlePreview(theme: CommunityTheme) {
		if (onPreview) {
			onPreview(theme);
		} else {
			previewTheme = theme;
			showPreviewModal = true;
		}
	}

	// Close preview modal
	function closePreviewModal() {
		showPreviewModal = false;
		previewTheme = null;
	}

	// Toggle customizations view
	function toggleCustomizations(themeId: string) {
		if (showCustomizations === themeId) {
			showCustomizations = null;
		} else {
			showCustomizations = themeId;
		}
	}

	// Run WCAG validation
	function runWCAGValidation(theme: CommunityTheme) {
		// Create a Theme object for validation
		const validationTheme: Theme = {
			id: theme.id,
			name: theme.name,
			description: theme.description || "",
			thumbnail: "",
			tier: "oak",
			colors: {
				background: theme.customColors?.background || "#ffffff",
				surface: theme.customColors?.surface || "#f5f5f5",
				foreground: theme.customColors?.foreground || "#111111",
				foregroundMuted: theme.customColors?.foregroundMuted || "#666666",
				accent: theme.customColors?.accent || "#16a34a",
				border: theme.customColors?.border || "#e5e5e5",
			},
			fonts: {
				heading: theme.customTypography?.heading || "system-ui",
				body: theme.customTypography?.body || "system-ui",
				mono: theme.customTypography?.mono || "monospace",
			},
			layout: {
				type: theme.customLayout?.type || "sidebar",
				maxWidth: theme.customLayout?.maxWidth || "1200px",
				spacing: theme.customLayout?.spacing || "comfortable",
			},
		};

		const result = validateThemeContrast(validationTheme);
		wcagResults.set(theme.id, result);
		wcagResults = new Map(wcagResults);
	}

	// Open status change dialog
	function openStatusChangeDialog(theme: CommunityTheme, action: CommunityThemeStatus) {
		statusChangeTheme = theme;
		statusChangeAction = action;
		statusChangeReason = "";
	}

	// Close status change dialog
	function closeStatusChangeDialog() {
		statusChangeTheme = null;
		statusChangeAction = null;
		statusChangeReason = "";
	}

	// Confirm status change
	function confirmStatusChange() {
		if (!statusChangeTheme || !statusChangeAction) return;

		const needsReason =
			statusChangeAction === "changes_requested" || statusChangeAction === "rejected";

		if (needsReason && !statusChangeReason.trim()) {
			alert("Please provide a reason for this action");
			return;
		}

		onStatusChange?.(
			statusChangeTheme.id,
			statusChangeAction,
			needsReason ? statusChangeReason : undefined,
		);

		closeStatusChangeDialog();
	}

	// Bulk approve
	function bulkApprove() {
		if (selectedThemes.size === 0) return;
		if (!confirm(`Approve ${selectedThemes.size} themes?`)) return;

		for (const themeId of selectedThemes) {
			onStatusChange?.(themeId, "approved");
		}
		selectedThemes = new Set();
	}

	// Bulk reject
	function bulkReject() {
		if (selectedThemes.size === 0) return;
		const reason = prompt(`Reject ${selectedThemes.size} themes? Enter reason:`);
		if (!reason) return;

		for (const themeId of selectedThemes) {
			onStatusChange?.(themeId, "rejected", reason);
		}
		selectedThemes = new Set();
	}

	// Keyboard navigation
	function handleGlobalKeydown(event: KeyboardEvent) {
		// Skip if modal is open or user is typing
		if (
			showPreviewModal ||
			statusChangeTheme ||
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		const themes = filteredThemes();
		if (themes.length === 0) return;

		switch (event.key.toLowerCase()) {
			case "j":
				event.preventDefault();
				currentThemeIndex = Math.min(currentThemeIndex + 1, themes.length - 1);
				scrollToTheme(currentThemeIndex);
				break;
			case "k":
				event.preventDefault();
				currentThemeIndex = Math.max(currentThemeIndex - 1, 0);
				scrollToTheme(currentThemeIndex);
				break;
			case "enter":
				event.preventDefault();
				handlePreview(themes[currentThemeIndex]);
				break;
		}
	}

	// Scroll to theme
	function scrollToTheme(index: number) {
		const element = document.querySelector(`[data-theme-index="${index}"]`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}

	// Handle escape key for modals
	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			if (showPreviewModal) {
				closePreviewModal();
			} else if (statusChangeTheme) {
				closeStatusChangeDialog();
			}
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="moderation-queue">
	<header class="queue-header">
		<h1>Community Theme Moderation</h1>
		<p class="subtitle">Review and manage community theme submissions</p>
	</header>

	<!-- Controls -->
	<div class="controls">
		<div class="search-bar">
			<svg
				class="search-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="8"></circle>
				<path d="m21 21-4.35-4.35"></path>
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by name, description, creator, or tags..."
				class="search-input"
				aria-label="Search themes"
			/>
		</div>

		<div class="filters">
			<select bind:value={statusFilter} class="filter-select" aria-label="Filter by status">
				{#each statusOptions as option}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>

			<select bind:value={sortBy} class="filter-select" aria-label="Sort themes">
				<option value="newest">Newest First</option>
				<option value="oldest">Oldest First</option>
				<option value="popular">Most Popular</option>
			</select>

			<div class="results-count">
				{filteredThemes().length}
				{filteredThemes().length === 1 ? "theme" : "themes"}
			</div>
		</div>

		{#if selectedThemes.size > 0}
			<div class="bulk-actions">
				<span class="selected-count">{selectedThemes.size} selected</span>
				<button type="button" class="bulk-action-btn approve" onclick={bulkApprove}>
					Bulk Approve
				</button>
				<button type="button" class="bulk-action-btn reject" onclick={bulkReject}>
					Bulk Reject
				</button>
				<button
					type="button"
					class="bulk-action-btn clear"
					onclick={() => (selectedThemes = new Set())}
				>
					Clear Selection
				</button>
			</div>
		{/if}
	</div>

	<!-- Keyboard shortcuts hint -->
	<div class="keyboard-hint">
		<kbd>j</kbd>/<kbd>k</kbd> navigate • <kbd>Enter</kbd> preview
	</div>

	{#if filteredThemes().length === 0}
		<div class="no-results">
			<p>No themes found matching your filters.</p>
		</div>
	{:else}
		<!-- Desktop: Table layout -->
		<div class="desktop-view">
			<table class="themes-table">
				<thead>
					<tr>
						<th class="checkbox-col">
							<input
								type="checkbox"
								checked={selectedThemes.size === filteredThemes().length &&
									filteredThemes().length > 0}
								onchange={toggleSelectAll}
								aria-label="Select all themes"
							/>
						</th>
						<th>Theme</th>
						<th>Creator</th>
						<th>Base</th>
						<th>Submitted</th>
						<th>Status</th>
						<th class="stats-col">Stats</th>
						<th class="actions-col">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredThemes() as theme, index (theme.id)}
						{@const rating = getAverageRating(theme)}
						{@const isCurrent = index === currentThemeIndex}

						<tr class="theme-row" class:current={isCurrent} data-theme-index={index}>
							<td class="checkbox-col">
								<input
									type="checkbox"
									checked={selectedThemes.has(theme.id)}
									onchange={() => toggleThemeSelection(theme.id)}
									aria-label="Select {theme.name}"
								/>
							</td>
							<td class="theme-info-col">
								<div class="theme-name">{theme.name}</div>
								{#if theme.description}
									<div class="theme-description">{theme.description}</div>
								{/if}
								{#if theme.tags && theme.tags.length > 0}
									<div class="tags">
										{#each theme.tags.slice(0, 3) as tag}
											<span class="tag">{tag}</span>
										{/each}
									</div>
								{/if}
							</td>
							<td>
								<span class="creator-id" title={theme.creatorTenantId}>
									{shortenCreatorId(theme.creatorTenantId)}
								</span>
							</td>
							<td>
								<span class="base-theme-badge">{theme.baseTheme}</span>
							</td>
							<td>
								{formatDate(theme.createdAt)}
							</td>
							<td>
								<span class="status-badge" style="background-color: {getStatusColor(theme.status)}">
									{theme.status.replace("_", " ")}
								</span>
							</td>
							<td class="stats-col">
								<div class="stats">
									<div class="rating-display">
										<ThemeRating {rating} readonly />
										<span class="rating-text">({theme.ratingCount})</span>
									</div>
									<div class="downloads">
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"
										>
											<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
											<polyline points="7 10 12 15 17 10"></polyline>
											<line x1="12" y1="15" x2="12" y2="3"></line>
										</svg>
										{theme.downloads.toLocaleString()}
									</div>
								</div>
							</td>
							<td class="actions-col">
								<div class="action-buttons">
									<button
										type="button"
										class="action-btn preview"
										onclick={() => handlePreview(theme)}
										aria-label="Preview {theme.name}"
									>
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"
										>
											<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
											<circle cx="12" cy="12" r="3"></circle>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn customizations"
										onclick={() => toggleCustomizations(theme.id)}
										aria-label="View customizations"
									>
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"
										>
											<path d="M12 20h9"></path>
											<path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
										</svg>
									</button>
									<button
										type="button"
										class="action-btn wcag"
										onclick={() => runWCAGValidation(theme)}
										aria-label="Run WCAG validation"
									>
										<svg
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"
										>
											<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
											<polyline points="22 4 12 14.01 9 11.01"></polyline>
										</svg>
									</button>

									<!-- Status change dropdown -->
									<div class="status-actions">
										<button type="button" class="action-btn status" aria-label="Change status">
											<svg
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												aria-hidden="true"
											>
												<circle cx="12" cy="12" r="1"></circle>
												<circle cx="12" cy="5" r="1"></circle>
												<circle cx="12" cy="19" r="1"></circle>
											</svg>
										</button>
										<div class="status-dropdown">
											<button
												type="button"
												class="status-option approve"
												onclick={() => openStatusChangeDialog(theme, "approved")}
											>
												Approve
											</button>
											<button
												type="button"
												class="status-option feature"
												onclick={() => openStatusChangeDialog(theme, "featured")}
											>
												Feature
											</button>
											<button
												type="button"
												class="status-option in-review"
												onclick={() => openStatusChangeDialog(theme, "in_review")}
											>
												Move to In Review
											</button>
											<button
												type="button"
												class="status-option changes"
												onclick={() => openStatusChangeDialog(theme, "changes_requested")}
											>
												Request Changes
											</button>
											<button
												type="button"
												class="status-option reject"
												onclick={() => openStatusChangeDialog(theme, "rejected")}
											>
												Reject
											</button>
										</div>
									</div>
								</div>
							</td>
						</tr>

						<!-- Customizations row -->
						{#if showCustomizations === theme.id}
							<tr class="customizations-row">
								<td colspan="8">
									<div class="customizations-panel">
										<h3>Customizations</h3>

										{#if theme.customColors}
											<div class="customization-section">
												<h4>Colors</h4>
												<div class="color-grid">
													{#each Object.entries(theme.customColors) as [key, value]}
														<div class="color-item">
															<div class="color-swatch" style="background-color: {value}"></div>
															<span class="color-label">{key}</span>
															<span class="color-value">{value}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if theme.customTypography}
											<div class="customization-section">
												<h4>Typography</h4>
												<div class="typography-grid">
													{#each Object.entries(theme.customTypography) as [key, value]}
														<div class="typography-item">
															<span class="typography-label">{key}:</span>
															<span class="typography-value">{value}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if theme.customLayout}
											<div class="customization-section">
												<h4>Layout</h4>
												<div class="layout-grid">
													{#each Object.entries(theme.customLayout) as [key, value]}
														<div class="layout-item">
															<span class="layout-label">{key}:</span>
															<span class="layout-value">{value}</span>
														</div>
													{/each}
												</div>
											</div>
										{/if}

										{#if theme.customCSS}
											<div class="customization-section">
												<h4>Custom CSS</h4>
												<pre class="custom-css">{theme.customCSS}</pre>
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}

						<!-- WCAG results row -->
						{#if wcagResults.has(theme.id)}
							{@const result = wcagResults.get(theme.id)}
							<tr class="wcag-row">
								<td colspan="8">
									<div
										class="wcag-panel"
										class:valid={result?.valid}
										class:invalid={!result?.valid}
									>
										<h3>WCAG Validation Results</h3>

										{#if result?.valid}
											<div class="wcag-success">
												<svg
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													aria-hidden="true"
												>
													<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
													<polyline points="22 4 12 14.01 9 11.01"></polyline>
												</svg>
												<span>Passes WCAG AA contrast requirements</span>
											</div>

											{#if result.warnings && result.warnings.length > 0}
												<div class="wcag-warnings">
													<h4>Warnings:</h4>
													<ul>
														{#each result.warnings as warning}
															<li>{warning}</li>
														{/each}
													</ul>
												</div>
											{/if}
										{:else}
											<div class="wcag-error">
												<svg
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													aria-hidden="true"
												>
													<circle cx="12" cy="12" r="10"></circle>
													<line x1="15" y1="9" x2="9" y2="15"></line>
													<line x1="9" y1="9" x2="15" y2="15"></line>
												</svg>
												<span>{result?.error}</span>
											</div>
										{/if}

										<button
											type="button"
											class="close-wcag"
											onclick={() =>
												wcagResults.delete(theme.id) && (wcagResults = new Map(wcagResults))}
										>
											Close
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Mobile: Card layout -->
		<div class="mobile-view">
			{#each filteredThemes() as theme, index (theme.id)}
				{@const rating = getAverageRating(theme)}
				{@const isCurrent = index === currentThemeIndex}

				<div class="theme-card" class:current={isCurrent} data-theme-index={index}>
					<div class="card-header">
						<input
							type="checkbox"
							checked={selectedThemes.has(theme.id)}
							onchange={() => toggleThemeSelection(theme.id)}
							aria-label="Select {theme.name}"
						/>
						<h3>{theme.name}</h3>
						<span class="status-badge" style="background-color: {getStatusColor(theme.status)}">
							{theme.status.replace("_", " ")}
						</span>
					</div>

					{#if theme.description}
						<p class="description">{theme.description}</p>
					{/if}

					<div class="card-meta">
						<div class="meta-item">
							<strong>Creator:</strong>
							{shortenCreatorId(theme.creatorTenantId)}
						</div>
						<div class="meta-item">
							<strong>Base:</strong> <span class="base-theme-badge">{theme.baseTheme}</span>
						</div>
						<div class="meta-item">
							<strong>Submitted:</strong>
							{formatDate(theme.createdAt)}
						</div>
					</div>

					<div class="card-stats">
						<div class="rating-display">
							<ThemeRating {rating} readonly />
							<span class="rating-text">({theme.ratingCount})</span>
						</div>
						<div class="downloads">
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="7 10 12 15 17 10"></polyline>
								<line x1="12" y1="15" x2="12" y2="3"></line>
							</svg>
							{theme.downloads.toLocaleString()}
						</div>
					</div>

					{#if theme.tags && theme.tags.length > 0}
						<div class="tags">
							{#each theme.tags as tag}
								<span class="tag">{tag}</span>
							{/each}
						</div>
					{/if}

					<div class="card-actions">
						<button type="button" class="card-action-btn" onclick={() => handlePreview(theme)}>
							Preview
						</button>
						<button
							type="button"
							class="card-action-btn"
							onclick={() => toggleCustomizations(theme.id)}
						>
							Customizations
						</button>
						<button type="button" class="card-action-btn" onclick={() => runWCAGValidation(theme)}>
							WCAG Check
						</button>
					</div>

					<div class="card-status-actions">
						<button
							type="button"
							class="status-action-btn approve"
							onclick={() => openStatusChangeDialog(theme, "approved")}
						>
							Approve
						</button>
						<button
							type="button"
							class="status-action-btn feature"
							onclick={() => openStatusChangeDialog(theme, "featured")}
						>
							Feature
						</button>
						<button
							type="button"
							class="status-action-btn changes"
							onclick={() => openStatusChangeDialog(theme, "changes_requested")}
						>
							Request Changes
						</button>
						<button
							type="button"
							class="status-action-btn reject"
							onclick={() => openStatusChangeDialog(theme, "rejected")}
						>
							Reject
						</button>
					</div>

					<!-- Customizations panel (mobile) -->
					{#if showCustomizations === theme.id}
						<div class="customizations-panel mobile">
							<h4>Customizations</h4>

							{#if theme.customColors}
								<div class="customization-section">
									<h5>Colors</h5>
									<div class="color-grid">
										{#each Object.entries(theme.customColors) as [key, value]}
											<div class="color-item">
												<div class="color-swatch" style="background-color: {value}"></div>
												<span class="color-label">{key}</span>
												<span class="color-value">{value}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if theme.customTypography}
								<div class="customization-section">
									<h5>Typography</h5>
									<div class="typography-grid">
										{#each Object.entries(theme.customTypography) as [key, value]}
											<div class="typography-item">
												<span class="typography-label">{key}:</span>
												<span class="typography-value">{value}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if theme.customLayout}
								<div class="customization-section">
									<h5>Layout</h5>
									<div class="layout-grid">
										{#each Object.entries(theme.customLayout) as [key, value]}
											<div class="layout-item">
												<span class="layout-label">{key}:</span>
												<span class="layout-value">{value}</span>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if theme.customCSS}
								<div class="customization-section">
									<h5>Custom CSS</h5>
									<pre class="custom-css">{theme.customCSS}</pre>
								</div>
							{/if}
						</div>
					{/if}

					<!-- WCAG results (mobile) -->
					{#if wcagResults.has(theme.id)}
						{@const result = wcagResults.get(theme.id)}
						<div
							class="wcag-panel mobile"
							class:valid={result?.valid}
							class:invalid={!result?.valid}
						>
							<h4>WCAG Validation</h4>

							{#if result?.valid}
								<div class="wcag-success">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
										<polyline points="22 4 12 14.01 9 11.01"></polyline>
									</svg>
									<span>Passes WCAG AA</span>
								</div>

								{#if result.warnings && result.warnings.length > 0}
									<div class="wcag-warnings">
										<h5>Warnings:</h5>
										<ul>
											{#each result.warnings as warning}
												<li>{warning}</li>
											{/each}
										</ul>
									</div>
								{/if}
							{:else}
								<div class="wcag-error">
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										aria-hidden="true"
									>
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="15" y1="9" x2="9" y2="15"></line>
										<line x1="9" y1="9" x2="15" y2="15"></line>
									</svg>
									<span>{result?.error}</span>
								</div>
							{/if}

							<button
								type="button"
								class="close-wcag"
								onclick={() => wcagResults.delete(theme.id) && (wcagResults = new Map(wcagResults))}
							>
								Close
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Preview Modal -->
{#if showPreviewModal && previewTheme}
	<div
		class="modal-overlay"
		onclick={closePreviewModal}
		onkeydown={handleModalKeydown}
		role="presentation"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-labelledby="preview-title"
		>
			<div class="modal-header">
				<h2 id="preview-title">Preview: {previewTheme.name}</h2>
				<button
					type="button"
					class="modal-close"
					onclick={closePreviewModal}
					aria-label="Close preview"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<!-- Create a Theme object for preview -->
				{@const previewThemeObj = {
					id: previewTheme.id,
					name: previewTheme.name,
					description: previewTheme.description || "",
					thumbnail: "",
					tier: "oak",
					colors: {
						background: previewTheme.customColors?.background || "#ffffff",
						surface: previewTheme.customColors?.surface || "#f5f5f5",
						foreground: previewTheme.customColors?.foreground || "#111111",
						foregroundMuted: previewTheme.customColors?.foregroundMuted || "#666666",
						accent: previewTheme.customColors?.accent || "#16a34a",
						border: previewTheme.customColors?.border || "#e5e5e5",
					},
					fonts: {
						heading: previewTheme.customTypography?.heading || "system-ui",
						body: previewTheme.customTypography?.body || "system-ui",
						mono: previewTheme.customTypography?.mono || "monospace",
					},
					layout: {
						type: previewTheme.customLayout?.type || "sidebar",
						maxWidth: previewTheme.customLayout?.maxWidth || "1200px",
						spacing: previewTheme.customLayout?.spacing || "comfortable",
					},
				}}

				<ThemePreview theme={previewThemeObj} />

				<div class="preview-meta">
					<p><strong>Base Theme:</strong> {previewTheme.baseTheme}</p>
					<p><strong>Creator:</strong> {previewTheme.creatorTenantId}</p>
					{#if previewTheme.description}
						<p><strong>Description:</strong> {previewTheme.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Status Change Modal -->
{#if statusChangeTheme && statusChangeAction}
	<div
		class="modal-overlay"
		onclick={closeStatusChangeDialog}
		onkeydown={handleModalKeydown}
		role="presentation"
	>
		<div
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-labelledby="status-change-title"
		>
			<div class="modal-header">
				<h2 id="status-change-title">
					{statusChangeAction === "approved"
						? "Approve Theme"
						: statusChangeAction === "featured"
							? "Feature Theme"
							: statusChangeAction === "in_review"
								? "Move to In Review"
								: statusChangeAction === "changes_requested"
									? "Request Changes"
									: statusChangeAction === "rejected"
										? "Reject Theme"
										: "Change Status"}
				</h2>
				<button
					type="button"
					class="modal-close"
					onclick={closeStatusChangeDialog}
					aria-label="Close dialog"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<p>Theme: <strong>{statusChangeTheme.name}</strong></p>

				{#if statusChangeAction === "changes_requested" || statusChangeAction === "rejected"}
					<div class="reason-field">
						<label for="status-reason">
							Reason {statusChangeAction === "rejected" ? "(required)" : ""}:
						</label>
						<textarea
							id="status-reason"
							bind:value={statusChangeReason}
							placeholder="Explain why this action is being taken..."
							rows="4"
						></textarea>
					</div>
				{/if}

				<div class="modal-actions">
					<button type="button" class="modal-btn cancel" onclick={closeStatusChangeDialog}>
						Cancel
					</button>
					<button type="button" class="modal-btn confirm" onclick={confirmStatusChange}>
						Confirm
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.moderation-queue {
		font-family: var(--font-body, system-ui, sans-serif);
		padding: 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	.queue-header {
		margin-bottom: 2rem;
	}

	.queue-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--color-foreground-muted, #666);
		margin: 0;
	}

	/* Controls */
	.controls {
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-bar {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-foreground-muted, #666);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent);
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
	}

	.results-count {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface, #f5f5f5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground-muted, #666);
	}

	/* Bulk actions */
	.bulk-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-surface, #f5f5f5);
		border-radius: 0.5rem;
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.selected-count {
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.bulk-action-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.bulk-action-btn.approve {
		background: #16a34a;
		color: #fff;
	}

	.bulk-action-btn.approve:hover {
		background: #15803d;
	}

	.bulk-action-btn.reject {
		background: #dc2626;
		color: #fff;
	}

	.bulk-action-btn.reject:hover {
		background: #b91c1c;
	}

	.bulk-action-btn.clear {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.bulk-action-btn.clear:hover {
		background: var(--color-surface, #f5f5f5);
	}

	/* Keyboard hint */
	.keyboard-hint {
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	kbd {
		padding: 0.125rem 0.375rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
	}

	/* No results */
	.no-results {
		text-align: center;
		padding: 3rem 1.5rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Desktop view - Table */
	.mobile-view {
		display: none;
	}

	.themes-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.themes-table thead {
		background: var(--color-surface, #f5f5f5);
	}

	.themes-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		border-bottom: 2px solid var(--color-border, #e5e5e5);
	}

	.themes-table td {
		padding: 1rem;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.theme-row:hover {
		background: var(--color-surface, #f9fafb);
	}

	.theme-row.current {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 10%, transparent);
	}

	.checkbox-col {
		width: 3rem;
	}

	.theme-info-col {
		min-width: 250px;
	}

	.theme-name {
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.theme-description {
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
		margin-bottom: 0.5rem;
	}

	.creator-id {
		font-family: var(--font-mono, monospace);
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
	}

	.base-theme-badge {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
		text-transform: capitalize;
	}

	.stats-col {
		min-width: 150px;
	}

	.stats {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rating-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.rating-text {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.downloads {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.downloads svg {
		width: 1rem;
		height: 1rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	.tag {
		padding: 0.125rem 0.5rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-size: 0.6875rem;
	}

	/* Actions */
	.actions-col {
		min-width: 180px;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.action-btn {
		padding: 0.5rem;
		background: transparent;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn svg {
		width: 1.125rem;
		height: 1.125rem;
		color: var(--color-foreground, #111);
	}

	.action-btn:hover {
		background: var(--color-surface, #f5f5f5);
		border-color: var(--color-foreground-muted, #999);
	}

	.action-btn:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
	}

	/* Status actions dropdown */
	.status-actions {
		position: relative;
	}

	.status-dropdown {
		display: none;
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: 0.25rem;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		z-index: 10;
		min-width: 180px;
	}

	.status-actions:hover .status-dropdown,
	.status-actions:focus-within .status-dropdown {
		display: block;
	}

	.status-option {
		display: block;
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.status-option:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.status-option.approve {
		color: #16a34a;
	}

	.status-option.feature {
		color: #9333ea;
	}

	.status-option.in-review {
		color: #3b82f6;
	}

	.status-option.changes {
		color: #ea580c;
	}

	.status-option.reject {
		color: #dc2626;
	}

	/* Customizations panel */
	.customizations-row,
	.wcag-row {
		background: var(--color-surface, #f9fafb);
	}

	.customizations-panel,
	.wcag-panel {
		padding: 1.5rem;
	}

	.customizations-panel h3,
	.wcag-panel h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.customization-section {
		margin-bottom: 1.5rem;
	}

	.customization-section h4,
	.customization-section h5 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.75rem 0;
		color: var(--color-foreground-muted, #666);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.color-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 0.75rem;
	}

	.color-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.color-swatch {
		width: 2rem;
		height: 2rem;
		border-radius: 0.25rem;
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.color-label {
		font-size: 0.8125rem;
		font-weight: 500;
	}

	.color-value {
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.typography-grid,
	.layout-grid {
		display: grid;
		gap: 0.5rem;
	}

	.typography-item,
	.layout-item {
		font-size: 0.875rem;
	}

	.typography-label,
	.layout-label {
		font-weight: 600;
		margin-right: 0.5rem;
	}

	.typography-value,
	.layout-value {
		font-family: var(--font-mono, monospace);
		color: var(--color-foreground-muted, #666);
	}

	.custom-css {
		padding: 1rem;
		background: var(--color-background, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
		overflow-x: auto;
		max-height: 300px;
		overflow-y: auto;
	}

	/* WCAG panel */
	.wcag-panel.valid {
		border: 2px solid #16a34a;
	}

	.wcag-panel.invalid {
		border: 2px solid #dc2626;
	}

	.wcag-success,
	.wcag-error {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.375rem;
		margin-bottom: 1rem;
	}

	.wcag-success {
		background: color-mix(in srgb, #16a34a 10%, transparent);
		color: #15803d;
	}

	.wcag-success svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.wcag-error {
		background: color-mix(in srgb, #dc2626 10%, transparent);
		color: #b91c1c;
	}

	.wcag-error svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.wcag-warnings {
		margin-top: 1rem;
	}

	.wcag-warnings h4 {
		font-size: 0.875rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.wcag-warnings ul {
		margin: 0;
		padding-left: 1.5rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	.wcag-warnings li {
		margin-bottom: 0.25rem;
	}

	.close-wcag {
		padding: 0.5rem 1rem;
		background: transparent;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.close-wcag:hover {
		background: var(--color-surface, #f5f5f5);
	}

	/* Mobile view - Cards */
	@media (max-width: 1024px) {
		.desktop-view {
			display: none;
		}

		.mobile-view {
			display: block;
		}

		.theme-card {
			background: var(--color-surface, #fff);
			border: 2px solid var(--color-border, #e5e5e5);
			border-radius: 0.75rem;
			padding: 1rem;
			margin-bottom: 1rem;
		}

		.theme-card.current {
			background: color-mix(in srgb, var(--color-accent, #16a34a) 10%, transparent);
		}

		.card-header {
			display: flex;
			align-items: start;
			gap: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.card-header h3 {
			flex: 1;
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0;
		}

		.card-header input[type="checkbox"] {
			margin-top: 0.25rem;
		}

		.description {
			font-size: 0.875rem;
			color: var(--color-foreground-muted, #666);
			margin: 0 0 1rem 0;
			line-height: 1.5;
		}

		.card-meta {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin-bottom: 1rem;
			font-size: 0.875rem;
		}

		.meta-item strong {
			font-weight: 600;
		}

		.card-stats {
			display: flex;
			align-items: center;
			gap: 1rem;
			margin-bottom: 1rem;
		}

		.card-actions {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 0.5rem;
			margin-bottom: 0.75rem;
		}

		.card-action-btn {
			padding: 0.5rem;
			background: var(--color-accent, #16a34a);
			color: #fff;
			border: none;
			border-radius: 0.375rem;
			font-size: 0.875rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.card-action-btn:hover {
			background: color-mix(in srgb, var(--color-accent, #16a34a) 85%, black);
		}

		.card-status-actions {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.status-action-btn {
			padding: 0.5rem;
			border: 2px solid;
			border-radius: 0.375rem;
			font-size: 0.75rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.status-action-btn.approve {
			border-color: #16a34a;
			color: #16a34a;
			background: transparent;
		}

		.status-action-btn.approve:hover {
			background: #16a34a;
			color: #fff;
		}

		.status-action-btn.feature {
			border-color: #9333ea;
			color: #9333ea;
			background: transparent;
		}

		.status-action-btn.feature:hover {
			background: #9333ea;
			color: #fff;
		}

		.status-action-btn.changes {
			border-color: #ea580c;
			color: #ea580c;
			background: transparent;
		}

		.status-action-btn.changes:hover {
			background: #ea580c;
			color: #fff;
		}

		.status-action-btn.reject {
			border-color: #dc2626;
			color: #dc2626;
			background: transparent;
		}

		.status-action-btn.reject:hover {
			background: #dc2626;
			color: #fff;
		}

		.customizations-panel.mobile,
		.wcag-panel.mobile {
			margin-top: 1rem;
			padding: 1rem;
			background: var(--color-surface, #f9fafb);
			border-radius: 0.5rem;
			border: 2px solid var(--color-border, #e5e5e5);
		}

		.customizations-panel.mobile h4,
		.wcag-panel.mobile h4 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0 0 1rem 0;
		}
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-surface, #fff);
		border-radius: 0.75rem;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 2px solid var(--color-border, #e5e5e5);
	}

	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.modal-close {
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		border-radius: 0.25rem;
	}

	.modal-close:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.modal-close svg {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-foreground, #111);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.preview-meta {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 2px solid var(--color-border, #e5e5e5);
	}

	.preview-meta p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
	}

	.reason-field {
		margin: 1.5rem 0;
	}

	.reason-field label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.reason-field textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: inherit;
		font-size: 0.875rem;
		resize: vertical;
	}

	.reason-field textarea:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a);
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	.modal-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-btn.cancel {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.modal-btn.cancel:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.modal-btn.confirm {
		background: var(--color-accent, #16a34a);
		color: #fff;
	}

	.modal-btn.confirm:hover {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 85%, black);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}

	@media (prefers-contrast: high) {
		.theme-row,
		.theme-card {
			border-width: 3px;
		}
	}
</style>
