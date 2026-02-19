/**
 * Job Index - D1-based centralized registry of search jobs
 *
 * This provides discoverability for jobs that exist in Durable Objects.
 * The DO remains the source of truth for detailed data; this index
 * enables listing and basic status tracking.
 */

export interface JobIndexEntry {
	job_id: string;
	client_id: string;
	status: string;
	business_name: string | null;
	batch_num: number;
	domains_checked: number;
	good_results: number;
	input_tokens: number;
	output_tokens: number;
	created_at: string;
	updated_at: string;
}

export interface ListJobsOptions {
	limit?: number;
	offset?: number;
	status?: string;
}

export interface ListJobsResult {
	jobs: JobIndexEntry[];
	total: number;
	limit: number;
	offset: number;
}

/**
 * Create a new job in the index
 */
export async function createJobIndex(
	db: D1Database,
	jobId: string,
	clientId: string,
	businessName?: string,
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO job_index (job_id, client_id, status, business_name, created_at, updated_at)
     VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))`,
		)
		.bind(jobId, clientId, businessName ?? null)
		.run();
}

/**
 * Update job status in the index
 */
export async function updateJobIndex(
	db: D1Database,
	jobId: string,
	updates: {
		status?: string;
		batch_num?: number;
		domains_checked?: number;
		good_results?: number;
		input_tokens?: number;
		output_tokens?: number;
	},
): Promise<void> {
	const fields: string[] = ["updated_at = datetime('now')"];
	const values: (string | number)[] = [];

	if (updates.status !== undefined) {
		fields.push("status = ?");
		values.push(updates.status);
	}
	if (updates.batch_num !== undefined) {
		fields.push("batch_num = ?");
		values.push(updates.batch_num);
	}
	if (updates.domains_checked !== undefined) {
		fields.push("domains_checked = ?");
		values.push(updates.domains_checked);
	}
	if (updates.good_results !== undefined) {
		fields.push("good_results = ?");
		values.push(updates.good_results);
	}
	if (updates.input_tokens !== undefined) {
		fields.push("input_tokens = ?");
		values.push(updates.input_tokens);
	}
	if (updates.output_tokens !== undefined) {
		fields.push("output_tokens = ?");
		values.push(updates.output_tokens);
	}

	values.push(jobId);

	await db
		.prepare(`UPDATE job_index SET ${fields.join(", ")} WHERE job_id = ?`)
		.bind(...values)
		.run();
}

/**
 * List jobs from the index with pagination
 */
export async function listJobs(db: D1Database, options?: ListJobsOptions): Promise<ListJobsResult> {
	const limit = Math.min(options?.limit ?? 20, 100);
	const offset = options?.offset ?? 0;

	let query = "SELECT * FROM job_index";
	let countQuery = "SELECT COUNT(*) as count FROM job_index";
	const params: (string | number)[] = [];
	const countParams: (string | number)[] = [];

	if (options?.status) {
		query += " WHERE status = ?";
		countQuery += " WHERE status = ?";
		params.push(options.status);
		countParams.push(options.status);
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
	params.push(limit, offset);

	const [jobsResult, countResult] = await Promise.all([
		db
			.prepare(query)
			.bind(...params)
			.all<JobIndexEntry>(),
		db
			.prepare(countQuery)
			.bind(...countParams)
			.first<{ count: number }>(),
	]);

	return {
		jobs: jobsResult.results ?? [],
		total: countResult?.count ?? 0,
		limit,
		offset,
	};
}

/**
 * Get recent jobs (shortcut for common use case)
 */
export async function getRecentJobs(db: D1Database, limit: number = 10): Promise<JobIndexEntry[]> {
	const result = await listJobs(db, { limit });
	return result.jobs;
}

/**
 * Get job by ID from index
 */
export async function getJobFromIndex(
	db: D1Database,
	jobId: string,
): Promise<JobIndexEntry | null> {
	const result = await db
		.prepare("SELECT * FROM job_index WHERE job_id = ?")
		.bind(jobId)
		.first<JobIndexEntry>();
	return result ?? null;
}

/**
 * Upsert job into index (create if not exists, update if exists)
 */
export async function upsertJobIndex(
	db: D1Database,
	jobId: string,
	data: {
		client_id: string;
		status: string;
		business_name?: string;
		batch_num?: number;
		domains_checked?: number;
		good_results?: number;
		input_tokens?: number;
		output_tokens?: number;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO job_index (job_id, client_id, status, business_name, batch_num, domains_checked, good_results, input_tokens, output_tokens, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
       ON CONFLICT(job_id) DO UPDATE SET
         status = excluded.status,
         batch_num = excluded.batch_num,
         domains_checked = excluded.domains_checked,
         good_results = excluded.good_results,
         input_tokens = excluded.input_tokens,
         output_tokens = excluded.output_tokens,
         updated_at = datetime('now')`,
		)
		.bind(
			jobId,
			data.client_id,
			data.status,
			data.business_name ?? null,
			data.batch_num ?? 0,
			data.domains_checked ?? 0,
			data.good_results ?? 0,
			data.input_tokens ?? 0,
			data.output_tokens ?? 0,
		)
		.run();
}
