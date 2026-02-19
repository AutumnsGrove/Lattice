/**
 * SearchJobDO - Durable Object for managing domain search jobs
 *
 * Uses Loom SDK for standardized DO patterns: declarative routing,
 * structured logging, alarm scheduling, and SQL helpers.
 * Implements alarm-based batch chaining for long-running searches.
 */

import { LoomDO } from "@autumnsgrove/lattice/loom";
import type { LoomRoute, LoomConfig, LoomRequestContext } from "@autumnsgrove/lattice/loom";
import type {
	Env,
	SearchJob,
	DomainResult,
	SearchArtifact,
	InitialQuizResponse,
	FollowupQuizResponse,
	BatchResult,
	SearchStatus,
} from "./types";
import { generateCandidates, type DomainCandidate } from "./agents/driver";
import { evaluateDomains, filterWorthChecking, type DomainEvaluation } from "./agents/swarm";
import { checkDomainsParallel, type DomainCheckResult } from "./rdap";
import { CerebrasRDAPChecker } from "./cerebras-rdap";
import { getBatchPricing, type DomainPrice } from "./pricing";
import { getProvider, type ProviderName } from "./providers";
import { sendResultsEmail, sendFollowupEmail } from "./email";

/** State tracked by the DO across requests */
interface SearchJobState {
	job: SearchJob | null;
}

export class SearchJobDO extends LoomDO<SearchJobState, Env> {
	config(): LoomConfig {
		return { name: "SearchJobDO", blockOnInit: true };
	}

	schema(): string {
		return `
      -- Core job tracking (single row per DO instance)
      CREATE TABLE IF NOT EXISTS search_job (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        batch_num INTEGER DEFAULT 0,
        quiz_responses TEXT NOT NULL,
        followup_responses TEXT,
        driver_provider TEXT,
        swarm_provider TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        error TEXT,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0
      );

      -- Individual domain results
      CREATE TABLE IF NOT EXISTS domain_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_num INTEGER NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        tld TEXT NOT NULL,
        status TEXT NOT NULL,
        price_cents INTEGER,
        score REAL DEFAULT 0,
        flags TEXT DEFAULT '[]',
        evaluation_data TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Index for faster queries
      CREATE INDEX IF NOT EXISTS idx_domain_results_status
        ON domain_results(status);
      CREATE INDEX IF NOT EXISTS idx_domain_results_batch
        ON domain_results(batch_num);

      -- Artifacts for follow-up generation
      CREATE TABLE IF NOT EXISTS search_artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_num INTEGER NOT NULL,
        artifact_type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `;
	}

	routes(): LoomRoute[] {
		return [
			{ method: "POST", path: "/start", handler: (ctx) => this.handleStart(ctx) },
			{ method: "GET", path: "/status", handler: () => this.handleGetStatus() },
			{ method: "GET", path: "/results", handler: () => this.handleGetResults() },
			{ method: "POST", path: "/resume", handler: (ctx) => this.handleResume(ctx) },
			{ method: "GET", path: "/followup", handler: () => this.handleGetFollowup() },
			{ method: "POST", path: "/cancel", handler: () => this.handleCancel() },
			{ method: "GET", path: "/stream", handler: () => this.handleStream() },
		];
	}

	// ============================================================================
	// Alarm handler
	// ============================================================================

