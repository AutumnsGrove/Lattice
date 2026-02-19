<!--
  BlogCardsDemo — Sample blog post cards showing what a grove garden looks like.
  Uses Card + Badge from the engine with warm, realistic sample data.
  Pure client-side, no API needed.
-->
<script lang="ts">
	import { GlassCard, Badge } from '@autumnsgrove/lattice/ui';
	import { CalendarDays } from 'lucide-svelte';

	const posts = [
		{
			title: 'Finding Quiet on the Internet',
			date: 'Feb 3, 2026',
			tags: ['reflection', 'web'],
			excerpt: 'I used to love having my own little corner of the web. A place where I could write without worrying about algorithms or engagement metrics. Somewhere along the way, that feeling disappeared.'
		},
		{
			title: 'Why I Started Writing Again',
			date: 'Jan 28, 2026',
			tags: ['personal'],
			excerpt: 'Three years ago, I closed my blog and walked away. Not because I ran out of things to say — because every platform made saying them feel like a performance.'
		},
		{
			title: 'A Recipe for Midnight Tea',
			date: 'Jan 15, 2026',
			tags: ['recipe', 'cozy'],
			excerpt: 'The best tea is brewed when the house is quiet and the world has gone to sleep. Here is how I make mine, and why the ritual matters as much as the drink.'
		}
	];
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
	{#each posts as post}
		<div class="group cursor-default">
			<GlassCard class="h-full transition-shadow duration-200 group-hover:shadow-md">
				<div class="flex flex-col gap-3">
					<!-- Title -->
					<h3 class="text-foreground font-serif text-base leading-snug group-hover:text-accent-muted transition-colors">
						{post.title}
					</h3>

					<!-- Date -->
					<div class="flex items-center gap-1.5 text-foreground-faint text-xs font-sans">
						<CalendarDays class="w-3.5 h-3.5" aria-hidden="true" />
						<time>{post.date}</time>
					</div>

					<!-- Excerpt -->
					<p class="text-foreground-subtle text-sm font-sans leading-relaxed line-clamp-3">
						{post.excerpt}
					</p>

					<!-- Tags -->
					<div class="flex flex-wrap gap-1.5 mt-auto pt-1">
						{#each post.tags as tag}
							<Badge variant="secondary" class="text-[11px]">{tag}</Badge>
						{/each}
					</div>
				</div>
			</GlassCard>
		</div>
	{/each}
</div>
