<script lang="ts">
	/**
	 * PricingFineprint
	 *
	 * Expandable fine print sections explaining pricing details.
	 * Glassmorphism styled with collapsible sections.
	 */

	import type { PricingFineprintProps, FineprintSection } from "./types.js";
	import { GroveText } from "../../ui/components/ui";

	let {
		sections,
		defaultExpanded = false,
		class: className = "",
	}: PricingFineprintProps = $props();

	// All available sections with their content
	const SECTIONS: Record<
		FineprintSection,
		{ title: string; content: string; detail?: string }
	> = {
		reading: {
			title: "Reading Blogs",
			content:
				"Everyone can read Grove blogs—no login required. All blogs are publicly accessible by default. [[meadow|Meadow]] (the community feed) requires a free account to browse. Only [[rooted|Rooted]] [[evergreen|Evergreens]] can choose to make their blog require login to view.",
			detail:
				"When you publish a post, it becomes visible to anyone on the internet, indexed by search engines, and shareable via direct links. This is by design—Grove is about sharing your voice with the world.",
		},
		free: {
			title: "Wanderer Accounts",
			content:
				"Wanderer accounts get 25 blog posts and 100 MB storage — enough to try your hand at writing with no commitment. [[meadow|Meadow]] access for browsing and reacting. No credit card needed. When you're ready for more room, cultivate to [[seedling|Seedling]].",
		},
		// TODO(foliage): update content when themes launch
		themes: {
			title: "Themes",
			content:
				"Themes are coming soon. Every blog currently uses Grove's default theme with accent color customization. When themes launch, [[seedling|Seedling]] gets 3 curated themes, [[sapling|Sapling]] gets all 10, and [[oak|Oak]]+ gets the full theme customizer.",
		},
		curios: {
			title: "Curios",
			content:
				"Every blog includes Home, Blog, and About in the navigation. [[curios|Curios]] let you add custom pages (like Portfolio, Contact, or Gallery) to your site navigation—little treasures in your cabinet of wonders. [[sapling|Sapling]]: 3 curios. [[oak|Oak]]: 5 curios. [[evergreen|Evergreen]]: 8 curios.",
			detail:
				"Those on [[seedling|Seedling]] can still create unlimited pages—they just won't appear in the navigation bar. Link to them from posts or your About page.",
		},
		comments: {
			title: "Comments",
			content:
				"Grove supports Replies (private, only the author sees) and Comments (public, after author approval). Free accounts can post 20 public comments per week—the [[rooted|Rooted]] get unlimited. Private replies are rate-limited for free accounts to reduce spam.",
		},
		domains: {
			title: "Custom Domains",
			content:
				"[[oak|Oak]] (BYOD): Bring a domain you already own at no extra cost. [[evergreen|Evergreen]]: We find and register the perfect domain for you. Registration included for domains up to $100/year.",
		},
		email: {
			title: "@grove.place Email",
			content:
				"Forward: Emails to you@grove.place forward to your personal inbox. Full: Send and receive as you@grove.place — a professional email address included with your blog.",
		},
		support: {
			title: "Support Hours (Evergreen)",
			content:
				"[[evergreen|Evergreen]] includes 8 hours of hands-on support in your first month — setup help, customization, whatever you need. After that, priority email support with faster response times.",
		},
		centennial: {
			title: "Centennial (Sapling+)",
			content:
				"Your grove can outlive you. After 12 cumulative months on [[sapling|Sapling]] or above, your site earns [[centennial|Centennial]] status — it stays online for 100 years from the day you planted it. Even if you stop paying, your words remain as a read-only archive.",
			detail:
				"A hundred years is roughly how long an oak tree lives. Some trees outlive the people who planted them.",
		},
		included: {
			title: "What's Included in Every Paid Tier",
			content:
				"Markdown blog posts with live preview, image hosting with automatic WebP compression, [[vines|Vines]] (sidebar links on your posts), global CDN delivery via Cloudflare, SSL/HTTPS included, data export anytime — your content is yours, RSS feed for your blog, no ads, no tracking of your readers.",
		},
		ownership: {
			title: "Your Data, Your Ownership",
			content:
				"Grove is designed around portability. Export everything at any time. If we ever register a domain for you, you own it — transfer it whenever you want, no fees, no questions.",
		},
		ai: {
			title: "AI Protection",
			content:
				"Every Grove blog is protected by [[shade|Shade]] — our defense against AI crawlers, scrapers, and training bots. Your words are yours, and they're never used to train AI models. This protection is active on every tier, free and paid.",
			detail:
				"We're building writing tools that help polish your voice without replacing it — grammar checks, readability scoring, and more. They're not ready yet, and when they arrive, they'll be available to paid tiers. For now, [[shade|Shade]] keeps your content safe.",
		},
		api: {
			title: "API Access",
			content:
				"API access for custom integrations and automated publishing is planned for [[oak|Oak]] and [[evergreen|Evergreen]] tiers. All blogs are accessible via RSS feeds and standard web protocols today.",
		},
	};

	// Which sections to display (reactive to prop changes)
	const displaySections = $derived(
		sections ?? (Object.keys(SECTIONS) as FineprintSection[]),
	);

	// Track expanded state for each section
	// Initialize once from initial prop values (captured at mount time)
	const initialSections = sections ?? (Object.keys(SECTIONS) as FineprintSection[]);
	let expandedSections = $state<Set<FineprintSection>>(
		defaultExpanded
			? new Set(initialSections)
			: new Set<FineprintSection>(),
	);

	function toggleSection(section: FineprintSection) {
		if (expandedSections.has(section)) {
			expandedSections.delete(section);
			expandedSections = new Set(expandedSections);
		} else {
			expandedSections.add(section);
			expandedSections = new Set(expandedSections);
		}
	}
</script>

<div
	class="bg-white/80 dark:bg-grove-950/25 backdrop-blur-md rounded-xl p-8 border border-white/40 dark:border-grove-800/25 shadow-sm {className}"
>
	<h2 class="text-xl font-serif text-foreground mb-6">The Fine Print</h2>

	<div class="space-y-4 text-sm font-sans text-foreground-muted">
		{#each displaySections as sectionKey}
			{@const section = SECTIONS[sectionKey]}
			{@const isExpanded = expandedSections.has(sectionKey)}

			<div class="border-b border-subtle last:border-0 pb-4 last:pb-0">
				<button
					type="button"
					onclick={() => toggleSection(sectionKey)}
					class="w-full flex items-center justify-between text-left group"
				>
					<h3
						class="font-medium text-foreground group-hover:text-accent transition-colors"
					>
						{section.title}
					</h3>
					<svg
						class="w-4 h-4 text-foreground-faint transition-transform duration-200 {isExpanded
							? 'rotate-180'
							: ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</button>

				{#if isExpanded}
					<div class="mt-3 space-y-2">
						<p><GroveText content={section.content} /></p>
						{#if section.detail}
							<p class="text-xs text-foreground-faint"><GroveText content={section.detail} /></p>
						{/if}
					</div>
				{/if}
			</div>
		{/each}

		<!-- Data portability link -->
		<div class="pt-4 border-t border-default">
			<p>
				See our <a
					href="/knowledge/legal/data-portability-separation"
					class="text-accent-muted hover:text-accent underline"
				>
					Data Portability Policy
				</a> for details on data ownership.
			</p>
		</div>
	</div>
</div>
