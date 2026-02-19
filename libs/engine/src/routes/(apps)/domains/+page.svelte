<script lang="ts">
	/**
	 * Forage - AI-Powered Domain Discovery
	 *
	 * Enhanced placeholder page for the domains.grove.place app.
	 * Forage uses a terminal-style interface to help you find the
	 * perfect domain name through AI-powered suggestions.
	 *
	 * Features:
	 * - Natural language input
	 * - Real-time RDAP availability checking
	 * - Price comparison across registrars
	 * - Follow-up quiz for refinement
	 *
	 * Full implementation: docs/specs/forage-spec.md
	 */
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";

	// Simulated typing animation state
	let cursorVisible = $state(true);

	// Standard terminal cursor blink rate (500ms on/off cycle)
	$effect(() => {
		const interval = setInterval(() => {
			cursorVisible = !cursorVisible;
		}, 500);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Forage | AI-Powered Domain Discovery</title>
	<meta name="description" content="Find the perfect domain name with AI-powered suggestions." />
</svelte:head>

<div class="forage-placeholder">
	<GlassCard variant="dark" class="terminal-card">
		<!-- Terminal Header Bar -->
		<div class="terminal-header">
			<div class="terminal-buttons">
				<span class="terminal-btn close"></span>
				<span class="terminal-btn minimize"></span>
				<span class="terminal-btn maximize"></span>
			</div>
			<span class="terminal-title">forage — domain discovery</span>
			<div class="terminal-spacer"></div>
		</div>

		<!-- Terminal Content -->
		<div class="terminal-content">
			<!-- ASCII Art Header -->
			<pre class="ascii-header" aria-label="Forage ASCII Art Logo">
┌─────────────────────────────────────────────┐
│  <span class="tree">*</span> <span class="highlight">Forage</span> - Domain Discovery              │
│     Find your perfect corner of the web     │
└─────────────────────────────────────────────┘</pre>

			<!-- Help Command Output -->
			<div class="terminal-line">
				<span class="prompt">$</span>
				<span class="command">forage --help</span>
			</div>

			<div class="output">
				<p class="output-title">AI-powered domain name discovery</p>
				<p class="output-desc">Find the perfect domain for your project using natural language</p>
			</div>

			<!-- Features List -->
			<div class="features">
				<div class="feature-line">
					<span class="check">✓</span>
					<span>Natural language input</span>
				</div>
				<div class="feature-line">
					<span class="check">✓</span>
					<span>Real-time availability checking (RDAP)</span>
				</div>
				<div class="feature-line">
					<span class="check">✓</span>
					<span>Price comparison across registrars</span>
				</div>
				<div class="feature-line">
					<span class="check">✓</span>
					<span>AI-powered suggestions (up to 6 batches)</span>
				</div>
				<div class="feature-line">
					<span class="check">✓</span>
					<span>Follow-up quiz for refinement</span>
				</div>
			</div>

			<!-- Example Usage -->
			<div class="terminal-line example">
				<span class="prompt">$</span>
				<span class="command">forage search</span>
				<span class="flag">--idea</span>
				<span class="arg">"cozy blog about tea and coding"</span>
			</div>

			<div class="output example-output">
				<p class="dim">Searching for domains...</p>
				<p><span class="available">✓ available</span> cozyteacode.com</p>
				<p><span class="available">✓ available</span> brewandcode.dev</p>
				<p><span class="taken">✗ taken</span> teacoding.io</p>
				<p><span class="available">✓ available</span> steepstack.dev</p>
			</div>

			<!-- Coming Soon -->
			<div class="terminal-line coming-soon-line">
				<span class="prompt">$</span>
				<span class="command blink">[ Coming in Full Bloom ]</span>
				<span class="cursor" class:visible={cursorVisible}>▋</span>
			</div>
		</div>
	</GlassCard>
</div>

<style>
	.forage-placeholder {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(
			135deg,
			#0d1117 0%,
			#161b22 50%,
			#0d1117 100%
		);
	}

	:global(.terminal-card) {
		max-width: 650px;
		width: 100%;
		/*
		 * Terminal font stack: Falls back gracefully to system monospace fonts.
		 * JetBrains Mono/Fira Code are not bundled - users see them if installed locally,
		 * otherwise gets SF Mono (macOS), Consolas (Windows), or system monospace.
		 */
		font-family: "JetBrains Mono", "Fira Code", "SF Mono", Menlo, Monaco, Consolas, monospace;
		background: rgba(13, 17, 23, 0.95) !important;
		border: 1px solid rgba(48, 54, 61, 0.8) !important;
		box-shadow:
			0 16px 70px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.05) inset;
	}

	.terminal-header {
		display: flex;
		align-items: center;
		padding: 0.75rem 1rem;
		background: rgba(22, 27, 34, 0.8);
		border-bottom: 1px solid rgba(48, 54, 61, 0.6);
		border-radius: 0.75rem 0.75rem 0 0;
	}

	.terminal-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.terminal-btn {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}

	.terminal-btn.close {
		background: #ff5f56;
	}

	.terminal-btn.minimize {
		background: #ffbd2e;
	}

	.terminal-btn.maximize {
		background: #27c93f;
	}

	.terminal-title {
		flex: 1;
		text-align: center;
		font-size: 0.8rem;
		color: #8b949e;
	}

	.terminal-spacer {
		width: 52px; /* Balance the buttons */
	}

	.terminal-content {
		padding: 1.5rem;
	}

	.ascii-header {
		color: #58a6ff;
		font-size: 0.85rem;
		line-height: 1.4;
		margin: 0 0 1.5rem 0;
		white-space: pre;
	}

	.ascii-header .highlight {
		color: #7ee787;
		font-weight: bold;
	}

	.ascii-header .tree {
		color: #7ee787;
	}

	.terminal-line {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	.prompt {
		color: #7ee787;
		font-weight: bold;
	}

	.command {
		color: #f0f6fc;
	}

	.flag {
		color: #ff7b72;
	}

	.arg {
		color: #a5d6ff;
	}

	.output {
		margin-left: 1rem;
		margin-bottom: 1.25rem;
		padding-left: 1rem;
		border-left: 2px solid rgba(88, 166, 255, 0.3);
	}

	.output-title {
		color: #f0f6fc;
		font-size: 0.95rem;
		margin: 0 0 0.25rem 0;
	}

	.output-desc {
		color: #8b949e;
		font-size: 0.85rem;
		margin: 0;
	}

	.features {
		margin: 1.5rem 0;
		padding: 1rem;
		background: rgba(22, 27, 34, 0.5);
		border-radius: 0.5rem;
		border: 1px solid rgba(48, 54, 61, 0.4);
	}

	.feature-line {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.4rem 0;
		font-size: 0.9rem;
		color: #c9d1d9;
	}

	.check {
		color: #7ee787;
		font-weight: bold;
	}

	.terminal-line.example {
		margin-top: 1.5rem;
	}

	.example-output {
		font-size: 0.85rem;
	}

	.example-output p {
		margin: 0.3rem 0;
		color: #c9d1d9;
	}

	.dim {
		color: #8b949e;
	}

	.available {
		color: #7ee787;
	}

	.taken {
		color: #f85149;
	}

	.coming-soon-line {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(48, 54, 61, 0.4);
	}

	.blink {
		color: #f0883e;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	.cursor {
		color: #58a6ff;
		opacity: 0;
		transition: opacity 0.1s;
	}

	.cursor.visible {
		opacity: 1;
	}

	/* Responsive adjustments */
	@media (max-width: 500px) {
		.terminal-content {
			padding: 1rem;
		}

		.ascii-header {
			font-size: 0.7rem;
		}

		.feature-line {
			font-size: 0.8rem;
		}
	}

	/* Accessibility: Respect reduced motion preferences */
	@media (prefers-reduced-motion: reduce) {
		.blink {
			animation: none;
			opacity: 1;
		}

		.cursor {
			/* Keep cursor visible but static */
			opacity: 1;
			transition: none;
		}

		.cursor.visible {
			opacity: 1;
		}
	}
</style>
