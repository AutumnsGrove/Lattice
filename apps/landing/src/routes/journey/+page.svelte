<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { GroveTerm } from '@autumnsgrove/lattice/ui';
	import SEO from '$lib/components/SEO.svelte';
	import { Tag, Sprout, ChevronDown, Sparkles, Wrench, List } from 'lucide-svelte';
	import { formatNumber, formatBytes, getGrowthIcon } from '$lib/utils/journey';

	// Floating TOC state
	let tocOpen = $state(false);
	let activeSection = $state('');

	// Define the sections for the TOC
	const sections = [
		{ id: 'current-growth', text: 'Current Growth' },
		{ id: 'code-composition', text: 'Code Composition' },
		{ id: 'growth-over-time', text: 'Growth Over Time' },
		{ id: 'documentation', text: 'Documentation' },
		{ id: 'doc-insights', text: 'Doc Insights' },
		{ id: 'milestones', text: 'Milestones' },
		{ id: 'package-size', text: 'Package Size' }
	];

	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (element) {
			const offset = 80;
			const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
			window.scrollTo({
				top: elementPosition - offset,
				behavior: 'smooth'
			});
			history.pushState(null, '', `#${id}`);
		}
		tocOpen = false;
	}

	// Set up intersection observer for active section tracking
	$effect(() => {
		if (typeof window === 'undefined') return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
					}
				});
			},
			{ rootMargin: '-20% 0% -60% 0%', threshold: 0 }
		);

		sections.forEach((section) => {
			const element = document.getElementById(section.id);
			if (element) observer.observe(element);
		});

		return () => observer.disconnect();
	});

	let { data } = $props();

	// Get summary for a version label
	function getSummary(label: string) {
		return data.summaries[label] || null;
	}

	// Calculate percentages for the language bar
	// Colors from Grove palettes — each language gets a unique, visually distinct color:
	// - TypeScript: accents.water.deep (deep blue)
	// - Svelte: autumn vermillion (warm orange-red)
	// - Python: grove meadow green
	// - Go: accents.sky.surface (sky blue, distinct from TS deep blue)
	// - SQL: spring crocus violet
	// - JavaScript: autumn amber (warm yellow)
	// - CSS: cherryBlossoms.light (blossom pink)
	// - Shell: earth.stone (warm gray)
	// - TSX: autumn.rose (coral red)
	const languageBreakdown = $derived(() => {
		if (!data.latest) return [];
		const total = data.latest.totalCodeLines;
		if (total === 0) return [];
		return [
			{ name: 'TypeScript', lines: data.latest.tsLines, color: 'bg-[#0284c7]', pct: Math.round((data.latest.tsLines / total) * 100) },
			{ name: 'Svelte', lines: data.latest.svelteLines, color: 'bg-[#e54d2e]', pct: Math.round((data.latest.svelteLines / total) * 100) },
			{ name: 'Python', lines: data.latest.pyLines, color: 'bg-[#22c55e]', pct: Math.round((data.latest.pyLines / total) * 100) },
			{ name: 'Go', lines: data.latest.goLines, color: 'bg-[#7dd3fc]', pct: Math.round((data.latest.goLines / total) * 100) },
			{ name: 'SQL', lines: data.latest.sqlLines, color: 'bg-[#a78bfa]', pct: Math.round((data.latest.sqlLines / total) * 100) },
			{ name: 'JavaScript', lines: data.latest.jsLines, color: 'bg-[#f59e0b]', pct: Math.round((data.latest.jsLines / total) * 100) },
			{ name: 'CSS', lines: data.latest.cssLines, color: 'bg-[#f472b6]', pct: Math.round((data.latest.cssLines / total) * 100) },
			{ name: 'Shell', lines: data.latest.shLines, color: 'bg-[#78716c]', pct: Math.round((data.latest.shLines / total) * 100) },
			{ name: 'TSX', lines: data.latest.tsxLines, color: 'bg-[#f43f5e]', pct: Math.round((data.latest.tsxLines / total) * 100) }
		].filter(lang => lang.lines > 0);
	});

	// Get max values for chart scaling
	const maxCodeLines = $derived(
		data.snapshots.length > 0
			? Math.max(...data.snapshots.map((s: any) => s.totalCodeLines))
			: 0
	);

	// Filter milestones to only show version releases
	const milestones = $derived(
		data.snapshots.filter((s: any) => s.label.startsWith('v'))
	);

	// Calculate language breakdown for a given snapshot
	// Uses same Grove palette colors as languageBreakdown
	function getSnapshotBreakdown(snapshot: any) {
		const total = snapshot.totalCodeLines;
		if (total === 0) return [];
		return [
			{ name: 'TypeScript', pct: Math.round((snapshot.tsLines / total) * 100), color: 'bg-[#0284c7]' },
			{ name: 'Svelte', pct: Math.round((snapshot.svelteLines / total) * 100), color: 'bg-[#e54d2e]' },
			{ name: 'Python', pct: Math.round(((snapshot.pyLines || 0) / total) * 100), color: 'bg-[#22c55e]' },
			{ name: 'Go', pct: Math.round(((snapshot.goLines || 0) / total) * 100), color: 'bg-[#7dd3fc]' },
			{ name: 'SQL', pct: Math.round(((snapshot.sqlLines || 0) / total) * 100), color: 'bg-[#a78bfa]' },
			{ name: 'JavaScript', pct: Math.round((snapshot.jsLines / total) * 100), color: 'bg-[#f59e0b]' },
			{ name: 'CSS', pct: Math.round((snapshot.cssLines / total) * 100), color: 'bg-[#f472b6]' },
			{ name: 'Shell', pct: Math.round(((snapshot.shLines || 0) / total) * 100), color: 'bg-[#78716c]' },
			{ name: 'TSX', pct: Math.round(((snapshot.tsxLines || 0) / total) * 100), color: 'bg-[#f43f5e]' }
		].filter(lang => lang.pct > 0);
	}

	// Get max doc lines for chart scaling
	const maxDocLines = $derived(
		data.snapshots.length > 0
			? Math.max(...data.snapshots.map((s: any) => s.docLines))
			: 0
	);

	// Calculate code-to-docs ratio (lines of code per line of docs)
	function getCodeToDocsRatio(snapshot: any): number {
		if (snapshot.docLines === 0) return 0;
		return Math.round((snapshot.totalCodeLines / snapshot.docLines) * 100) / 100;
	}
