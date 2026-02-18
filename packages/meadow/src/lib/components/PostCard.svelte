<!--
  PostCard — The visual heart of the Meadow community feed.

  Renders a single aggregated post inside a GlassCard with:
  - Author header (subdomain avatar + name + relative time)
  - Content area (title link + description excerpt + optional featured image)
  - Tag badges
  - Action bar (upvote + bookmark)

  Uses Svelte 5 runes and engine components (GlassCard, Badge).
-->
<script lang="ts">
	import type { MeadowPost } from "$lib/types/post.js";
	import { formatRelativeTime } from "$lib/utils/time.js";

	interface Props {
		post: MeadowPost;
		onvote?: (postId: string) => void;
		onbookmark?: (postId: string) => void;
		onreact?: (postId: string, emoji: string) => void;
	}

	const { post, onvote, onbookmark, onreact }: Props = $props();

	const isNote = $derived(post.postType === "note");
	const relativeTime = $derived(formatRelativeTime(post.publishedAt));
	const authorUrl = $derived(
		post.authorSubdomain ? `https://${post.authorSubdomain}.grove.place` : null,
	);
	const displayTags = $derived(post.tags.slice(0, 4));
	const hasImage = $derived(!isNote && !!post.featuredImage);
</script>

<article
	class="glass-card overflow-hidden rounded-xl border border-white/20 bg-white/80 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md dark:border-cream-100/15 dark:bg-cream-100/65"
>
	<!-- Author header -->
	<div class="flex items-center gap-3 px-5 pt-4 pb-2">
		{#if authorUrl}
			<a
				href={authorUrl}
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
				aria-label="Visit {post.authorName || post.authorSubdomain}'s site"
			>
				{(post.authorName || post.authorSubdomain || "?").charAt(0).toUpperCase()}
			</a>
		{:else}
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
			>
				{(post.authorName || "?").charAt(0).toUpperCase()}
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			{#if authorUrl}
				<a
					href={authorUrl}
					class="block truncate text-sm font-medium text-foreground hover:underline"
				>
					{post.authorName || post.authorSubdomain}
				</a>
			{:else}
				<span class="block truncate text-sm font-medium text-foreground">
					{post.authorName || "A wanderer"}
				</span>
			{/if}
			<div class="flex items-center gap-1.5 text-xs text-foreground-muted">
				{#if post.authorSubdomain}
					<span>{post.authorSubdomain}.grove.place</span>
					<span aria-hidden="true">&middot;</span>
				{/if}
				<time datetime={new Date(post.publishedAt * 1000).toISOString()}>
					{relativeTime}
				</time>
			</div>
		</div>
	</div>

	<!-- Content area -->
	{#if isNote}
		<!-- Note: rich HTML or plain text body -->
		<div class="px-5 py-3">
			<a href="/feed/{post.id}" class="block hover:text-foreground/80">
				{#if post.contentHtml}
					<div class="prose prose-sm prose-grove max-w-none dark:prose-invert">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitized HTML content -->
						{@html post.contentHtml}
					</div>
				{:else}
					<p class="text-base leading-relaxed text-foreground">{post.body}</p>
				{/if}
			</a>
		</div>
	{:else}
		<!-- Bloom: title + description + optional image -->
		<div class="px-5 py-3">
			<h3 class="mb-1.5 text-lg font-semibold leading-snug">
				<a
					href={post.link}
					target="_blank"
					rel="noopener noreferrer"
					class="text-foreground hover:text-grove-600 hover:underline dark:hover:text-grove-400"
					aria-label="{post.title} (opens in new tab)"
				>
					{post.title}
				</a>
			</h3>

			{#if post.description}
				<p class="line-clamp-3 text-sm leading-relaxed text-foreground-muted">
					{post.description}
				</p>
			{/if}
		</div>

		<!-- Featured image -->
		{#if hasImage}
			<div class="px-5 pb-3">
				<img
					src={post.featuredImage}
					alt=""
					class="w-full rounded-lg object-cover"
					style="max-height: 280px;"
					loading="lazy"
				/>
			</div>
		{/if}
	{/if}

	<!-- Tags -->
	{#if displayTags.length > 0}
		<div class="flex flex-wrap gap-1.5 px-5 pb-3">
			{#each displayTags as tag}
				<span
					class="inline-block rounded-full bg-grove-50 px-2.5 py-0.5 text-xs font-medium text-grove-700 dark:bg-cream-100/30 dark:text-cream-800"
				>
					{tag}
				</span>
			{/each}
		</div>
	{/if}

	<!-- Action bar -->
	<div class="flex items-center gap-1 border-t border-black/5 px-3 py-1.5 dark:border-white/5">
		<!-- Upvote -->
		<button
			type="button"
			class="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg px-3 text-sm transition-colors {post.userVoted
				? 'text-grove-600 dark:text-grove-400 font-medium'
				: 'text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400'}"
			aria-label={post.userVoted ? "Remove upvote" : "Upvote"}
			aria-pressed={post.userVoted}
			onclick={() => onvote?.(post.id)}
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 20 20"
				fill={post.userVoted ? "currentColor" : "none"}
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path d="M10 3l-7 8h4v6h6v-6h4l-7-8z" />
			</svg>
			{#if post.score > 0}
				<span>{post.score}</span>
			{/if}
		</button>

		<div class="flex-1"></div>

		<!-- Bookmark -->
		<button
			type="button"
			class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-3 text-sm transition-colors {post.userBookmarked
				? 'text-grove-600 dark:text-grove-400'
				: 'text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400'}"
			aria-label={post.userBookmarked ? "Remove bookmark" : "Bookmark"}
			aria-pressed={post.userBookmarked}
			onclick={() => onbookmark?.(post.id)}
		>
			<svg
				class="h-5 w-5"
				viewBox="0 0 20 20"
				fill={post.userBookmarked ? "currentColor" : "none"}
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<path d="M5 3h10a1 1 0 011 1v13.5l-5.5-3.5L5 17.5V4a1 1 0 011-1z" />
			</svg>
		</button>
	</div>
</article>

<style>
	@media (prefers-reduced-motion: reduce) {
		article {
			transition-duration: 0s !important;
		}
		button {
			transition-duration: 0s !important;
		}
	}
</style>
