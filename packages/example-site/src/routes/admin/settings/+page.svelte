<svelte:head>
	<title>Settings - Admin - The Midnight Bloom</title>
</svelte:head>

<div class="admin-settings">
	<header class="page-header">
		<h1>Site Settings</h1>
	</header>

	<form class="settings-form">
		<section class="settings-section">
			<h2>General</h2>
			<div class="form-group">
				<label for="site-title">Site Title</label>
				<input type="text" id="site-title" value="The Midnight Bloom" disabled />
			</div>
			<div class="form-group">
				<label for="site-tagline">Tagline</label>
				<input type="text" id="site-tagline" value="Open when the stars come out" disabled />
			</div>
			<div class="form-group">
				<label for="site-description">Description</label>
				<textarea id="site-description" rows="3" disabled>A late-night tea café where time slows down. Serving rare teas, quiet conversations, and the comfort of a warm cup in the small hours.</textarea>
			</div>
		</section>

		<section class="settings-section">
			<h2>Contact Information</h2>
			<div class="form-group">
				<label for="address">Address</label>
				<input type="text" id="address" value="742 Twilight Lane, Moonhaven, OR 97401" disabled />
			</div>
			<div class="form-group">
				<label for="email">Email</label>
				<input type="email" id="email" value="hello@midnightbloom.cafe" disabled />
			</div>
		</section>

		<section class="settings-section">
			<h2>Hours</h2>
			<div class="form-row">
				<div class="form-group">
					<label for="open-time">Open</label>
					<input type="text" id="open-time" value="6:00 PM" disabled />
				</div>
				<div class="form-group">
					<label for="close-time">Close</label>
					<input type="text" id="close-time" value="4:00 AM" disabled />
				</div>
			</div>
			<div class="form-group">
				<label for="days">Days Open</label>
				<input type="text" id="days" value="Wednesday - Sunday" disabled />
			</div>
		</section>

		<section class="settings-section">
			<h2>Appearance</h2>
			<div class="form-group">
				<label for="theme">Default Theme</label>
				<select id="theme" disabled>
					<option value="dark" selected>Dark (Midnight)</option>
					<option value="light">Light</option>
				</select>
			</div>
			<div class="form-group">
				<label for="font">Font Family</label>
				<select id="font" disabled>
					<option value="serif" selected>Serif (Georgia)</option>
					<option value="sans">Sans-serif (System)</option>
				</select>
			</div>
		</section>

		<div class="form-actions">
			<button type="submit" class="btn-primary" disabled>Save Changes</button>
		</div>
	</form>

	<p class="demo-notice">This is a demonstration. In a real admin panel, you would be able to modify these settings.</p>
</div>

<style>
	.admin-settings {
		max-width: 700px;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		font-size: 2rem;
		color: hsl(var(--foreground));
		margin: 0;
		font-family: system-ui, sans-serif;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
	}

	.settings-section h2 {
		font-size: 1.1rem;
		color: hsl(var(--foreground));
		margin: 0 0 1.5rem 0;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid hsl(var(--border));
		font-family: system-ui, sans-serif;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group:last-child {
		margin-bottom: 0;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: block;
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
		margin-bottom: 0.5rem;
	}

	input, textarea, select {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-family: inherit;
	}

	input:disabled, textarea:disabled, select:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	textarea {
		resize: vertical;
	}

	.form-actions {
		margin-top: 1rem;
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

	.demo-notice {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		text-align: center;
		margin-top: 2rem;
	}
</style>