	protected async onAlarm(): Promise<void> {
		const job = this.getJob();
		if (!job) {
			this.log.error("Alarm fired but no job found");
			return;
		}

		if (job.status !== "running") {
			this.log.info(`Job status is ${job.status}, skipping alarm`);
			return;
		}

		try {
			// Process next batch
			const result = await this.processBatch(job);

			// Get updated job state
			const updatedJob = this.getJob();
			if (!updatedJob) return;

			// Check if we should continue
			const maxBatches = parseInt(this.env.MAX_BATCHES || "6", 10);
			const targetResults = parseInt(this.env.TARGET_RESULTS || "25", 10);
			const goodResults = this.getGoodResultsCount();

			this.log.info(
				`Batch ${updatedJob.batch_num} complete: ${result.domains_available} available, ${goodResults} total good`,
			);

			if (goodResults >= targetResults) {
				// Success!
				this.updateJobStatus("complete");
				this.log.info(`Search complete with ${goodResults} good results`);

				// Send results email if client_email is provided
				await this.sendCompletionEmail(updatedJob);

				// Clean up DO storage - workflow complete
				await this.state.storage.deleteAll();
				this.log.info("Workflow complete, storage cleared");
			} else if (updatedJob.batch_num >= maxBatches) {
				// Need follow-up
				this.updateJobStatus("needs_followup");
				this.log.info("Max batches reached, needs follow-up");

				// Generate follow-up quiz
				await this.generateFollowupQuiz(updatedJob);

				// Send follow-up email if client_email is provided
				await this.sendFollowupQuizEmail(updatedJob);
			} else {
				// Schedule next batch (10 second delay between batches)
				await this.alarms.schedule(10 * 1000);
			}
		} catch (error) {
			this.log.error(`Batch processing error: ${error}`);
			this.updateJobStatus("failed", String(error));

			// Clean up DO storage - workflow failed
			await this.state.storage.deleteAll();
			this.log.info("Workflow failed, storage cleared");
		}
	}

	// ============================================================================
	// Route handlers
	// ============================================================================

	/**
	 * Start a new search job
	 */
	private async handleStart(ctx: LoomRequestContext): Promise<Response> {
		const body = (await ctx.request.json()) as {
			job_id: string;
			client_id: string;
			quiz_responses: InitialQuizResponse;
			driver_provider?: string;
			swarm_provider?: string;
		};

		// Check if job already exists
		const existing = this.getJob();
		if (existing) {
			return Response.json({ error: "Job already exists", job_id: existing.id }, { status: 409 });
		}

		// Create job with optional provider overrides
		this.sql.exec(
			`INSERT INTO search_job (id, client_id, status, quiz_responses, driver_provider, swarm_provider)
       VALUES (?, ?, 'running', ?, ?, ?)`,
			body.job_id,
			body.client_id,
			JSON.stringify(body.quiz_responses),
			body.driver_provider ?? null,
			body.swarm_provider ?? null,
		);

		// Start first batch immediately via alarm
		await this.alarms.schedule(0);

		return Response.json({ job_id: body.job_id, status: "running" }, { status: 201 });
	}

	/**
	 * Get current job status
	 */
	private handleGetStatus(): Response {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		const domainsChecked = this.getTotalDomainsChecked();
		const goodResults = this.getGoodResultsCount();
		const availableDomains = this.getAvailableDomainsCount();
		const tokens = this.getTokenUsage();

		return Response.json({
			job_id: job.id,
			status: job.status,
			batch_num: job.batch_num,
			domains_checked: domainsChecked,
			domains_available: availableDomains,
			good_results: goodResults,
			input_tokens: tokens.input,
			output_tokens: tokens.output,
			created_at: job.created_at,
			updated_at: job.updated_at,
		});
	}

	/**
	 * Get search results
	 */
	private handleGetResults(): Response {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		// Get all available domains, sorted by score then price
		const results = this.sql.queryAll<DomainResult>(
			`SELECT * FROM domain_results
       WHERE status = 'available'
       ORDER BY score DESC, price_cents ASC NULLS LAST
       LIMIT 50`,
		);

		// Format results with pricing display
		const formattedResults = results.map((r) => ({
			...r,
			flags: typeof r.flags === "string" ? JSON.parse(r.flags) : r.flags,
			evaluation_data:
				typeof r.evaluation_data === "string" ? JSON.parse(r.evaluation_data) : r.evaluation_data,
			price_display: r.price_cents ? `$${(r.price_cents / 100).toFixed(2)}/yr` : "Price unknown",
			pricing_category: r.price_cents
				? r.price_cents <= 3000
					? "bundled"
					: r.price_cents <= 5000
						? "recommended"
						: "premium"
				: "unknown",
		}));

		// Pricing summary
		const pricingSummary = this.getPricingSummary();

		// Token usage
		const usage = this.getTokenUsage();

		return Response.json({
			job_id: job.id,
			status: job.status,
			batch_num: job.batch_num,
			domains: formattedResults,
			total_checked: this.getTotalDomainsChecked(),
			pricing_summary: pricingSummary,
			usage: {
				input_tokens: usage.input,
				output_tokens: usage.output,
				total_tokens: usage.input + usage.output,
			},
		});
	}

