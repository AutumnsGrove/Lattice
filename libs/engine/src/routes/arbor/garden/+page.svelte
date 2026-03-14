<script>
	import Button from "$lib/ui/components/ui/Button.svelte";
	import Badge from "$lib/ui/components/ui/Badge.svelte";
	import GlassConfirmDialog from "$lib/ui/components/ui/GlassConfirmDialog.svelte";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import { toast } from "$lib/ui/components/ui/toast";
	import GroveTerm from "$lib/ui/components/ui/groveterm/GroveTerm.svelte";
	import { api } from "$lib/utils";
	import { groveModeStore } from "$lib/ui/stores";
	import { Trash2, Sparkles } from "@lucide/svelte";
	import { Blaze } from "$lib/ui/components/indicators";
	import { resolveBlaze } from "$lib/blazes";

	let { data } = $props();

	/** @type {{ slug: string, title: string } | null} */
	let bloomToDelete = $state(null);
	let showDeleteDialog = $state(false);
	let deleting = $state(false);

	/** @param {string} dateString */
	function formatDate(dateString) {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	/** @param {{ slug: string, title: string }} bloom */
	function confirmDelete(bloom) {
		bloomToDelete = bloom;
		showDeleteDialog = true;
	}

	async function handleDelete() {
		if (!bloomToDelete) return;

		deleting = true;
		try {
			await api.delete(`/api/blooms/${bloomToDelete.slug}`);
			// Remove from local list
			data.posts = data.posts.filter(
				(/** @type {{ slug: string }} */ p) => p.slug !== bloomToDelete?.slug,
			);
			showDeleteDialog = false;
			bloomToDelete = null;
		} catch (error) {
			console.error("Failed to delete bloom:", error);
			toast.error("Failed to delete bloom", { description: "Please try again." });
		} finally {
			deleting = false;
		}
	}

	function handleCancelDelete() {
		showDeleteDialog = false;
		bloomToDelete = null;
	}
</script>

<div class="max-w-screen-xl">
	<!-- Example Site Notice -->
	{#if data.isExampleSite}
		<div
			class="mb-6 p-4 bg-warning-bg border border-warning rounded-lg"
		>
			<p class="m-0 text-warning text-sm">
				<strong><Sparkles class="w-4 h-4 inline-block" /> Welcome to the Example Site!</strong> This <GroveTerm
					term="arbor"
					standard="dashboard">admin panel</GroveTerm
				> is publicly accessible so you can explore Grove's features. On your own site, this panel is
				private and only accessible to you.
			</p>
		</div>
	{/if}

	<header
		class="flex justify-between items-start mb-8 max-md:flex-col max-md:items-stretch max-md:gap-4"
	>
		<div>
			<h1 class="m-0 mb-1 text-3xl text-foreground"><GroveTerm interactive term="garden">Garden</GroveTerm></h1>
			{#if !groveModeStore.current}
				<p class="text-sm text-foreground-subtle italic mt-1 mb-0">(<GroveTerm term="your-garden" displayOverride="grove" icon />)</p>
			{/if}
			<p class="m-0 text-foreground-muted">
				{data.posts.length}
				<GroveTerm interactive term="blooms">blooms</GroveTerm>
			</p>
		</div>
		<Button variant="primary" onclick={() => (window.location.href = "/arbor/garden/new")}>
			+ New <GroveTerm interactive term="blooms">Bloom</GroveTerm>
		</Button>
	</header>

	<GlassCard variant="default" class="overflow-hidden mb-8">
		<table class="w-full border-collapse">
			<thead>
				<tr>
					<th
						scope="col"
						class="p-4 text-left border-b border-border bg-white/80 dark:bg-cream-100/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3"
						>Title</th
					>
					<th
						scope="col"
						class="p-4 text-left border-b border-border bg-white/80 dark:bg-cream-100/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden"
						>Date</th
					>
					<th
						scope="col"
						class="p-4 text-left border-b border-border bg-white/80 dark:bg-cream-100/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:hidden"
						>Tags</th
					>
					<th
						scope="col"
						class="p-4 text-left border-b border-border bg-white/80 dark:bg-cream-100/80 backdrop-blur-sm font-semibold text-xs text-foreground transition-[background-color,border-color] sticky top-0 z-10 max-md:px-2 max-md:py-3"
						>Actions</th
					>
				</tr>
			</thead>
			<tbody>
				{#each data.posts as post (post.slug)}
					<tr>
						<td
							class="p-4 text-left border-b border-border transition-[border-color] max-md:px-2 max-md:py-3"
						>
							{#if post.status === "published"}
								<a
									href="/garden/{post.slug}"
									target="_blank"
									rel="noopener noreferrer"
									aria-label="{post.title} (opens in new tab)"
									class="font-medium text-success no-underline hover:underline transition-colors"
								>
									{post.title}
								</a>
							{:else}
								<span class="font-medium text-foreground">{post.title}</span>
							{/if}
							{#if post.description}
								<p class="mt-1 mb-0 text-xs text-foreground-muted">{post.description}</p>
							{/if}
						</td>
						<td
							class="p-4 text-left border-b border-border whitespace-nowrap text-foreground-muted text-sm transition-[border-color] max-md:hidden"
						>
							{#if post.status === "published" && post.date}
								{formatDate(post.date)}
							{:else if post.status === "draft"}
								<span class="text-warning font-medium">Draft</span>
							{:else}
								<span class="text-foreground-subtle">—</span>
							{/if}
						</td>
						<td
							class="p-4 text-left border-b border-border transition-[border-color] max-md:hidden"
						>
							<div class="flex flex-wrap gap-1 items-center">
								{#if post.blaze}
									{@const blazeDef = resolveBlaze(post.blaze, post.blazeDefinition)}
									{#if blazeDef}
										<Blaze definition={blazeDef} />
									{/if}
								{/if}
								{#each post.tags as tag (tag)}
									<Badge variant="tag">{tag}</Badge>
								{/each}
								{#if !post.blaze && post.tags.length === 0}
									<span class="text-foreground-muted">-</span>
								{/if}
							</div>
						</td>
						<td
							class="p-4 text-left border-b border-border whitespace-nowrap transition-[border-color] max-md:px-2 max-md:py-3"
						>
							{#if post.status === "published"}
								<a
									href="/garden/{post.slug}"
									target="_blank"
									rel="noopener noreferrer"
									aria-label="View {post.title} (opens in new tab)"
									class="text-success no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2"
									>View</a
								>
							{:else}
								<span
									class="text-foreground-subtle text-sm mr-4 cursor-default"
									title="Publish this bloom to view it">View</span
								>
							{/if}
							<a
								href="/arbor/garden/edit/{post.slug}"
								class="text-success no-underline text-sm mr-4 hover:underline transition-colors max-md:mr-2"
								>Edit</a
							>
							<button
								onclick={() => confirmDelete({ slug: post.slug, title: post.title })}
								disabled={deleting}
								class="text-error text-sm hover:underline transition-colors inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:no-underline"
								aria-label="Delete {post.title}"
							>
								<Trash2 class="w-3.5 h-3.5" />
								<span class="max-md:hidden">Delete</span>
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="4" class="text-center text-foreground-muted py-12 px-4">
							No <GroveTerm interactive term="blooms">blooms</GroveTerm> yet. Create your first one!
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</GlassCard>

	<GlassCard variant="muted">
		<h3>How the <GroveTerm interactive term="your-garden">Garden</GroveTerm> Works</h3>
		<p>
			Create and edit <GroveTerm interactive term="blooms">blooms</GroveTerm> directly in the built-in markdown editor.
			<GroveTerm interactive term="blooms">Blooms</GroveTerm> are saved to the database and available immediately.
		</p>
		<ul>
			<li>
				Use <strong>+ New <GroveTerm interactive term="blooms">Bloom</GroveTerm></strong> to create a new <GroveTerm
					term="blooms">bloom</GroveTerm
				> with the markdown editor
			</li>
			<li>
				Use <strong>Edit</strong> links to modify existing <GroveTerm interactive term="blooms"
					>blooms</GroveTerm
				>
			</li>
		</ul>
	</GlassCard>
</div>

<!-- Delete Confirmation Dialog -->
<GlassConfirmDialog
	bind:open={showDeleteDialog}
	title="Delete Bloom"
	message={`Are you sure you want to delete "${bloomToDelete?.title}"? This action cannot be undone.`}
	confirmLabel="Delete Bloom"
	cancelLabel="Cancel"
	variant="danger"
	loading={deleting}
	onconfirm={handleDelete}
	oncancel={handleCancelDelete}
/>

<style>
	:global(.max-w-screen-xl .glass-card) {
		padding: 1.5rem;
	}

	:global(.max-w-screen-xl .glass-card h3) {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		color: var(--color-text);
		transition: color 0.3s ease;
	}

	:global(.max-w-screen-xl .glass-card p) {
		margin: 0 0 0.75rem 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	:global(.max-w-screen-xl .glass-card ul) {
		margin: 0;
		padding-left: 1.25rem;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		transition: color 0.3s ease;
	}

	:global(.max-w-screen-xl .glass-card li) {
		margin-bottom: 0.25rem;
	}

	:global(.max-w-screen-xl .glass-card code) {
		background: var(--color-border);
		padding: 0.125rem 0.25rem;
		border-radius: var(--border-radius-small);
		font-size: 0.85em;
		transition: background-color 0.3s ease;
	}
</style>
