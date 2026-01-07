<script lang="ts">
	import { onMount } from 'svelte';
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { stateIcons } from '$lib/utils/icons';

	const CheckCircle = stateIcons.checkcircle;
	const Tag = stateIcons.tag;

	interface VersionSummary {
		version: string;
		date: string;
		commitHash: string;
		summary: string;
		stats: {
			totalCommits: number;
			features: number;
			fixes: number;
			refactoring: number;
			docs: number;
			tests: number;
			performance: number;
		};
		highlights: {
			features: string[];
			fixes: string[];
		};
	}

	interface HistoryEntry {
		timestamp: string;
		label: string;
		git_hash: string;
		total_code_lines: number;
		commits: number;
	}

	let versions = $state<VersionSummary[]>([]);
	let history = $state<HistoryEntry[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	onMount(async () => {
		try {
			// Load history CSV
			const historyResponse = await fetch('/data/history.csv');
			if (historyResponse.ok) {
				const csvText = await historyResponse.text();
				history = parseHistoryCSV(csvText);
			}

			// Load all available summaries
			const summaryPromises = history
				.filter(h => h.label.startsWith('v'))
				.map(async (h) => {
					try {
						const response = await fetch(`/data/summaries/${h.label}.json`);
						if (response.ok) {
							return await response.json() as VersionSummary;
						}
						// Summary doesn't exist yet (expected for older versions)
						return null;
					} catch (e) {
						// Log in development to help debugging
						if (import.meta.env.DEV) {
							console.warn(`Failed to load summary for ${h.label}:`, e);
						}
						return null;
					}
				});

			const loadedSummaries = await Promise.all(summaryPromises);
			versions = loadedSummaries.filter((s): s is VersionSummary => s !== null);

			// Sort by version (newest first)
			versions.sort((a, b) => {
				const aNum = parseVersion(a.version);
				const bNum = parseVersion(b.version);
				return bNum - aNum;
			});

			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load version history';
			loading = false;
		}
	});

	function parseHistoryCSV(csv: string): HistoryEntry[] {
		const lines = csv.trim().split('\n');
		const headers = lines[0].split(',');

		return lines.slice(1).map(line => {
			const values = line.split(',');
			return {
				timestamp: values[0],
				label: values[1],
				git_hash: values[2],
				total_code_lines: parseInt(values[3]),
				commits: parseInt(values[13])
			};
		});
	}

	function parseVersion(version: string): number {
		// Convert v0.9.0 to 000900 for sorting
		const match = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
		if (!match) return 0;
		return parseInt(match[1]) * 10000 + parseInt(match[2]) * 100 + parseInt(match[3]);
	}

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getHistoryForVersion(version: string): HistoryEntry | undefined {
		return history.find(h => h.label === version);
	}
</script>

<SEO
	title="Version History — Grove"
	description="Track Grove's development through every release. See what changed, what improved, and how the grove has grown over time."
	url="/roadmap/versions"
/>

<main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-slate-100 via-slate-50 to-white dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
		<div class="max-w-3xl mx-auto relative z-10">
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				Version History
			</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto">
				Every release tells a story. Here's how the grove has grown, version by version.
			</p>
		</div>
	</section>

	<!-- Version Timeline -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-4xl mx-auto">
			{#if loading}
				<div class="text-center py-12">
					<p class="text-foreground-muted">Loading version history...</p>
				</div>
			{:else if error}
				<div class="text-center py-12">
					<p class="text-red-600 dark:text-red-400">{error}</p>
				</div>
			{:else if versions.length === 0}
				<div class="text-center py-12">
					<p class="text-foreground-muted">No version summaries available yet.</p>
					<p class="text-sm text-foreground-muted mt-2">
						Summaries will be generated automatically on future releases.
					</p>
				</div>
			{:else}
				<div class="space-y-8">
					{#each versions as version}
						{@const historyData = getHistoryForVersion(version.version)}
						<article class="bg-white dark:bg-slate-800 rounded-lg border border-divider p-6 shadow-sm hover:shadow-md transition-shadow">
							<!-- Version Header -->
							<div class="flex items-start justify-between mb-4">
								<div>
									<div class="flex items-center gap-2 mb-2">
										<Tag class="w-5 h-5 text-accent" />
										<h2 class="text-2xl font-semibold text-foreground">{version.version}</h2>
									</div>
									<p class="text-sm text-foreground-muted">
										{formatDate(version.date)}
										{#if historyData}
											· {historyData.total_code_lines.toLocaleString()} lines
											· {historyData.commits} commits
										{/if}
									</p>
								</div>

								<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium">
									<CheckCircle class="w-4 h-4" />
									Released
								</span>
							</div>

							<!-- Summary -->
							<div class="prose prose-slate dark:prose-invert max-w-none mb-4">
								<p class="text-foreground-muted leading-relaxed">
									{version.summary}
								</p>
							</div>

							<!-- Stats -->
							<div class="flex flex-wrap gap-4 text-sm text-foreground-muted mb-4">
								{#if version.stats.features > 0}
									<span class="flex items-center gap-1">
										<span class="font-medium text-green-600 dark:text-green-400">{version.stats.features}</span>
										features
									</span>
								{/if}
								{#if version.stats.fixes > 0}
									<span class="flex items-center gap-1">
										<span class="font-medium text-blue-600 dark:text-blue-400">{version.stats.fixes}</span>
										fixes
									</span>
								{/if}
								{#if version.stats.refactoring > 0}
									<span class="flex items-center gap-1">
										<span class="font-medium text-purple-600 dark:text-purple-400">{version.stats.refactoring}</span>
										refactoring
									</span>
								{/if}
								{#if version.stats.performance > 0}
									<span class="flex items-center gap-1">
										<span class="font-medium text-amber-600 dark:text-amber-400">{version.stats.performance}</span>
										performance
									</span>
								{/if}
								<span class="ml-auto text-xs font-mono text-foreground-muted/70">
									{version.commitHash}
								</span>
							</div>

							<!-- Key Highlights (expandable) -->
							{#if version.highlights.features.length > 0 || version.highlights.fixes.length > 0}
								<details class="group">
									<summary class="cursor-pointer text-sm font-medium text-accent hover:text-accent-hover transition-colors">
										View detailed changes
									</summary>

									<div class="mt-4 space-y-4">
										{#if version.highlights.features.length > 0}
											<div>
												<h4 class="text-sm font-semibold text-foreground mb-2">Features</h4>
												<ul class="space-y-1 text-sm text-foreground-muted">
													{#each version.highlights.features as feature}
														<li class="flex items-start gap-2">
															<span class="text-green-500 mt-0.5">●</span>
															<span>{feature}</span>
														</li>
													{/each}
												</ul>
											</div>
										{/if}

										{#if version.highlights.fixes.length > 0}
											<div>
												<h4 class="text-sm font-semibold text-foreground mb-2">Fixes</h4>
												<ul class="space-y-1 text-sm text-foreground-muted">
													{#each version.highlights.fixes as fix}
														<li class="flex items-start gap-2">
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
						</article>
					{/each}
				</div>

				<!-- Footer Navigation -->
				<div class="mt-12 pt-8 border-t border-divider text-center">
					<p class="text-foreground-muted mb-4">Want to see the bigger picture?</p>
					<a
						href="/roadmap"
						class="inline-block px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
					>
						← Back to Roadmap
					</a>
				</div>
			{/if}
		</div>
	</section>

	<Footer />
</main>

<style>
	/* Smooth details animation */
	details summary {
		list-style: none;
	}

	details summary::-webkit-details-marker {
		display: none;
	}

	details[open] summary {
		margin-bottom: 0.5rem;
	}
</style>