	/**
	 * Resume search with follow-up responses
	 */
	private async handleResume(ctx: LoomRequestContext): Promise<Response> {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		if (job.status !== "needs_followup") {
			return Response.json({ error: "Job not awaiting follow-up" }, { status: 400 });
		}

		const body = (await ctx.request.json()) as { followup_responses: FollowupQuizResponse };

		// Update job with follow-up responses
		this.sql.exec(
			`UPDATE search_job
       SET status = 'running',
           followup_responses = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
			JSON.stringify(body.followup_responses),
			job.id,
		);

		// Resume with new batch
		await this.alarms.schedule(0);

		return Response.json({ job_id: job.id, status: "running" });
	}

	/**
	 * Cancel a running job
	 */
	private async handleCancel(): Promise<Response> {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		if (job.status !== "running" && job.status !== "pending") {
			return Response.json(
				{ error: "Job not running", status: job.status, job_id: job.id },
				{ status: 400 },
			);
		}

		// Update status to cancelled
		this.updateJobStatus("cancelled");

		// Clean up DO storage - workflow cancelled
		await this.state.storage.deleteAll();
		this.log.info("Workflow cancelled, storage cleared");

		return Response.json({
			job_id: job.id,
			status: "cancelled",
			message: "Job cancelled successfully",
		});
	}

	/**
	 * Get follow-up quiz
	 */
	private handleGetFollowup(): Response {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		// Get the most recent follow-up quiz artifact
		const artifact = this.sql.queryOne<SearchArtifact>(
			`SELECT * FROM search_artifacts
       WHERE artifact_type = 'followup_quiz'
       ORDER BY created_at DESC
       LIMIT 1`,
		);

		if (!artifact) {
			return Response.json({ error: "No follow-up quiz available" }, { status: 404 });
		}

		return new Response(artifact.content, {
			headers: { "Content-Type": "application/json" },
		});
	}

	/**
	 * SSE stream for real-time progress updates
	 */
	private handleStream(): Response {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		const domainsChecked = this.getTotalDomainsChecked();
		const goodResults = this.getGoodResultsCount();
		const availableDomains = this.getAvailableDomainsCount();

		// Get recent available domains for streaming effect
		const recentDomains = this.getRecentAvailableDomains(10);

		// Check domain_idea status if provided
		let domainIdeaStatus = null;
		const quiz = job.quiz_responses;
		if (quiz.domain_idea) {
			domainIdeaStatus = this.getDomainIdeaStatus(quiz.domain_idea);
		}

		const data = JSON.stringify({
			event: "status",
			job_id: job.id,
			status: job.status,
			batch_num: job.batch_num,
			domains_checked: domainsChecked,
			domains_available: availableDomains,
			good_results: goodResults,
			recent_domains: recentDomains,
			domain_idea_status: domainIdeaStatus,
		});

		return new Response(`data: ${data}\n\n`, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	}

	// ============================================================================
	// Helper methods
	// ============================================================================

	private getJob(): SearchJob | null {
		const row = this.sql.queryOne<{
			id: string;
			client_id: string;
			status: string;
			batch_num: number;
			quiz_responses: string;
			followup_responses: string | null;
			driver_provider: string | null;
			swarm_provider: string | null;
			created_at: string;
			updated_at: string;
			error: string | null;
		}>("SELECT * FROM search_job LIMIT 1");

		if (!row) return null;

		return {
			id: row.id,
			client_id: row.client_id,
			status: row.status as SearchStatus,
			batch_num: row.batch_num,
			quiz_responses: JSON.parse(row.quiz_responses),
			followup_responses: row.followup_responses ? JSON.parse(row.followup_responses) : undefined,
			driver_provider: row.driver_provider ?? undefined,
			swarm_provider: row.swarm_provider ?? undefined,
			created_at: row.created_at,
			updated_at: row.updated_at,
			error: row.error ?? undefined,
		};
	}

	private updateJobStatus(status: SearchStatus, error?: string): void {
		if (error) {
			this.sql.exec(
				`UPDATE search_job
         SET status = ?, error = ?, updated_at = datetime('now')`,
				status,
				error,
			);
		} else {
			this.sql.exec(
				`UPDATE search_job
         SET status = ?, updated_at = datetime('now')`,
				status,
			);
		}
	}

	private incrementBatchNum(): number {
		this.sql.exec(
			`UPDATE search_job
       SET batch_num = batch_num + 1, updated_at = datetime('now')`,
		);
		const job = this.getJob();
		return job?.batch_num ?? 0;
	}

	private addTokenUsage(inputTokens: number, outputTokens: number): void {
		this.sql.exec(
			`UPDATE search_job
       SET total_input_tokens = total_input_tokens + ?,
           total_output_tokens = total_output_tokens + ?,
           updated_at = datetime('now')`,
			inputTokens,
			outputTokens,
		);
	}

	private getTokenUsage(): { input: number; output: number } {
		const result = this.sql.queryOne<{
			total_input_tokens: number;
			total_output_tokens: number;
		}>("SELECT total_input_tokens, total_output_tokens FROM search_job LIMIT 1");
		return {
			input: result?.total_input_tokens ?? 0,
			output: result?.total_output_tokens ?? 0,
		};
	}

	private getTotalDomainsChecked(): number {
		const result = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM domain_results",
		);
		return result?.count ?? 0;
	}

	private getAvailableDomainsCount(): number {
		const result = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM domain_results WHERE status = 'available'",
		);
		return result?.count ?? 0;
	}

	private getGoodResultsCount(): number {
		const result = this.sql.queryOne<{ count: number }>(
			`SELECT COUNT(*) as count FROM domain_results
       WHERE status = 'available' AND score >= 0.8`,
		);
		return result?.count ?? 0;
	}

	private getCheckedDomains(): string[] {
		const results = this.sql.queryAll<{ domain: string }>("SELECT domain FROM domain_results");
		return results.map((r) => r.domain);
	}

	private getAvailableDomains(): string[] {
		const results = this.sql.queryAll<{ domain: string }>(
			"SELECT domain FROM domain_results WHERE status = 'available'",
		);
		return results.map((r) => r.domain);
	}

	/**
	 * Get recent available domains for live streaming effect
	 */
	private getRecentAvailableDomains(limit: number = 10): DomainResult[] {
		const results = this.sql.queryAll<{
			id: number;
			batch_num: number;
			domain: string;
			tld: string;
			status: string;
			price_cents: number | null;
			score: number;
			flags: string;
			evaluation_data: string | null;
			created_at: string;
		}>(
			`SELECT * FROM domain_results
       WHERE status = 'available'
       ORDER BY id DESC
       LIMIT ?`,
			limit,
		);

		return results.map((r) => ({
			id: r.id,
			batch_num: r.batch_num,
			domain: r.domain,
			tld: r.tld,
			status: r.status as "available" | "registered" | "unknown",
			price_cents: r.price_cents ?? undefined,
			score: r.score,
			flags: r.flags ? JSON.parse(r.flags) : [],
			evaluation_data: r.evaluation_data ? JSON.parse(r.evaluation_data) : undefined,
			created_at: r.created_at,
		}));
	}

	/**
	 * Check if user's domain idea has been checked and its availability
	 */
	private getDomainIdeaStatus(domainIdea: string): {
		available: boolean;
		checked: boolean;
		price_cents?: number;
	} {
		const result = this.sql.queryOne<{
			status: string;
			price_cents: number | null;
		}>(
			"SELECT status, price_cents FROM domain_results WHERE LOWER(domain) = ? LIMIT 1",
			domainIdea.toLowerCase(),
		);

		if (!result) {
			return { available: false, checked: false };
		}

		return {
			available: result.status === "available",
			checked: true,
			price_cents: result.price_cents ?? undefined,
		};
	}

	private getPricingSummary(): Record<string, number> {
		const rows = this.sql.queryAll<{ category: string; count: number }>(
			`SELECT
        CASE
          WHEN price_cents IS NULL THEN 'unknown'
          WHEN price_cents <= 3000 THEN 'bundled'
          WHEN price_cents <= 5000 THEN 'recommended'
          WHEN price_cents > 5000 THEN 'premium'
          ELSE 'standard'
        END as category,
        COUNT(*) as count
      FROM domain_results
      WHERE status = 'available'
      GROUP BY category`,
		);

		const summary: Record<string, number> = {
			bundled: 0,
			recommended: 0,
			standard: 0,
			premium: 0,
			unknown: 0,
		};

		for (const row of rows) {
			summary[row.category] = row.count;
		}

		return summary;
	}

	private saveDomainResult(result: DomainResult): void {
		try {
			this.sql.exec(
				`INSERT OR REPLACE INTO domain_results
         (batch_num, domain, tld, status, price_cents, score, flags, evaluation_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				result.batch_num,
				result.domain,
				result.tld,
				result.status,
				result.price_cents ?? null,
				result.score,
				JSON.stringify(result.flags),
				result.evaluation_data ? JSON.stringify(result.evaluation_data) : null,
			);
		} catch (error) {
			this.log.error(`Failed to save domain result for ${result.domain}: ${error}`);
		}
	}

