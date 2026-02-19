<!--
  CategoryNav - Floating navigation for category-based pages

  Provides two navigation modes:
  - Desktop: Fixed right-side icon navigation with optional hover-reveal items
  - Mobile: FAB button with dropdown menu

  Usage examples:

  Simple (help page - no hover items):
  <CategoryNav
    sections={sections.map(s => ({ id: s.id, name: s.name, icon: getIcon(s.icon), itemCount: 5 }))}
    color="emerald"
    mobileTitle="Sections"
  />

  With hover items (specs/exhibit pages):
  <CategoryNav
    sections={categories.map(c => ({ id: c.id, name: c.name, icon: getIcon(c.icon) }))}
    items={Object.fromEntries(
      categories.map(c => [c.id, specs.filter(s => s.category === c.id)])
    )}
    getItemHref={(item) => `/knowledge/specs/${item.id}`}
    color="violet"
  />
-->
<script lang="ts">
	import type { CategoryNavSection, CategoryNavItem } from "./types.js";
	import { isValidIcon } from "./types.js";

	// Props
	interface Props {
		/** Required: Sections to display as navigation icons */
		sections: CategoryNavSection[];
		/** Optional: Items per section (enables hover-reveal chips on desktop) */
		items?: Record<string, CategoryNavItem[]>;
		/** Function to generate section anchor href. Default: `#${slugify(section.name)}` */
		getSectionHref?: (section: CategoryNavSection) => string;
		/** Function to generate item href. Required if items prop is used */
		getItemHref?: (item: CategoryNavItem, section: CategoryNavSection) => string;
		/** Color scheme: 'emerald' (green) or 'violet' (purple) */
		color?: "emerald" | "violet";
		/** Title shown in mobile dropdown header */
		mobileTitle?: string;
		/** Max number of items to show in hover reveal (default: 6) */
		maxHoverItems?: number;
		/** Whether to show hover items (default: true if items provided) */
		showHoverItems?: boolean;
		/** Accessible label for the navigation landmark */
		ariaLabel?: string;
	}

	let {
		sections,
		items = {},
		getSectionHref = defaultGetSectionHref,
		getItemHref,
		color = "emerald",
		mobileTitle = "Navigate",
		maxHoverItems = 6,
		showHoverItems = true,
		ariaLabel = "Section navigation",
	}: Props = $props();

	// Mobile menu state
	let isMobileOpen = $state(false);
	let dropdownRef: HTMLDivElement | null = $state(null);

	// Focus first link when dropdown opens
	$effect(() => {
		if (isMobileOpen && dropdownRef) {
			// Small delay to ensure DOM is ready
			requestAnimationFrame(() => {
				const firstLink = dropdownRef?.querySelector("a");
				firstLink?.focus();
			});
		}
	});

	// Handle Escape key and click-outside to close dropdown
	$effect(() => {
		if (!isMobileOpen) return;

		function handleKeydown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				isMobileOpen = false;
			}
		}

		function handleClickOutside(e: MouseEvent) {
			const target = e.target as Node;
			// Check if click is outside both the dropdown and the FAB button
			if (dropdownRef && !dropdownRef.contains(target)) {
				const fabButton = dropdownRef.previousElementSibling;
				if (!fabButton?.contains(target)) {
					isMobileOpen = false;
				}
			}
		}

		document.addEventListener("keydown", handleKeydown);
		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("keydown", handleKeydown);
			document.removeEventListener("click", handleClickOutside);
		};
	});

	// Color scheme classes
	const colorSchemes = {
		emerald: {
			iconText: "text-emerald-600 dark:text-emerald-400",
			hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
			focusRing: "focus-visible:ring-emerald-500",
			border: "border-emerald-200 dark:border-cream-200",
			buttonBg: "bg-emerald-500 hover:bg-emerald-600",
			mobileHover:
				"hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus-visible:bg-emerald-50 dark:focus-visible:bg-emerald-900/20",
			chipText: "text-emerald-600 dark:text-emerald-400",
			chipHover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
		},
		violet: {
			iconText: "text-violet-600 dark:text-violet-400",
			hoverBg: "hover:bg-violet-100 dark:hover:bg-violet-900/30",
			focusRing: "focus-visible:ring-violet-500",
			border: "border-violet-200 dark:border-cream-200",
			buttonBg: "bg-violet-500 hover:bg-violet-600",
			mobileHover:
				"hover:bg-violet-50 dark:hover:bg-violet-900/20 focus-visible:bg-violet-50 dark:focus-visible:bg-violet-900/20",
			chipText: "text-violet-600 dark:text-violet-400",
			chipHover: "hover:bg-violet-100 dark:hover:bg-violet-900/30",
		},
	} as const;

	const colors = $derived(colorSchemes[color]);

	// Default href generator - slugifies section name
	function defaultGetSectionHref(section: CategoryNavSection): string {
		return `#${section.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
	}

	// Get item count for a section (from items prop or section.itemCount)
	function getItemCount(section: CategoryNavSection): number {
		if (items[section.id]) {
			return items[section.id].length;
		}
		return section.itemCount ?? 0;
	}

	// Check if section has items to show on hover
	function hasHoverItems(section: CategoryNavSection): boolean {
		return showHoverItems && items[section.id]?.length > 0;
	}

	// Close mobile menu on navigation
	function handleMobileClick() {
		isMobileOpen = false;
	}
</script>

<!-- Desktop: Fixed right-side icon navigation -->
<nav
	class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-2"
	aria-label={ariaLabel}
>
	{#each sections as section}
		{@const SectionIcon = isValidIcon(section.icon) ? section.icon : null}
		{@const sectionItems = items[section.id] ?? []}
		{@const itemCount = getItemCount(section)}

		<div class="relative group">
			<!-- Section icon button -->
			<a
				href={getSectionHref(section)}
				class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-cream-100 shadow-md {colors.border} {colors.hoverBg} focus-visible:outline-none focus-visible:ring-2 {colors.focusRing} focus-visible:ring-offset-2 transition-all duration-200 motion-reduce:transition-none"
				aria-label="Jump to {section.name}"
				title="{section.name}{itemCount > 0 ? ` (${itemCount})` : ''}"
			>
				{#if SectionIcon}
					<SectionIcon
						class="w-5 h-5 {colors.iconText} group-hover:scale-110 motion-reduce:group-hover:scale-100 transition-transform motion-reduce:transition-none"
					/>
				{:else}
					<span class="w-5 h-5 rounded-full bg-current opacity-50"></span>
				{/if}
			</a>

			<!-- Hover reveal: Section name tooltip (when no items) -->
			{#if !hasHoverItems(section)}
				<div
					class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 motion-reduce:transition-none"
				>
					<div
						class="px-3 py-1.5 rounded-lg bg-white dark:bg-cream-100 shadow-md {colors.border} text-sm font-medium text-foreground whitespace-nowrap"
					>
						{section.name}
						{#if itemCount > 0}
							<span class="text-foreground-muted">({itemCount})</span>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Hover reveal: Item chips (when items provided) -->
			{#if hasHoverItems(section)}
				<div
					class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 motion-reduce:transition-none flex items-center gap-2 flex-wrap justify-end max-w-xs"
				>
					{#each sectionItems.slice(0, maxHoverItems) as item}
						{@const ItemIcon = isValidIcon(item.icon) ? item.icon : null}
						<a
							href={getItemHref ? getItemHref(item, section) : `#${item.id}`}
							class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-cream-100 shadow-md {colors.border} {colors.chipText} {colors.chipHover} focus-visible:outline-none focus-visible:ring-2 {colors.focusRing} transition-colors motion-reduce:transition-none whitespace-nowrap"
							title={item.description}
						>
							{#if ItemIcon}
								<ItemIcon class="w-3.5 h-3.5" />
							{/if}
							<span class="text-xs font-medium">{item.title}</span>
						</a>
					{/each}
					{#if sectionItems.length > maxHoverItems}
						<span class="text-xs text-foreground-muted"
							>+{sectionItems.length - maxHoverItems} more</span
						>
					{/if}
				</div>
			{/if}
		</div>
	{/each}
</nav>

<!-- Mobile: FAB button with dropdown -->
<div class="fixed bottom-6 right-6 z-grove-fab lg:hidden">
	<button
		type="button"
		onclick={() => (isMobileOpen = !isMobileOpen)}
		class="w-12 h-12 rounded-full {colors.buttonBg} text-white shadow-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 {colors.focusRing} focus-visible:ring-offset-2 transition-colors motion-reduce:transition-none"
		aria-expanded={isMobileOpen}
		aria-label="Table of contents"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M4 6h16M4 12h16M4 18h7"
			/>
		</svg>
	</button>

	{#if isMobileOpen}
		<div
			bind:this={dropdownRef}
			class="absolute bottom-16 right-0 w-72 bg-white dark:bg-cream-100 rounded-xl shadow-xl {colors.border} overflow-hidden max-h-[70vh] overflow-y-auto"
		>
			<!-- Header -->
			<div
				class="px-4 py-3 {colors.border} border-b flex items-center justify-between sticky top-0 bg-white dark:bg-cream-100"
			>
				<span class="font-medium text-foreground">{mobileTitle}</span>
				<button
					type="button"
					onclick={() => (isMobileOpen = false)}
					class="text-foreground-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 {colors.focusRing} rounded transition-colors motion-reduce:transition-none"
					aria-label="Close"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- Section list -->
			<div class="py-2">
				{#each sections as section}
					{@const SectionIcon = isValidIcon(section.icon) ? section.icon : null}
					{@const itemCount = getItemCount(section)}

					<a
						href={getSectionHref(section)}
						onclick={handleMobileClick}
						class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground {colors.mobileHover} focus-visible:outline-none focus-visible:text-foreground transition-colors motion-reduce:transition-none"
					>
						{#if SectionIcon}
							<SectionIcon class="w-5 h-5 {colors.iconText}" />
						{:else}
							<span class="w-5 h-5 rounded-full bg-current opacity-50"></span>
						{/if}
						<span class="font-medium">{section.name}</span>
						{#if itemCount > 0}
							<span class="ml-auto text-xs text-foreground-faint">{itemCount}</span>
						{/if}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
