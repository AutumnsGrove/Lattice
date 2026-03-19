<script lang="ts">
	/**
	 * CurioPoll v2 — Interactive poll with voting UI
	 *
	 * Fetches a poll by ID and renders a full voting experience:
	 * - Glass chip buttons for selecting options (radio/toggle style)
	 * - "Cast vote" confirmation button
	 * - Animated result bars with count-up on reveal
	 * - Pre-vote ghost bars (5% opacity hints)
	 * - 3 container styles: glass, bulletin, minimal
	 * - Per-option emoji + custom color
	 * - Closed state with winner highlight
	 * - Respects prefers-reduced-motion
	 */

	import type { PollOption } from "$lib/curios/polls";

	let { arg = "" }: { arg?: string } = $props();

	interface PollData {
		id: string;
		question: string;
		description: string | null;
		pollType: "single" | "multiple";
		options: PollOption[];
		resultsVisibility: string;
		containerStyle: "glass" | "bulletin" | "minimal";
		isPinned: boolean;
		isClosed: boolean;
		closeDate: string | null;
		results: { totalVotes: number; optionCounts: Record<string, number> } | null;
		hasVoted: boolean;
		totalVotes: number;
	}

	let poll = $state<PollData | null>(null);
	let loading = $state(true);
	let error = $state(false);
	let selectedOptions = $state<Set<string>>(new Set());
	let isVoting = $state(false);
	let justVoted = $state(false);
	let animateResults = $state(false);

	$effect(() => {
		if (!arg) {
			error = true;
			loading = false;
			return;
		}

		fetch(`/api/curios/polls/${encodeURIComponent(arg)}`) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<{ poll: PollData }>;
			})
			.then((d) => {
				poll = d.poll;
				loading = false;
				// If results are already visible, animate them in
				if (d.poll.results) {
					requestAnimationFrame(() => {
						animateResults = true;
					});
				}
			})
			.catch((err) => {
				console.warn("[CurioPoll] Failed to load:", err);
				error = true;
				loading = false;
			});
	});

	function canVote(): boolean {
		if (!poll) return false;
		return !poll.isClosed && !poll.hasVoted;
	}

	function showResults(): boolean {
		if (!poll) return false;
		return poll.results !== null;
	}

	function toggleOption(optionId: string) {
		if (!canVote()) return;

		if (poll?.pollType === "single") {
			// Radio-style: only one selection
			selectedOptions = new Set([optionId]);
		} else {
			// Toggle-style: multiple selections
			const next = new Set(selectedOptions);
			if (next.has(optionId)) {
				next.delete(optionId);
			} else {
				next.add(optionId);
			}
			selectedOptions = next;
		}
	}

	async function castVote() {
		if (!poll || selectedOptions.size === 0 || isVoting) return;

		isVoting = true;
		try {
			const res = await fetch(`/api/curios/polls/${encodeURIComponent(poll.id)}`, { // csrf-ok: public anonymous vote, IP-hash auth
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ selectedOptions: [...selectedOptions] }),
			});

			if (!res.ok) {
				const errData = (await res.json().catch(() => null)) as Record<string, unknown> | null;
				const msg = typeof errData?.message === 'string' ? errData.message : `Vote failed (${res.status})`;
				throw new Error(msg);
			}

			// Re-fetch poll to get updated results
			const updated = await fetch(
				`/api/curios/polls/${encodeURIComponent(poll.id)}`,
			);
			if (updated.ok) {
				const d = (await updated.json()) as { poll: PollData };
				poll = d.poll;
				justVoted = true;
				// Trigger result bar animation
				requestAnimationFrame(() => {
					animateResults = true;
				});
			}
		} catch (err) {
			console.warn("[CurioPoll] Vote failed:", err);
		} finally {
			isVoting = false;
		}
	}

	function getPercentage(optionId: string): number {
		if (!poll?.results || poll.results.totalVotes === 0) return 0;
		const count = poll.results.optionCounts[optionId] ?? 0;
		return Math.round((count / poll.results.totalVotes) * 100);
	}

	function getVoteCount(optionId: string): number {
		if (!poll?.results) return 0;
		return poll.results.optionCounts[optionId] ?? 0;
	}

	function isWinner(optionId: string): boolean {
		if (!poll?.results || !poll.isClosed) return false;
		const counts = poll.results.optionCounts;
		const maxCount = Math.max(...Object.values(counts));
		return maxCount > 0 && (counts[optionId] ?? 0) === maxCount;
	}

	function getBarColor(option: PollOption): string {
		if (option.color) return option.color;
		return "var(--grove-accent)";
	}

	function containerClass(): string {
		const style = poll?.containerStyle ?? "glass";
		return `poll poll-${style}`;
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading poll…</span>
		<div class="poll-skeleton">
			<div class="poll-skeleton-question"></div>
			{#each Array(3) as _}
				<div class="poll-skeleton-option"></div>
			{/each}
		</div>
	</div>
{:else if error}
	{#if !arg}
		<span class="grove-curio-error">No poll ID specified</span>
	{:else}
		<span class="grove-curio-error">Poll unavailable</span>
	{/if}
{:else if poll}
	<div class={containerClass()} role="region" aria-label="Poll: {poll.question}">
		<!-- Header -->
		<div class="poll-header">
			<h3 class="poll-question">{poll.question}</h3>
			{#if poll.isClosed}
				<span class="poll-badge poll-badge-closed">Final results</span>
			{/if}
		</div>

		<!-- Description -->
		{#if poll.description}
			<p class="poll-description">{poll.description}</p>
		{/if}

		<!-- Vote count hint (pre-vote social proof) -->
		{#if poll.totalVotes > 0 && !showResults()}
			<p class="poll-vote-hint">{poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""} so far</p>
		{/if}

		<!-- Options -->
		<div class="poll-options" role={canVote() ? "group" : "list"} aria-label="Poll options">
			{#each poll.options as option (option.id)}
				{@const selected = selectedOptions.has(option.id)}
				{@const pct = getPercentage(option.id)}
				{@const votes = getVoteCount(option.id)}
				{@const winner = isWinner(option.id)}
				{@const barColor = getBarColor(option)}

				{#if canVote()}
					<!-- Voting state: clickable glass chips -->
					<button
						type="button"
						class="poll-chip"
						class:poll-chip-selected={selected}
						class:poll-chip-radio={poll.pollType === "single"}
						class:poll-chip-toggle={poll.pollType === "multiple"}
						onclick={() => toggleOption(option.id)}
						aria-pressed={selected}
						style:--option-color={barColor}
					>
						<!-- Ghost bar (pre-vote hint) -->
						{#if poll.resultsVisibility === "always" && poll.results}
							<div
								class="poll-ghost-bar"
								style:width="{animateResults ? pct : 0}%"
								style:background={barColor}
							></div>
						{/if}

						<span class="poll-chip-content">
							{#if option.emoji}
								<span class="poll-option-emoji">{option.emoji}</span>
							{/if}
							<span class="poll-option-text">{option.text}</span>
						</span>

						<!-- Selection indicator -->
						<span class="poll-chip-indicator" aria-hidden="true">
							{#if poll.pollType === "single"}
								<span class="poll-radio-dot" class:poll-radio-dot-active={selected}></span>
							{:else}
								<span class="poll-check-box" class:poll-check-box-active={selected}>
									{#if selected}✓{/if}
								</span>
							{/if}
						</span>
					</button>
				{:else}
					<!-- Results state: bar display -->
					<div
						class="poll-result"
						class:poll-result-winner={winner}
						style:--option-color={barColor}
					>
						<div
							class="poll-result-bar"
							style:width="{animateResults ? pct : 0}%"
							style:background={barColor}
							role="img"
							aria-label="{option.text}: {pct}% ({votes} vote{votes !== 1 ? 's' : ''})"
						></div>
						<div class="poll-result-content">
							<span class="poll-result-label">
								{#if option.emoji}
									<span class="poll-option-emoji">{option.emoji}</span>
								{/if}
								<span class="poll-option-text">{option.text}</span>
								{#if winner}
									<span class="poll-winner-badge" aria-label="Winner">★</span>
								{/if}
							</span>
							<span class="poll-result-stats">
								{#if showResults()}
									<span class="poll-result-pct">{pct}%</span>
									<span class="poll-result-count">{votes}</span>
								{/if}
							</span>
						</div>
					</div>
				{/if}
			{/each}
		</div>

		<!-- Vote button -->
		{#if canVote()}
			<div class="poll-actions">
				<button
					type="button"
					class="poll-vote-btn"
					disabled={selectedOptions.size === 0 || isVoting}
					onclick={castVote}
				>
					{#if isVoting}
						Casting…
					{:else}
						Cast vote
					{/if}
				</button>
			</div>
		{/if}

		<!-- Footer -->
		<div class="poll-footer">
			{#if showResults() && poll.results}
				<span class="poll-total">
					{poll.results.totalVotes} vote{poll.results.totalVotes !== 1 ? "s" : ""}
				</span>
			{/if}
			{#if justVoted}
				<span class="poll-voted-badge">✓ Vote cast</span>
			{:else if poll.hasVoted && !canVote()}
				<span class="poll-voted-badge">✓ You voted</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* ─── Base Container ─── */
	.poll {
		padding: 1.25rem;
		border-radius: 0.75rem;
		position: relative;
	}

	/* ─── Glass Card Style ─── */
	.poll-glass {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.3);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
	}

	/* ─── Bulletin Board Style ─── */
	.poll-bulletin {
		background: rgba(255, 248, 235, 0.85);
		border: 1px solid rgba(180, 150, 100, 0.3);
		border-radius: 0.25rem;
		box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.1);
		transform: rotate(-0.5deg);
		position: relative;
	}

	.poll-bulletin::before {
		content: "";
		position: absolute;
		top: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: radial-gradient(circle at 40% 35%, #e8c36e, #b8942e);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	/* ─── Minimal Style ─── */
	.poll-minimal {
		background: transparent;
		border: 1px solid rgba(0, 0, 0, 0.08);
		border-radius: 0.5rem;
	}

	/* ─── Header ─── */
	.poll-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.poll-question {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		line-height: 1.4;
		color: var(--color-text);
	}

	.poll-glass .poll-question {
		color: var(--grove-accent);
	}

	.poll-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.poll-badge-closed {
		background: var(--grove-accent-15);
		color: var(--grove-accent);
	}

	/* ─── Description ─── */
	.poll-description {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	/* ─── Vote Hint ─── */
	.poll-vote-hint {
		margin: 0 0 0.75rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		font-style: italic;
	}

	/* ─── Options Container ─── */
	.poll-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* ─── Glass Chip (Vote State) ─── */
	.poll-chip {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.625rem 0.875rem;
		border: 1.5px solid rgba(0, 0, 0, 0.1);
		border-radius: 0.5rem;
		background: rgba(255, 255, 255, 0.5);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		cursor: pointer;
		font-size: 0.9rem;
		color: var(--color-text);
		text-align: left;
		position: relative;
		overflow: hidden;
		transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
	}

	.poll-chip:hover {
		border-color: color-mix(in srgb, var(--option-color, var(--color-primary)) 50%, transparent);
		background: rgba(255, 255, 255, 0.7);
	}

	.poll-chip-selected {
		border-color: var(--option-color, var(--color-primary));
		background: color-mix(in srgb, var(--option-color, var(--color-primary)) 8%, white);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--option-color, var(--color-primary)) 20%, transparent);
	}

	.poll-chip-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		z-index: 1;
		position: relative;
	}

	/* ─── Ghost Bar (Pre-Vote Hint) ─── */
	.poll-ghost-bar {
		position: absolute;
		inset: 0;
		opacity: 0.05;
		border-radius: inherit;
		transition: width 0.6s ease;
	}

	/* ─── Selection Indicators ─── */
	.poll-chip-indicator {
		flex-shrink: 0;
		z-index: 1;
		position: relative;
	}

	.poll-radio-dot {
		display: block;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 50%;
		border: 2px solid rgba(0, 0, 0, 0.2);
		position: relative;
		transition: border-color 0.2s ease;
	}

	.poll-radio-dot-active {
		border-color: var(--option-color, var(--color-primary));
	}

	.poll-radio-dot-active::after {
		content: "";
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: var(--option-color, var(--color-primary));
	}

	.poll-check-box {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 0.25rem;
		border: 2px solid rgba(0, 0, 0, 0.2);
		font-size: 0.7rem;
		font-weight: 700;
		color: white;
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.poll-check-box-active {
		border-color: var(--option-color, var(--color-primary));
		background: var(--option-color, var(--color-primary));
	}

	/* ─── Result Bar (Post-Vote State) ─── */
	.poll-result {
		position: relative;
		padding: 0.625rem 0.875rem;
		border-radius: 0.5rem;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.02);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.poll-result-bar {
		position: absolute;
		inset: 0;
		opacity: 0.15;
		border-radius: inherit;
		transition: width 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.poll-result-winner .poll-result-bar {
		opacity: 0.25;
	}

	.poll-result-content {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.poll-result-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.poll-result-winner .poll-result-label {
		font-weight: 600;
	}

	.poll-option-emoji {
		font-size: 1.1rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.poll-option-text {
		line-height: 1.3;
	}

	.poll-winner-badge {
		color: var(--option-color, var(--color-primary));
		font-size: 0.9rem;
	}

	.poll-result-stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.poll-result-pct {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text);
		min-width: 2.5rem;
		text-align: right;
	}

	.poll-result-count {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		min-width: 1.5rem;
		text-align: right;
	}

	/* ─── Vote Button ─── */
	.poll-actions {
		margin-top: 0.75rem;
	}

	.poll-vote-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1.25rem;
		border: none;
		border-radius: 0.5rem;
		background: var(--grove-accent);
		color: white;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s ease, transform 0.1s ease;
		width: 100%;
	}

	.poll-vote-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.poll-vote-btn:active:not(:disabled) {
		transform: scale(0.98);
	}

	.poll-vote-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* ─── Footer ─── */
	.poll-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.75rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		min-height: 1.5rem;
	}

	.poll-total {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.poll-voted-badge {
		font-size: 0.75rem;
		color: var(--grove-accent);
		font-weight: 500;
		margin-left: auto;
	}

	/* ─── Skeleton ─── */
	.poll-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.poll-skeleton-question {
		height: 1.5rem;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 0.375rem;
		width: 75%;
	}

	.poll-skeleton-option {
		height: 2.5rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 0.5rem;
	}

	/* ─── Dark Mode ─── */
	:global(.dark) .poll-glass {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-bulletin {
		background: rgba(60, 50, 35, 0.6);
		border-color: rgba(180, 150, 100, 0.2);
	}

	:global(.dark) .poll-minimal {
		border-color: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-chip {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.12);
	}

	:global(.dark) .poll-chip:hover {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-chip-selected {
		background: color-mix(in srgb, var(--option-color, var(--color-primary)) 12%, transparent);
	}

	:global(.dark) .poll-radio-dot {
		border-color: rgba(255, 255, 255, 0.25);
	}

	:global(.dark) .poll-check-box {
		border-color: rgba(255, 255, 255, 0.25);
	}

	:global(.dark) .poll-result {
		background: rgba(255, 255, 255, 0.04);
		border-color: rgba(255, 255, 255, 0.06);
	}

	:global(.dark) .poll-footer {
		border-top-color: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .poll-skeleton-question {
		background: rgba(255, 255, 255, 0.1);
	}

	:global(.dark) .poll-skeleton-option {
		background: rgba(255, 255, 255, 0.06);
	}

	/* ─── Reduced Motion ─── */
	@media (prefers-reduced-motion: reduce) {
		.poll-result-bar {
			transition: none;
		}

		.poll-ghost-bar {
			transition: none;
		}

		.poll-chip {
			transition: none;
		}

		.poll-vote-btn {
			transition: none;
		}

		.poll-bulletin {
			transform: none;
		}
	}

	/* ─── Responsive ─── */
	@media (max-width: 480px) {
		.poll {
			padding: 1rem;
		}

		.poll-chip {
			padding: 0.5rem 0.75rem;
		}

		.poll-result {
			padding: 0.5rem 0.75rem;
		}

		.poll-result-stats {
			gap: 0.25rem;
		}
	}
</style>
