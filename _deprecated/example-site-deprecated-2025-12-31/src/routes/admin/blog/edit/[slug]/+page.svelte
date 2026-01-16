<script>
	import { page } from '$app/stores';
	import { MarkdownEditor } from '@autumnsgrove/groveengine';

	// Get slug from route params
	let slug = $derived($page.params.slug);

	// Sample content based on slug
	const samplePosts = {
		'why-we-dont-play-music': {
			title: "Why We Don't Play Music",
			content: `# Why We Don't Play Music

Some cafés fill every silence with sound. Jazz at breakfast, indie rock at lunch, lo-fi beats through the evening hours. The Midnight Bloom takes a different path.

## The Sound of Quiet

When you walk through our doors after midnight, you might notice something unusual: the absence of a soundtrack. No Spotify playlist curating your experience. No background music competing with your thoughts.

This isn't an oversight. It's a choice.

## What We Hear Instead

- The gentle hiss of steam from the espresso machine
- The soft clink of ceramic against saucer
- The rustle of pages turning
- Quiet conversations at their natural volume
- The occasional satisfied sigh after a perfect sip

## A Space for Your Own Thoughts

In a world full of noise, we wanted to create something different. A place where your thoughts don't have to compete with someone else's playlist.

> "Silence is not empty. It's full of answers." - A regular customer

Come sit with us. Bring your book, your journal, your laptop, your thoughts. We'll provide the tea and the quiet.

*The Midnight Bloom - Open from 10pm to 4am*
`
		},
		'the-art-of-brewing-patience': {
			title: "The Art of Brewing Patience",
			content: `# The Art of Brewing Patience

Every cup of tea tells a story of waiting.

## The First Lesson

When I opened The Midnight Bloom, I thought I knew everything about tea. I had studied the leaves, memorized steeping times, collected rare varietals from around the world.

But it was Mrs. Chen, our first regular, who taught me the real lesson.

## Three Minutes Changes Everything

She watched me brew her first cup of Dragon Well. I was precise, efficient, proud of my technique.

"Too fast," she said, not unkindly. "The leaves haven't finished speaking."

I started again. This time, I watched the leaves unfurl in the water. Saw them dance and settle. Noticed how the color deepened from pale gold to amber as the minutes passed.

## What Patience Teaches

- The best flavors need time to develop
- Rushing produces bitterness
- Waiting is not passive - it's attentive
- Every steep reveals something new

## Our Promise

At The Midnight Bloom, we never rush your tea. We believe good things take time, and great tea takes just a little longer.

*Come experience patience in a cup.*
`
		},
		'our-favorite-midnight-regulars': {
			title: "Our Favorite Midnight Regulars",
			content: `# Our Favorite Midnight Regulars

Every café has its regulars. Ours just happen to arrive after most people are asleep.

## The Night Shift Nurses

They come in scrubs, tired eyes brightening at the sight of the menu. They've earned their caffeine. We keep a special blend just for them - strong enough to power through a 12-hour shift, smooth enough to drink without wincing.

## The Novelist

She claims the corner booth every Tuesday at 1am. Always orders the same thing: Moonlight Jasmine blend, extra hot. Her laptop glows in the dim light as she types away at a story she's been working on for three years. We don't ask about the plot. We just keep her cup full.

## The Stargazer

He brings his telescope some nights and sets it up on our small patio. Between sips of Earl Grey, he'll point out constellations to anyone interested. Last month, he showed us Saturn's rings.

## What Brings Them Here

It's not just the tea, though we like to think our tea is part of it. It's the quiet. The understanding that 2am thoughts deserve a safe place to land.

---

*To all our midnight regulars: thank you for sharing your nights with us.*
`
		}
	};

	// Get content based on slug or use default
	let postData = $derived(samplePosts[slug] || {
		title: 'Test Post',
		content: '# Test Post\n\nThis is test content for the MarkdownEditor.\n\nTry using the toolbar buttons!'
	});

	let content = $state('');
	let title = $state('');
	let saving = $state(false);

	// Initialize content when postData changes
	$effect(() => {
		content = postData.content;
		title = postData.title;
	});

	function handleSave() {
		saving = true;
		setTimeout(() => {
			saving = false;
			alert('Save simulated! This is a demo - no data is actually saved.');
		}, 500);
	}
</script>

<svelte:head>
	<title>Edit: {title} - Admin</title>
</svelte:head>

<div class="edit-post-page">
	<header class="page-header">
		<a href="/admin/blog" class="back-link">&larr; Back to Posts</a>
		<h1>Edit: {title}</h1>
		<p class="demo-note">This is a demo editor to test the MarkdownEditor component. Changes won't be saved.</p>
	</header>

	<div class="editor-container">
		<MarkdownEditor
			bind:content
			onSave={handleSave}
			{saving}
			draftKey="demo-{slug}"
		/>
	</div>
</div>

<style>
	.edit-post-page {
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		font-size: 0.9rem;
		display: inline-block;
		margin-bottom: 0.5rem;
	}

	.back-link:hover {
		color: hsl(var(--primary));
	}

	.page-header h1 {
		font-size: 1.75rem;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.demo-note {
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
		margin: 0;
		font-style: italic;
	}

	.editor-container {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
		min-height: 600px;
	}
</style>