	private saveArtifact(artifact: SearchArtifact): void {
		this.sql.exec(
			`INSERT INTO search_artifacts (batch_num, artifact_type, content)
       VALUES (?, ?, ?)`,
			artifact.batch_num,
			artifact.artifact_type,
			artifact.content,
		);
	}

	// ============================================================================
	// Core batch processing logic
	// ============================================================================

	/**
	 * Process a single batch - the main orchestration logic
	 *
	 * Flow:
	 * 1. Driver agent generates domain candidates
	 * 2. Swarm agent evaluates candidates in parallel
	 * 3. RDAP checker verifies availability
	 * 4. Store results
	 */
	private async processBatch(job: SearchJob): Promise<BatchResult> {
		const batchNum = this.incrementBatchNum();
		const startTime = Date.now();

		// Create providers - default to OpenRouter for ZDR compliance, with DeepSeek as fallback
		const driverProviderName = (job.driver_provider ||
			this.env.DRIVER_PROVIDER ||
			"openrouter") as ProviderName;
		const swarmProviderName = (job.swarm_provider ||
			this.env.SWARM_PROVIDER ||
			"openrouter") as ProviderName;

		const driverProvider = getProvider(driverProviderName, this.env);
		const swarmProvider = getProvider(swarmProviderName, this.env);

		const quiz = job.quiz_responses;
		const maxBatches = parseInt(this.env.MAX_BATCHES || "6", 10);

		// Build previous results context
		const checkedDomains = this.getCheckedDomains();
		const availableDomains = this.getAvailableDomains();
		const targetCount = parseInt(this.env.TARGET_RESULTS || "25", 10);

		const previousResults =
			batchNum > 1
				? {
						checked_count: checkedDomains.length,
						available_count: availableDomains.length,
						target_count: targetCount,
						tried_summary: checkedDomains.slice(-50).join(", ") || "None yet",
						available_summary: availableDomains.slice(-20).join(", ") || "None yet",
						taken_patterns: this.analyzeTakenPatterns(checkedDomains, availableDomains),
					}
				: undefined;

		this.log.info(`Processing batch ${batchNum} for "${quiz.business_name}"`);

		// Step 1: Generate candidates via Driver agent
		this.log.info(`Step 1: Generating candidates using ${driverProviderName}...`);
		const driverResult = await generateCandidates(driverProvider, {
			businessName: quiz.business_name,
			tldPreferences: quiz.tld_preferences,
			vibe: quiz.vibe,
			batchNum,
			count: 50,
			maxBatches,
			domainIdea: quiz.domain_idea,
			keywords: quiz.keywords,
			diverseTlds: quiz.diverse_tlds,
			previousResults,
		});

		this.addTokenUsage(driverResult.inputTokens, driverResult.outputTokens);
		this.log.info(`Generated ${driverResult.candidates.length} candidates`);

		// Filter out already checked domains
		const checkedSet = new Set(checkedDomains.map((d) => d.toLowerCase()));
		const newCandidates = driverResult.candidates.filter(
			(c) => !checkedSet.has(c.domain.toLowerCase()),
		);

		if (newCandidates.length === 0) {
			this.log.info("No new candidates to evaluate");
			return {
				batch_num: batchNum,
				candidates_generated: driverResult.candidates.length,
				candidates_evaluated: 0,
				domains_checked: 0,
				domains_available: 0,
				new_good_results: 0,
				duration_ms: Date.now() - startTime,
			};
		}

		// Step 2: Evaluate candidates via Swarm agent
		this.log.info(
			`Step 2: Evaluating ${newCandidates.length} candidates using ${swarmProviderName}...`,
		);
		const swarmResult = await evaluateDomains(swarmProvider, {
			domains: newCandidates.map((c) => c.domain),
			vibe: quiz.vibe,
			businessName: quiz.business_name,
		});

		this.addTokenUsage(swarmResult.inputTokens, swarmResult.outputTokens);

		// Filter to worth-checking domains
		const worthChecking = filterWorthChecking(swarmResult.evaluations);
		this.log.info(`${worthChecking.length} domains worth checking`);

		if (worthChecking.length === 0) {
			// Save all as not worth checking
			for (const evalResult of swarmResult.evaluations) {
				const candidate = newCandidates.find((c) => c.domain === evalResult.domain);
				this.saveDomainResult({
					batch_num: batchNum,
					domain: evalResult.domain,
					tld: candidate?.tld || evalResult.domain.split(".").pop() || "",
					status: "unknown",
					score: evalResult.score,
					flags: evalResult.flags,
					evaluation_data: { reason: "not_worth_checking" },
				});
			}

			return {
				batch_num: batchNum,
				candidates_generated: driverResult.candidates.length,
				candidates_evaluated: swarmResult.evaluations.length,
				domains_checked: 0,
				domains_available: 0,
				new_good_results: 0,
				duration_ms: Date.now() - startTime,
			};
		}

		// Step 3: Check availability via RDAP or Cerebras
		this.log.info(`Step 3: Checking availability for ${worthChecking.length} domains...`);
		const domainsToCheck = worthChecking.map((e) => e.domain);
		let rdapResults: DomainCheckResult[];
		if (this.env.USE_CEREBRAS_RDAP === "true") {
			this.log.info("Using Cerebras RDAP checker");
			const cerebrasChecker = new CerebrasRDAPChecker(this.env);
			rdapResults = await cerebrasChecker.checkDomains(domainsToCheck);
		} else {
			this.log.info("Using traditional RDAP checker");
			rdapResults = await checkDomainsParallel(domainsToCheck, 5, 500);
		}

		// Step 4: Get pricing for available domains
		const availableDomainsList = rdapResults
			.filter((r) => r.status === "available")
			.map((r) => r.domain);

		this.log.info(
			`Step 4: Getting pricing for ${availableDomainsList.length} available domains...`,
		);
		let pricingMap = new Map<string, DomainPrice>();
		try {
			pricingMap = await getBatchPricing(availableDomainsList);
			this.log.info(`Got pricing for ${pricingMap.size} domains`);
		} catch (error) {
			this.log.warn(`Failed to fetch pricing, continuing without: ${error}`);
		}

		// Map evaluations by domain for quick lookup
		const evalMap = new Map<string, DomainEvaluation>();
		for (const e of swarmResult.evaluations) {
			evalMap.set(e.domain.toLowerCase(), e);
		}

		// Step 5: Save results
		let domainsAvailable = 0;
		let newGoodResults = 0;

		for (const rdapResult of rdapResults) {
			const evaluation = evalMap.get(rdapResult.domain.toLowerCase());
			const candidate = newCandidates.find(
				(c) => c.domain.toLowerCase() === rdapResult.domain.toLowerCase(),
			);
			const pricing = pricingMap.get(rdapResult.domain);

			const domainResult: DomainResult = {
				batch_num: batchNum,
				domain: rdapResult.domain,
				tld: candidate?.tld || rdapResult.domain.split(".").pop() || "",
				status: rdapResult.status,
				price_cents: pricing?.priceCents ?? undefined,
				score: evaluation?.score ?? 0.5,
				flags: evaluation?.flags ?? [],
				evaluation_data: {
					pronounceable: evaluation?.pronounceable,
					memorable: evaluation?.memorable,
					brand_fit: evaluation?.brandFit,
					email_friendly: evaluation?.emailFriendly,
					notes: evaluation?.notes,
					rdap_registrar: rdapResult.registrar,
					rdap_expiration: rdapResult.expiration,
					pricing_category: pricing?.category,
					renewal_cents: pricing?.renewalCents,
				},
			};

			this.saveDomainResult(domainResult);

			if (rdapResult.status === "available") {
				domainsAvailable++;
				if ((evaluation?.score ?? 0) >= 0.4) {
					newGoodResults++;
				}
			}
		}

		// Also save skipped domains (low score)
		for (const evalItem of swarmResult.evaluations) {
			if (!worthChecking.find((w) => w.domain === evalItem.domain)) {
				const candidate = newCandidates.find((c) => c.domain === evalItem.domain);
				this.saveDomainResult({
					batch_num: batchNum,
					domain: evalItem.domain,
					tld: candidate?.tld || evalItem.domain.split(".").pop() || "",
					status: "unknown",
					score: evalItem.score,
					flags: evalItem.flags,
					evaluation_data: { reason: "low_score", notes: evalItem.notes },
				});
			}
		}

		this.log.info(
			`Batch ${batchNum} complete: ${domainsAvailable} available, ${newGoodResults} good`,
		);

		const result: BatchResult = {
			batch_num: batchNum,
			candidates_generated: driverResult.candidates.length,
			candidates_evaluated: swarmResult.evaluations.length,
			domains_checked: rdapResults.length,
			domains_available: domainsAvailable,
			new_good_results: newGoodResults,
			duration_ms: Date.now() - startTime,
		};

		// Save batch report artifact
		this.saveArtifact({
			batch_num: batchNum,
			artifact_type: "batch_report",
			content: JSON.stringify(result),
		});

		return result;
	}