</script>

<SEO
	title="The Journey — Grove"
	description="Watch Grove grow. A visual timeline of our codebase evolution, one commit at a time."
	url="/journey"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<article class="flex-1 px-4 md:px-6 py-8 md:py-12">
		<div class="max-w-4xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<p class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-3">Building in Public</p>
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">The Journey</h1>
				<p class="text-foreground-muted font-sans text-lg max-w-xl mx-auto">
					Every tree starts as a seed. Watch Grove grow from its first commit to the forest it's becoming.
				</p>
				<div class="flex items-center justify-center gap-4 mt-6">
					<div class="w-12 h-px bg-divider"></div>
					<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			{#if data.latest}
			<!-- Current Stats Grid -->
			<section id="current-growth" class="mb-16 scroll-mt-24">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Current Growth</h2>

				<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.totalCodeLines)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Lines of Code</div>
						{#if data.growth}
							<div class="text-xs text-foreground-faint mt-2 font-sans">
								{getGrowthIcon(data.growth.codeLines)} {formatNumber(Math.abs(data.growth.codeLines))} since start
							</div>
						{/if}
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.docLines)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Lines of Docs</div>
						{#if data.growth}
							<div class="text-xs text-foreground-faint mt-2 font-sans">
								~{Math.round(data.latest.docLines / 40)} pages
							</div>
						{/if}
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.totalFiles)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Files</div>
						<div class="text-xs text-foreground-faint mt-2 font-sans">
							across {data.latest.directories} directories
						</div>
					</div>

					<div class="card p-6 text-center">
						<div class="text-3xl md:text-4xl font-serif text-accent-muted mb-1">
							{formatNumber(data.latest.commits)}
						</div>
						<div class="text-sm text-foreground-muted font-sans">Commits</div>
						<div class="text-xs text-foreground-faint mt-2 font-sans">
							and counting
						</div>
					</div>
				</div>
			</section>

			<!-- Code Composition -->
			<section id="code-composition" class="mb-16 scroll-mt-24">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Code Composition</h2>

				<div class="card p-6">
					<!-- Stacked bar -->
					<div class="h-8 rounded-full overflow-hidden flex mb-6">
						{#each languageBreakdown() as lang}
							<div
								class="{lang.color} transition-all duration-500"
								style="width: {lang.pct}%"
								title="{lang.name}: {lang.pct}%"
							></div>
						{/each}
					</div>

					<!-- Legend -->
					<div class="flex flex-wrap gap-x-5 gap-y-2 justify-center">
						{#each languageBreakdown() as lang}
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded-full {lang.color} shrink-0"></div>
								<span class="text-sm font-sans text-foreground-muted whitespace-nowrap">
									{lang.name} <span class="text-foreground-faint">({lang.pct}%)</span>
								</span>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<!-- Growth Over Time -->
			{#if data.snapshots.length > 1}
				<section id="growth-over-time" class="mb-16 scroll-mt-24">
					<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Growth Over Time</h2>

					<div class="card p-4 md:p-6">
						<!-- Stacked language bar chart -->
						<div class="space-y-2 md:space-y-3">
							{#each data.snapshots as snapshot, i}
								{@const barWidth = (snapshot.totalCodeLines / maxCodeLines) * 100}
								{@const breakdown = getSnapshotBreakdown(snapshot)}
								<div class="flex items-center gap-2 md:gap-4">
									<div class="w-[4.5rem] md:w-32 text-right flex flex-col shrink-0">
										<span class="text-[9px] md:text-xs font-sans text-foreground-faint">{snapshot.date}</span>
										<span class="text-[10px] md:text-xs font-mono text-accent-muted">{snapshot.label}</span>
									</div>
									<div class="flex-1 h-5 md:h-6 bg-surface rounded-full overflow-hidden min-w-0">
										<div class="h-full flex" style="width: {barWidth}%">
											{#each breakdown as lang}
												<div
													class="{lang.color} h-full transition-all duration-500"
													style="width: {lang.pct}%"
													title="{lang.name}: {lang.pct}%"
												></div>
											{/each}
										</div>
									</div>
									<div class="w-14 md:w-20 text-left shrink-0">
										<span class="text-[10px] md:text-xs font-mono text-foreground-muted">{formatNumber(snapshot.totalCodeLines)}</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</section>
			{/if}

			<!-- Documentation -->
			{#if data.snapshots.length > 1}
			<section id="documentation" class="mb-16 scroll-mt-24">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Documentation</h2>

				<div class="grid md:grid-cols-2 gap-6">
					<!-- Code to Docs Ratio Card -->
					<div class="card p-6">
						<div class="text-center mb-4">
							<div class="text-3xl font-serif text-accent-muted mb-1">
								{getCodeToDocsRatio(data.latest)}
							</div>
							<div class="text-sm text-foreground-muted font-sans">lines of code per doc line</div>
						</div>
						<div class="flex justify-between text-xs text-foreground-faint font-sans pt-4 border-t border-default">
							<span>{formatNumber(data.latest.totalCodeLines)} code</span>
							<span>{formatNumber(data.latest.docLines)} docs</span>
						</div>
					</div>

					<!-- Doc Pages Estimate -->
					<div class="card p-6">
						<div class="text-center mb-4">
							<div class="text-3xl font-serif text-accent-muted mb-1">
								~{Math.round(data.latest.docLines / 40)}
							</div>
							<div class="text-sm text-foreground-muted font-sans">pages of documentation</div>
						</div>
						<div class="flex justify-between text-xs text-foreground-faint font-sans pt-4 border-t border-default">
							<span>{formatNumber(data.latest.docLines)} lines</span>
							<span>~40 lines/page</span>
						</div>
					</div>
				</div>

				<!-- Docs growth over time -->
				<div class="card p-4 md:p-6 mt-6">
					<h3 class="text-xs font-sans text-foreground-faint uppercase tracking-wide mb-4">Documentation Growth</h3>
					<div class="space-y-1.5 md:space-y-2">
						{#each data.snapshots as snapshot, i}
							{@const barWidth = (snapshot.docLines / maxDocLines) * 100}
							<div class="flex items-center gap-2 md:gap-3">
								<div class="w-12 md:w-16 text-right shrink-0">
									<span class="text-[10px] md:text-xs font-mono text-foreground-faint">{snapshot.label}</span>
								</div>
								<div class="flex-1 h-3.5 md:h-4 bg-surface rounded-full overflow-hidden min-w-0">
									<div
										class="h-full bg-emerald-500 rounded-full transition-all duration-500"
										style="width: {barWidth}%"
									></div>
								</div>
								<div class="w-12 md:w-16 text-left shrink-0">
									<span class="text-[10px] md:text-xs font-mono text-foreground-muted">{formatNumber(snapshot.docLines)}</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
			{/if}

			<!-- Documentation Insights (Word Frequency) -->
			{#if data.wordFrequencies && data.latest && data.wordFrequencies[data.latest.label]}
				{@const words = data.wordFrequencies[data.latest.label]}
				<section id="doc-insights" class="mb-16 scroll-mt-24">
					<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Documentation Insights</h2>

					<div class="card p-6">
						<!-- Weighted tag list - top 15 words -->
						<div class="flex flex-wrap justify-center gap-3 mb-6">
							{#each words.topWords.slice(0, 15) as word, i}
								<span
									class="inline-block px-3 py-1.5 rounded-full bg-surface text-foreground-muted
										   transition-all hover:bg-accent/10 hover:text-accent cursor-default"
									style="font-size: {0.75 + (word.pct / 2)}rem"
									title="{word.word}: {word.count} occurrences ({word.pct}%)"
								>
									{word.word}
								</span>
							{/each}
						</div>

						<!-- Fun facts grid -->
						<div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-default">
							<div class="text-center">
								<div class="text-lg font-serif text-accent-muted">{formatNumber(words.totalWords)}</div>
								<div class="text-xs text-foreground-faint font-sans">total words</div>
							</div>
							<div class="text-center">
								<div class="text-lg font-serif text-accent-muted">{formatNumber(words.uniqueWords)}</div>
								<div class="text-xs text-foreground-faint font-sans">unique words</div>
							</div>
							<div class="text-center">
								<div class="text-lg font-serif text-accent-muted">{words.totalFiles}</div>
								<div class="text-xs text-foreground-faint font-sans">doc files</div>
							</div>
							<div class="text-center">
								<div class="text-lg font-serif text-accent-muted">{words.funFacts.groveCount}</div>
								<div class="text-xs text-foreground-faint font-sans">"grove" mentions</div>
							</div>
						</div>

						<!-- Fun fact callout -->
						<div class="mt-4 pt-4 border-t border-default text-center">
							<p class="text-sm text-foreground-muted font-sans">
								<span class="font-mono text-accent-muted">"{words.funFacts.mostUsedWord}"</span>
								is our most-used word, appearing {formatNumber(words.topWords[0]?.count || 0)} times.
								Most documented topic: <span class="font-medium">{words.funFacts.mostDocumentedTopic}</span>
							</p>
						</div>
					</div>
				</section>
			{/if}

			<!-- Milestones Timeline -->
			{#if milestones.length > 0}
			<section id="milestones" class="mb-16 scroll-mt-24">
				<h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">Milestones</h2>

				<div class="relative">
					<!-- Timeline line -->
					<div class="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-divider transform md:-translate-x-1/2"></div>

					<div class="space-y-8">
						{#each milestones as snapshot, i}
							{@const isLeft = i % 2 === 0}
							{@const summary = getSummary(snapshot.label)}
							<div class="relative flex items-start {isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}">
								<!-- Dot -->
								<div class="absolute left-4 md:left-1/2 w-3 h-3 bg-accent-muted rounded-full transform -translate-x-1/2 z-10 mt-5"></div>

								<!-- Content -->
								<div class="ml-12 md:ml-0 md:w-1/2 {isLeft ? 'md:pr-12' : 'md:pl-12'}">
									<div class="card p-5 {isLeft ? 'md:text-right' : ''}">
										<!-- Header -->
										<div class="text-xs font-mono text-foreground-faint mb-1">{snapshot.date}</div>
										<div class="font-serif text-xl text-accent-muted mb-2 flex items-center gap-2 {isLeft ? 'md:justify-end' : ''}">
											<Tag class="w-4 h-4" /> {snapshot.label}
										</div>

										<!-- AI Summary -->
										{#if summary}
											<p class="text-sm text-foreground-muted font-sans leading-relaxed mb-3 {isLeft ? 'md:text-right' : ''}">
												{summary.summary}
											</p>

											<!-- Stats badges -->
											<div class="flex flex-wrap gap-2 mb-3 {isLeft ? 'md:justify-end' : ''}">
												{#if summary.stats.features > 0}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-sans rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
														<Sparkles class="w-3 h-3" />
														{summary.stats.features} features
													</span>
												{/if}
												{#if summary.stats.fixes > 0}
													<span class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-sans rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
														<Wrench class="w-3 h-3" />
														{summary.stats.fixes} fixes
													</span>
												{/if}
											</div>

											<!-- Expandable highlights -->
											{#if summary.highlights.features.length > 0 || summary.highlights.fixes.length > 0}
												<details class="group mt-3 pt-3 border-t border-divider">
													<summary class="cursor-pointer text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1 {isLeft ? 'md:justify-end' : ''}">
														<ChevronDown class="w-3 h-3 transition-transform group-open:rotate-180" />
														View highlights
													</summary>

													<div class="mt-3 space-y-3 text-left">
														{#if summary.highlights.features.length > 0}
															<div>
																<h4 class="text-xs font-semibold text-foreground mb-1.5">Features</h4>
																<ul class="space-y-1 text-xs text-foreground-muted">
																	{#each summary.highlights.features.slice(0, 5) as feature}
																		<li class="flex items-start gap-1.5">
																			<span class="text-green-500 mt-0.5">●</span>
																			<span>{feature}</span>
																		</li>
																	{/each}
																</ul>
															</div>
														{/if}

														{#if summary.highlights.fixes.length > 0}
															<div>
																<h4 class="text-xs font-semibold text-foreground mb-1.5">Fixes</h4>
																<ul class="space-y-1 text-xs text-foreground-muted">
																	{#each summary.highlights.fixes.slice(0, 5) as fix}
																		<li class="flex items-start gap-1.5">
																			<span class="text-blue-500 mt-0.5">●</span>
																			<span>{fix}</span>
																		</li>
																	{/each}
																</ul>
															</div>
														{/if}
													</div>
												</details>
											{/if}
										{:else}
											<!-- Fallback for versions without summaries -->
											<div class="text-sm text-foreground-muted font-sans">
												{formatNumber(snapshot.totalCodeLines)} lines · {formatNumber(snapshot.commits)} commits
											</div>
										{/if}

										<!-- Stats footer -->
										<div class="text-xs text-foreground-faint font-mono mt-3 pt-3 border-t border-divider flex items-center gap-3 {isLeft ? 'md:justify-end' : ''}">
											<span>{formatNumber(snapshot.totalCodeLines)} lines</span>
											<span>·</span>
											<span>{formatNumber(snapshot.commits)} commits</span>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
			{/if}

			<!-- Package Size -->
			<section id="package-size" class="mb-16 scroll-mt-24">
				<div class="card p-8 text-center bg-accent border-accent">
					<div class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-2">NPM Package Size</div>
					<div class="text-4xl md:text-5xl font-serif text-accent-muted mb-2">
						{formatBytes(data.latest.npmUnpackedSize)}
					</div>
					{#if data.latest.npmUnpackedSize > 0}
						<div class="text-foreground-muted font-sans">unpacked size</div>
						<p class="text-foreground-faint font-sans text-sm mt-4 max-w-md mx-auto">
							That's what you get when you <code class="bg-background/50 px-1.5 py-0.5 rounded text-xs">npm install @autumnsgrove/lattice</code> — components, utilities, and everything you need to build with <GroveTerm term="lattice">Lattice</GroveTerm>.
						</p>
					{:else}
						<div class="text-foreground-muted font-sans">package data unavailable</div>
						<p class="text-foreground-faint font-sans text-sm mt-4 max-w-md mx-auto">
							This version's package size data isn't available yet. Check back after it's published to NPM.
						</p>
					{/if}
				</div>
			</section>
			{:else}
			<!-- Empty state -->
			<section class="mb-16">
				<div class="card p-12 text-center">
					<div class="mb-4 flex justify-center"><Sprout class="w-10 h-10 text-accent-muted" /></div>
					<h2 class="text-xl font-serif text-foreground mb-2">No snapshots yet</h2>
					<p class="text-foreground-muted font-sans">
						The journey is just beginning. Check back after the first release.
					</p>
				</div>
			</section>
			{/if}

			<!-- Footer note -->
			<section class="text-center py-8 border-t border-default">
				<p class="text-foreground-faint font-sans text-sm mb-2">
					Snapshots are automatically generated with each release.
				</p>
				<p class="text-foreground-subtle font-sans italic inline-flex items-center gap-2 justify-center">
					Building something meaningful, one commit at a time. <Sprout class="w-4 h-4 text-accent-muted" />
				</p>
			</section>
		</div>
	</article>

	<Footer />

	<!-- Floating TOC -->
	{#if data.latest}
		<div class="floating-toc-wrapper">
			<button
				class="toc-button"
				onclick={() => tocOpen = !tocOpen}
				aria-label="Toggle table of contents"
				aria-expanded={tocOpen}
			>
				<List class="w-5 h-5" />
			</button>

			{#if tocOpen}
				<nav class="toc-menu">
					<h3 class="toc-title">Jump to Section</h3>
					<ul class="toc-list">
						{#each sections as section}
							<li class="toc-item" class:active={activeSection === section.id}>
								<button
									type="button"
									class="toc-link"
									onclick={() => scrollToSection(section.id)}
								>
									{section.text}
								</button>
							</li>
						{/each}
					</ul>
				</nav>
			{/if}
		</div>
	{/if}
</main>

<style>
	.bg-divider {
		background-color: var(--color-divider);
	}

	/* Floating TOC */
	.floating-toc-wrapper {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		z-index: 50;
	}

	.toc-button {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--color-accent, #2c5f2d);
		border: none;
		color: white;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
	}

	.toc-button:hover {
		background: var(--color-accent-hover, #3a7a3c);
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
	}

	.toc-button:active {
		transform: scale(0.95);
	}

	.toc-button:focus-visible {
		outline: 2px solid var(--color-grove-500, #2c5f2d);
		outline-offset: 2px;
	}

	.toc-menu {
		position: absolute;
		bottom: 60px;
		right: 0;
		width: 240px;
		max-height: 70vh;
		overflow-y: auto;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-radius: 16px;
		border: 1px solid rgba(0, 0, 0, 0.08);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		padding: 1rem;
		animation: slideIn 0.2s ease;
	}

	:global(.dark) .toc-menu {
		background: rgba(30, 40, 35, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.toc-title {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-foreground-faint, #888);
		margin: 0 0 0.75rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	:global(.dark) .toc-title {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.toc-item {
		margin: 0;
	}

	.toc-link {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.5rem 0.75rem;
		margin: 0.125rem 0;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--color-foreground-muted, #555);
		cursor: pointer;
		transition: all 0.15s ease;
		font-size: 0.875rem;
		font-family: inherit;
		line-height: 1.4;
	}

	.toc-link:hover {
		background: rgba(44, 95, 45, 0.08);
		color: var(--color-accent, #2c5f2d);
		padding-left: 1rem;
	}

	:global(.dark) .toc-link:hover {
		background: rgba(74, 222, 128, 0.1);
		color: var(--color-accent, #4ade80);
	}

	.toc-item.active .toc-link {
		background: rgba(44, 95, 45, 0.12);
		color: var(--color-accent, #2c5f2d);
		font-weight: 600;
	}

	:global(.dark) .toc-item.active .toc-link {
		background: rgba(74, 222, 128, 0.15);
		color: var(--color-accent, #4ade80);
	}

	/* Scrollbar styling for TOC menu */
	.toc-menu::-webkit-scrollbar {
		width: 4px;
	}

	.toc-menu::-webkit-scrollbar-track {
		background: transparent;
	}

	.toc-menu::-webkit-scrollbar-thumb {
		background: rgba(0, 0, 0, 0.2);
		border-radius: 2px;
	}

	:global(.dark) .toc-menu::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.2);
	}
</style>
