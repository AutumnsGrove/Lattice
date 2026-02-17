<script>
	import { MarkdownEditor } from '@autumnsgrove/lattice';

	let title = $state('');
	let content = $state(`# Your New Post

Start writing here...

## Tips

- Use **bold** and *italic* for emphasis
- Create lists with - or 1. 2. 3.
- Add code with \`backticks\` or code blocks
- Insert links and images from the toolbar

Happy writing!
`);

	let saving = $state(false);

	function handleSave() {
		if (!title.trim()) {
			alert('Please enter a title for your post.');
			return;
		}
		saving = true;
		setTimeout(() => {
			saving = false;
			alert('This is a demo - your post was not actually saved.\n\nIn a real Lattice site, this would save to your database or filesystem.');
		}, 500);
	}
</script>

<svelte:head>
	<title>New Post - Admin</title>
</svelte:head>

<div class="new-post-page">
	<header class="page-header">
		<a href="/admin/blog" class="back-link">&larr; Back to Posts</a>
		<h1>New Post</h1>
		<p class="demo-note">This is a demo. Write a post to see how the editor works!</p>
	</header>

	<div class="post-meta">
		<label for="post-title" class="meta-label">Title</label>
		<input
			id="post-title"
			type="text"
			bind:value={title}
			placeholder="Enter your post title..."
			class="title-input"
		/>
	</div>

	<div class="editor-container">
		<MarkdownEditor
			bind:content
			onSave={handleSave}
			{saving}
			draftKey="demo-new-post"
		/>
	</div>
</div>

<style>
	.new-post-page {
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

	.post-meta {
		margin-bottom: 1rem;
	}

	.meta-label {
		display: block;
		font-size: 0.875rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
		font-family: system-ui, sans-serif;
	}

	.title-input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1.25rem;
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		background: hsl(var(--card));
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.title-input:focus {
		outline: none;
		border-color: hsl(var(--primary));
	}

	.title-input::placeholder {
		color: hsl(var(--muted-foreground));
	}

	.editor-container {
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
		min-height: 600px;
	}
</style>