	/**
	 * Analyze patterns in taken domains to help driver avoid them
	 */
	private analyzeTakenPatterns(checked: string[], available: string[]): string {
		const availableSet = new Set(available.map((d) => d.toLowerCase()));
		const taken = checked.filter((d) => !availableSet.has(d.toLowerCase()));

		if (taken.length === 0) return "No clear patterns yet";

		// Count TLDs
		const tldCounts: Record<string, number> = {};
		for (const domain of taken) {
			const tld = domain.split(".").pop() || "";
			tldCounts[tld] = (tldCounts[tld] || 0) + 1;
		}

		const patterns: string[] = [];

		// Most taken TLDs
		const sortedTlds = Object.entries(tldCounts)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3);

		if (sortedTlds.length > 0) {
			patterns.push(
				`Most taken TLDs: ${sortedTlds.map(([tld, count]) => `.${tld} (${count})`).join(", ")}`,
			);
		}

		return patterns.join("; ") || "Various patterns all taken";
	}

	// ============================================================================
	// Email methods (via Zephyr service binding)
	// ============================================================================

	/**
	 * Send completion email with results
	 */
	private async sendCompletionEmail(job: SearchJob): Promise<void> {
		const clientEmail = job.quiz_responses.client_email;
		if (!clientEmail || !this.env.ZEPHYR || !this.env.ZEPHYR_API_KEY) {
			this.log.info("Skipping results email: no client_email or Zephyr config");
			return;
		}

		try {
			// Get top available domains
			const domains = this.sql.queryAll<DomainResult>(
				`SELECT * FROM domain_results
         WHERE status = 'available'
         ORDER BY score DESC, price_cents ASC NULLS LAST
         LIMIT 20`,
			);

			// Format domains for email
			const formattedDomains = domains.map((d) => ({
				...d,
				flags: typeof d.flags === "string" ? JSON.parse(d.flags) : d.flags,
			}));

			// Build URLs
			const baseUrl = "https://domains.grove.place";
			const resultsUrl = `${baseUrl}/results/${job.id}`;
			const bookingUrl = `${baseUrl}/booking`;

			await sendResultsEmail(this.env.ZEPHYR, this.env.ZEPHYR_API_KEY, {
				client_email: clientEmail,
				business_name: job.quiz_responses.business_name,
				domains: formattedDomains,
				results_url: resultsUrl,
				booking_url: bookingUrl,
			});

			this.log.info(`Sent results email to ${clientEmail}`);
		} catch (error) {
			this.log.error(`Failed to send results email: ${error}`);
			// Don't fail the job if email fails
		}
	}

	/**
	 * Send follow-up quiz email
	 */
	private async sendFollowupQuizEmail(job: SearchJob): Promise<void> {
		const clientEmail = job.quiz_responses.client_email;
		if (!clientEmail || !this.env.ZEPHYR || !this.env.ZEPHYR_API_KEY) {
			this.log.info("Skipping follow-up email: no client_email or Zephyr config");
			return;
		}

		try {
			const baseUrl = "https://domains.grove.place";
			const quizUrl = `${baseUrl}/followup/${job.id}`;

			await sendFollowupEmail(this.env.ZEPHYR, this.env.ZEPHYR_API_KEY, {
				client_email: clientEmail,
				business_name: job.quiz_responses.business_name,
				quiz_url: quizUrl,
				batches_completed: job.batch_num,
				domains_checked: this.getTotalDomainsChecked(),
			});

			this.log.info(`Sent follow-up email to ${clientEmail}`);
		} catch (error) {
			this.log.error(`Failed to send follow-up email: ${error}`);
			// Don't fail the job if email fails
		}
	}

	/**
	 * Generate follow-up quiz when search needs refinement
	 */
	private async generateFollowupQuiz(job: SearchJob): Promise<void> {
		this.log.info(`Generating follow-up quiz for job ${job.id}`);

		try {
			const domainsChecked = this.getTotalDomainsChecked();
			const goodResults = this.getGoodResultsCount();
			const targetResults = parseInt(this.env.TARGET_RESULTS || "25", 10);

			const followupQuiz = {
				job_id: job.id,
				questions: [
					{
						id: "followup_direction",
						type: "single_select" as const,
						prompt: "Your preferred name wasn't available. What would you like to try?",
						required: true,
						options: [
							{ value: "variation", label: "Try variations of the same name" },
							{ value: "different_tld", label: "Try different domain endings (.co, .io, etc.)" },
							{ value: "new_name", label: "Explore completely different names" },
						],
					},
					{
						id: "followup_length",
						type: "single_select" as const,
						prompt: "Short names are mostly taken. What's your preference?",
						required: true,
						options: [
							{ value: "keep_short", label: "Keep trying for short names" },
							{ value: "longer_ok", label: "Longer, more descriptive names are fine" },
							{ value: "compound", label: "Try compound words or phrases" },
						],
					},
					{
						id: "followup_keywords",
						type: "text" as const,
						prompt: "Any new keywords or themes to explore?",
						required: false,
						placeholder: "e.g., local, artisan, modern",
					},
				],
				context: {
					batches_completed: job.batch_num,
					domains_checked: domainsChecked,
					good_found: goodResults,
					target: targetResults,
				},
			};

			this.saveArtifact({
				batch_num: job.batch_num,
				artifact_type: "followup_quiz",
				content: JSON.stringify(followupQuiz),
			});

			this.log.info(`Generated follow-up quiz with ${followupQuiz.questions.length} questions`);
		} catch (error) {
			this.log.error(`Failed to generate follow-up quiz: ${error}`);
		}
	}
}
