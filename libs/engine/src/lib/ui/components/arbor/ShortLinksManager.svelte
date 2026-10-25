<!--
  ShortLinksManager — list, create, and retire short links

  The one UI for link.grove.place, shared by Aspen's Arbor (Wanderers) and the
  landing Arbor (Wayfinder). It renders what the short-links service returns and
  posts to the form actions the page provides; all validation lives in the
  service, so the page only passes messages through.

  Plain <form method="POST"> elements, so it works without JavaScript — only the
  copy button needs it.

  Usage:
    <ShortLinksManager
      links={data.links}
      {form}
      targetPlaceholder="https://yourname.grove.place/about"
      targetHint="Short links point to pages in your own grove."
    />
-->
<script lang="ts">
	import { actionIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import GlassCard from "../ui/GlassCard.svelte";
	import { SHORT_LINK_HOST } from "../../../platform/config/short-links.js";
	import type { ShortLinkSummary } from "../../../server/services/short-links.js";

	const Copy = actionIcons.copy;
	const Plus = actionIcons.plus;
	const Trash = actionIcons.trash;
	const Link = actionIcons.link;
	const Check = stateIcons.check;
	const Warning = stateIcons.warning;

	interface FormResult {
		error?: string;
		success?: boolean;
		message?: string;
	}

	interface Props {
		links: ShortLinkSummary[];
		form?: FormResult | null;
		createAction?: string;
		disableAction?: string;
		targetPlaceholder: string;
		targetHint: string;
	}

	let {
		links,
		form = null,
		createAction = "?/createLink",
		disableAction = "?/disableLink",
		targetPlaceholder,
		targetHint,
	}: Props = $props();

	let copiedSlug = $state<string | null>(null);

	async function copy(link: ShortLinkSummary) {
		try {
			await navigator.clipboard.writeText(link.shortUrl);
			copiedSlug = link.slug;
			setTimeout(() => {
				if (copiedSlug === link.slug) copiedSlug = null;
			}, 2000);
		} catch {
			// Clipboard blocked: the URL is still shown in full to select by hand.
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	const clicksLabel = (n: number) => `${n} ${n === 1 ? "visit" : "visits"}`;
</script>

<div class="short-links space-y-4">
	{#if form?.success}
		<div
			class="p-4 rounded-lg bg-success-bg border border-success text-success flex items-center gap-2"
			role="status"
		>
			<Check class="w-4 h-4" />
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div
			class="p-4 rounded-lg bg-error-bg border border-error text-error flex items-center gap-2"
			role="alert"
		>
			<Warning class="w-4 h-4" />
			{form.error}
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2">
			<GlassCard>
				{#if links.length === 0}
					<div class="p-8 text-center text-foreground-muted">
						<Link class="w-8 h-8 mx-auto mb-3 opacity-60" />
						<p>No short links yet.</p>
						<p class="text-sm mt-1">Make one and it will wait for you here.</p>
					</div>
				{:else}
					<ul class="divide-y divide-border">
						{#each links as link (link.slug)}
							<li class="p-4 flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<a
											href={link.shortUrl}
											class="font-mono text-foreground hover:underline"
											target="_blank"
											rel="noopener"
										>
											{SHORT_LINK_HOST}/{link.slug}
										</a>
										{#if link.kind === "post"}
											<span
												class="px-2 py-0.5 text-xs rounded border bg-accent-subtle text-accent border-accent"
											>
												Bloom
											</span>
										{/if}
									</div>
									<div class="text-sm text-foreground-muted mt-0.5 truncate">
										{#if link.title}
											{link.title}
										{:else if link.targetUrl}
											{link.targetUrl}
										{/if}
										{#if link.kind === "post" && !link.targetUrl}
											<span>This bloom isn't published right now</span>
										{/if}
									</div>
									<div class="text-xs text-foreground-muted mt-0.5">
										Made {formatDate(link.createdAt)} · {clicksLabel(link.clickCount)}
									</div>
								</div>

								<div class="flex items-center gap-1 flex-shrink-0">
									<button
										type="button"
										onclick={() => copy(link)}
										class="p-2 rounded text-foreground-muted hover:text-foreground hover:bg-cream-200 dark:hover:bg-cream-300 transition-colors"
										aria-label={copiedSlug === link.slug
											? "Copied"
											: `Copy ${SHORT_LINK_HOST}/${link.slug}`}
									>
										{#if copiedSlug === link.slug}
											<Check class="w-4 h-4 text-success" />
										{:else}
											<Copy class="w-4 h-4" />
										{/if}
									</button>

									{#if link.kind === "custom"}
										<form method="POST" action={disableAction}>
											<input type="hidden" name="slug" value={link.slug} />
											<button
												type="submit"
												class="p-2 rounded text-error hover:bg-error-bg transition-colors"
												aria-label={`Retire ${SHORT_LINK_HOST}/${link.slug}`}
											>
												<Trash class="w-4 h-4" />
											</button>
										</form>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</GlassCard>
		</div>

		<div>
			<GlassCard
				class="p-6"
				title="New short link"
				icon={Plus}
				iconClass="text-grove-600 dark:text-grove-400"
			>
				<form method="POST" action={createAction} class="space-y-4">
					<div>
						<label for="short-link-target" class="block text-sm font-medium text-foreground mb-1">
							Where should it go?
						</label>
						<input
							type="url"
							id="short-link-target"
							name="target_url"
							placeholder={targetPlaceholder}
							required
							class="w-full px-3 py-2 rounded-lg bg-white/50 dark:bg-cream-100/50 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-grove-500"
						/>
						<p class="text-xs text-foreground-muted mt-1">{targetHint}</p>
					</div>

					<div>
						<label for="short-link-slug" class="block text-sm font-medium text-foreground mb-1">
							Short name <span class="text-foreground-muted">(optional)</span>
						</label>
						<div class="flex items-center gap-1 text-sm">
							<span class="text-foreground-muted font-mono whitespace-nowrap"
								>{SHORT_LINK_HOST}/</span
							>
							<input
								type="text"
								id="short-link-slug"
								name="slug"
								placeholder="my-notes"
								autocomplete="off"
								autocapitalize="none"
								spellcheck="false"
								class="w-full px-3 py-2 rounded-lg bg-white/50 dark:bg-cream-100/50 border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-grove-500 font-mono"
							/>
						</div>
						<p class="text-xs text-foreground-muted mt-1">
							Leave it blank and we'll pick a short one for you.
						</p>
					</div>

					<button
						type="submit"
						class="w-full px-4 py-2 rounded-lg bg-grove-600 text-white hover:bg-grove-700 transition-colors"
					>
						Make short link
					</button>
				</form>
			</GlassCard>
		</div>
	</div>
</div>
