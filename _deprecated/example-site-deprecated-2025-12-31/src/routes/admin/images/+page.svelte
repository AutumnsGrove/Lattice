<svelte:head>
	<title>Media Library - Admin - The Midnight Bloom</title>
</svelte:head>

<div class="admin-media">
	<header class="page-header">
		<h1>Media Library</h1>
		<button class="btn-primary" disabled>Upload</button>
	</header>

	<div class="upload-zone">
		<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
			<polyline points="17 8 12 3 7 8"></polyline>
			<line x1="12" y1="3" x2="12" y2="15"></line>
		</svg>
		<p>Drag and drop files here, or click to browse</p>
		<span class="hint">Supports: JPG, PNG, GIF, WebP (max 10MB)</span>
	</div>

	<div class="media-grid">
		<div class="media-item">
			<div class="media-preview">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="9" cy="9" r="2"></circle>
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
				</svg>
			</div>
			<span class="media-name">jasmine-pearls.jpg</span>
		</div>
		<div class="media-item">
			<div class="media-preview">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="9" cy="9" r="2"></circle>
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
				</svg>
			</div>
			<span class="media-name">cafe-interior.jpg</span>
		</div>
		<div class="media-item">
			<div class="media-preview">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<circle cx="9" cy="9" r="2"></circle>
					<path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
				</svg>
			</div>
			<span class="media-name">copper-kettles.jpg</span>
		</div>
	</div>

	<p class="demo-notice">This is a demonstration. In a real admin panel, you would be able to upload and manage media files.</p>
</div>

<style>
	.admin-media {
		max-width: 1000px;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		color: hsl(var(--foreground));
		margin: 0;
		font-family: system-ui, sans-serif;
	}

	.btn-primary {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-family: system-ui, sans-serif;
		cursor: not-allowed;
		opacity: 0.7;
	}

	.upload-zone {
		background: hsl(var(--card));
		border: 2px dashed hsl(var(--border));
		border-radius: 12px;
		padding: 3rem;
		text-align: center;
		margin-bottom: 2rem;
		color: hsl(var(--muted-foreground));
	}

	.upload-zone svg {
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.upload-zone p {
		margin: 0 0 0.5rem 0;
	}

	.upload-zone .hint {
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.media-item {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		overflow: hidden;
	}

	.media-preview {
		background: hsl(var(--muted));
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: hsl(var(--muted-foreground));
		opacity: 0.5;
	}

	.media-name {
		display: block;
		padding: 0.75rem;
		font-size: 0.85rem;
		color: hsl(var(--foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.demo-notice {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		text-align: center;
	}
</style>
