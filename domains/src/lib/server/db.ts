// Database operations for the Domain Finder system
import { MODELS, SEARCH_DEFAULTS } from "$lib/config";

// ============================================================================
// Constants
// ============================================================================

/** Session duration: 30 days in milliseconds */
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Magic code expiration: 15 minutes in milliseconds */
const MAGIC_CODE_EXPIRY_MS = 15 * 60 * 1000;

/**
 * Magic code security parameters.
 *
 * SECURITY NOTE: The 6-character code from a 32-char alphabet provides ~10^9 combinations.
 * To prevent brute force attacks, implement rate limiting on the verification endpoint:
 * - Recommended: 3 attempts per email per 15 minutes
 * - Lock account for 1 hour after 10 failed attempts
 */
const MAGIC_CODE_LENGTH = 6;

// ============================================================================
// Utility Functions
// ============================================================================

export function generateId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

// ============================================================================
// User Operations
// ============================================================================

export interface User {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateUser(
  db: D1Database,
  email: string,
): Promise<User> {
  const existing = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();

  if (existing) {
    return {
      ...existing,
      is_admin: existing.is_admin === 1,
    };
  }

  const id = generateId();
  const timestamp = now();

  await db
    .prepare(
      "INSERT INTO users (id, email, is_admin, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
    )
    .bind(id, email.toLowerCase(), timestamp, timestamp)
    .run();

  return {
    id,
    email: email.toLowerCase(),
    is_admin: false,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export async function getUserByEmail(
  db: D1Database,
  email: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<UserRow>();

  if (!result) return null;

  return {
    ...result,
    is_admin: result.is_admin === 1,
  };
}

export async function getUserById(
  db: D1Database,
  id: string,
): Promise<User | null> {
  const result = await db
    .prepare("SELECT * FROM users WHERE id = ?")
    .bind(id)
    .first<UserRow>();

  if (!result) return null;

  return {
    ...result,
    is_admin: result.is_admin === 1,
  };
}

// ============================================================================
// Session Operations
// ============================================================================

export interface Session {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  expires_at: string;
  created_at: string;
}

/**
 * Create a new session with optional OAuth tokens stored in D1.
 * Tokens are stored in the database rather than cookies for better security.
 */
export async function createSession(
  db: D1Database,
  userId: string,
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  },
): Promise<Session> {
  const id = generateId();
  const timestamp = now();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  const tokenExpiresAt = tokens?.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, access_token, refresh_token, token_expires_at, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      tokens?.accessToken ?? null,
      tokens?.refreshToken ?? null,
      tokenExpiresAt,
      expiresAt,
      timestamp,
    )
    .run();

  return {
    id,
    user_id: userId,
    access_token: tokens?.accessToken ?? null,
    refresh_token: tokens?.refreshToken ?? null,
    token_expires_at: tokenExpiresAt,
    expires_at: expiresAt,
    created_at: timestamp,
  };
}

/**
 * Get a session by ID with token information
 */
export async function getSession(
  db: D1Database,
  sessionId: string,
): Promise<Session | null> {
  const result = await db
    .prepare(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")',
    )
    .bind(sessionId)
    .first<Session>();
  return result ?? null;
}

/**
 * Update session tokens (used after token refresh)
 */
export async function updateSessionTokens(
  db: D1Database,
  sessionId: string,
  tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  },
): Promise<void> {
  const tokenExpiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
    : null;

  await db
    .prepare(
      `UPDATE sessions
       SET access_token = ?, refresh_token = COALESCE(?, refresh_token), token_expires_at = ?
       WHERE id = ?`,
    )
    .bind(
      tokens.accessToken,
      tokens.refreshToken ?? null,
      tokenExpiresAt,
      sessionId,
    )
    .run();
}

/**
 * Clean up expired sessions (can be called periodically)
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<number> {
  const result = await db
    .prepare('DELETE FROM sessions WHERE expires_at < datetime("now")')
    .run();
  return result.meta.changes ?? 0;
}

export async function deleteSession(
  db: D1Database,
  sessionId: string,
): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

// ============================================================================
// Magic Code Operations
// ============================================================================

export interface MagicCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

/**
 * Generate a cryptographically secure random code
 * Uses Web Crypto API instead of Math.random() for security
 */
function generateSecureCode(length: number = 6): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding ambiguous chars (0, O, 1, I)
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  return Array.from(randomBytes, (byte) => charset[byte % charset.length]).join(
    "",
  );
}

export async function createMagicCode(
  db: D1Database,
  email: string,
): Promise<MagicCode> {
  const id = generateId();
  const code = generateSecureCode(MAGIC_CODE_LENGTH);
  const timestamp = now();
  const expiresAt = new Date(Date.now() + MAGIC_CODE_EXPIRY_MS).toISOString();

  await db
    .prepare(
      "INSERT INTO magic_codes (id, email, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, email.toLowerCase(), code, expiresAt, timestamp)
    .run();

  return {
    id,
    email: email.toLowerCase(),
    code,
    expires_at: expiresAt,
    used_at: null,
    created_at: timestamp,
  };
}

export async function verifyMagicCode(
  db: D1Database,
  email: string,
  code: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      'SELECT * FROM magic_codes WHERE email = ? AND code = ? AND expires_at > datetime("now") AND used_at IS NULL',
    )
    .bind(email.toLowerCase(), code.toUpperCase())
    .first<MagicCode>();

  if (!result) return false;

  // Mark code as used
  await db
    .prepare('UPDATE magic_codes SET used_at = datetime("now") WHERE id = ?')
    .bind(result.id)
    .run();

  return true;
}

// ============================================================================
// Domain Search Job Operations
// ============================================================================

export type SearchStatus =
  | "pending"
  | "running"
  | "complete"
  | "needs_followup"
  | "failed"
  | "cancelled";

export interface DomainSearchJob {
  id: string;
  client_id: string;
  client_email: string;
  business_name: string;
  domain_idea: string | null;
  tld_preferences: string; // JSON array
  vibe: string;
  keywords: string | null;
  status: SearchStatus;
  batch_num: number;
  domains_checked: number;
  domains_available: number; // Count of available domains found
  good_results: number;
  input_tokens?: number;
  output_tokens?: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSearchJobInput {
  client_email: string;
  business_name: string;
  domain_idea?: string;
  tld_preferences: string[];
  vibe: string;
  keywords?: string;
}

export async function createSearchJob(
  db: D1Database,
  input: CreateSearchJobInput,
): Promise<DomainSearchJob> {
  const id = generateId();
  const timestamp = now();

  const job: DomainSearchJob = {
    id,
    client_id: generateId(),
    client_email: input.client_email.toLowerCase(),
    business_name: input.business_name,
    domain_idea: input.domain_idea ?? null,
    tld_preferences: JSON.stringify(input.tld_preferences),
    vibe: input.vibe,
    keywords: input.keywords ?? null,
    status: "pending",
    batch_num: 0,
    domains_checked: 0,
    domains_available: 0,
    good_results: 0,
    error: null,
    started_at: null,
    completed_at: null,
    duration_seconds: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  await db
    .prepare(
      `INSERT INTO domain_search_jobs
  	(id, client_id, client_email, business_name, domain_idea, tld_preferences, vibe, keywords, status, batch_num, domains_checked, domains_available, good_results, input_tokens, output_tokens, error, started_at, completed_at, duration_seconds, created_at, updated_at)
  	VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      job.id,
      job.client_id,
      job.client_email,
      job.business_name,
      job.domain_idea,
      job.tld_preferences,
      job.vibe,
      job.keywords,
      job.status,
      job.batch_num,
      job.domains_checked,
      job.domains_available,
      job.good_results,
      0, // input_tokens default
      0, // output_tokens default
      job.error,
      job.started_at,
      job.completed_at,
      job.duration_seconds,
      job.created_at,
      job.updated_at,
    )
    .run();

  return job;
}

export async function getSearchJob(
  db: D1Database,
  id: string,
): Promise<DomainSearchJob | null> {
  const result = await db
    .prepare("SELECT * FROM domain_search_jobs WHERE id = ?")
    .bind(id)
    .first<DomainSearchJob>();
  return result ?? null;
}

export async function listSearchJobs(
  db: D1Database,
  options?: { limit?: number; offset?: number; status?: SearchStatus },
): Promise<{ jobs: DomainSearchJob[]; total: number }> {
  // Enforce max limit to prevent memory issues
  const limit = Math.min(options?.limit ?? 20, 100);
  const offset = options?.offset ?? 0;

  let query = "SELECT * FROM domain_search_jobs";
  let countQuery = "SELECT COUNT(*) as count FROM domain_search_jobs";
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
      .all<DomainSearchJob>(),
    db
      .prepare(countQuery)
      .bind(...countParams)
      .first<{ count: number }>(),
  ]);

  return {
    jobs: jobsResult.results ?? [],
    total: countResult?.count ?? 0,
  };
}

/**
 * Update search job status and metrics
 *
 * SECURITY NOTE: This function uses dynamic SQL construction, but is safe because:
 * 1. Field names are hardcoded strings, never from user input
 * 2. All user-provided values are passed via parameterized queries (?)
 * 3. The `id` parameter is bound as a parameter, not interpolated
 *
 * DO NOT modify this to accept dynamic field names from user input.
 */
export async function updateSearchJobStatus(
  db: D1Database,
  id: string,
  updates: {
    status?: SearchStatus;
    batch_num?: number;
    domains_checked?: number;
    good_results?: number;
    input_tokens?: number;
    output_tokens?: number;
    error?: string | null;
    started_at?: string;
    completed_at?: string;
  },
): Promise<void> {
  // Allowed fields - only these can be updated (whitelist approach)
  const fields: string[] = ['updated_at = datetime("now")'];
  const values: (string | number | null)[] = [];

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
  if (updates.error !== undefined) {
    fields.push("error = ?");
    values.push(updates.error);
  }
  if (updates.started_at !== undefined) {
    fields.push("started_at = ?");
    values.push(updates.started_at);
  }
  if (updates.completed_at !== undefined) {
    fields.push("completed_at = ?");
    values.push(updates.completed_at);
    // Calculate duration if we have started_at
    fields.push(
      "duration_seconds = CAST((julianday(?) - julianday(started_at)) * 86400 AS INTEGER)",
    );
    values.push(updates.completed_at);
  }

  values.push(id);

  await db
    .prepare(`UPDATE domain_search_jobs SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

// ============================================================================
// Domain Result Operations
// ============================================================================

export interface DomainResult {
  id: string;
  job_id: string;
  domain: string;
  tld: string;
  status: "available" | "registered" | "unknown";
  score: number;
  price_cents: number | null;
  price_category: string | null;
  flags: string | null; // JSON array
  notes: string | null;
  batch_num: number;
  created_at: string;
}

export async function saveDomainResults(
  db: D1Database,
  jobId: string,
  results: Omit<DomainResult, "id" | "created_at">[],
): Promise<void> {
  const timestamp = now();

  // D1 batch operations are atomic - all succeed or all fail
  const statements = results.map((result) =>
    db
      .prepare(
        `INSERT INTO domain_results (id, job_id, domain, tld, status, score, price_cents, price_category, flags, notes, batch_num, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        generateId(),
        jobId,
        result.domain,
        result.tld,
        result.status,
        result.score,
        result.price_cents,
        result.price_category,
        result.flags,
        result.notes,
        result.batch_num,
        timestamp,
      ),
  );

  try {
    await db.batch(statements);
  } catch (err) {
    console.error(
      `[saveDomainResults] Failed to save ${results.length} results for job ${jobId}:`,
      err,
    );
    throw err;
  }
}

export async function getJobResults(
  db: D1Database,
  jobId: string,
  options?: { availableOnly?: boolean; minScore?: number },
): Promise<DomainResult[]> {
  let query = "SELECT * FROM domain_results WHERE job_id = ?";
  const params: (string | number)[] = [jobId];

  if (options?.availableOnly) {
    query += " AND status = ?";
    params.push("available");
  }

  if (options?.minScore !== undefined) {
    query += " AND score >= ?";
    params.push(options.minScore);
  }

  query += " ORDER BY score DESC, price_cents ASC";

  const result = await db
    .prepare(query)
    .bind(...params)
    .all<DomainResult>();
  return result.results ?? [];
}

// ============================================================================
// Search Configuration Operations
// ============================================================================

export interface SearchConfig {
  id: string;
  name: string;
  driver_model: string;
  swarm_model: string;
  max_batches: number;
  candidates_per_batch: number;
  target_good_results: number;
  creativity: number; // 0-1 scale
  rdap_delay_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getActiveConfig(
  db: D1Database,
): Promise<SearchConfig | null> {
  const result = await db
    .prepare(
      "SELECT * FROM domain_search_config WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1",
    )
    .first<SearchConfig>();
  return result ?? null;
}

export async function updateConfig(
  db: D1Database,
  updates: Partial<Omit<SearchConfig, "id" | "created_at" | "updated_at">>,
): Promise<void> {
  // Get or create active config
  let config = await getActiveConfig(db);

  if (!config) {
    const id = generateId();
    const timestamp = now();
    await db
      .prepare(
        `INSERT INTO domain_search_config (id, name, driver_model, swarm_model, max_batches, candidates_per_batch, target_good_results, creativity, rdap_delay_seconds, is_active, created_at, updated_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        "default",
        MODELS.DRIVER,
        MODELS.SWARM,
        SEARCH_DEFAULTS.MAX_BATCHES,
        SEARCH_DEFAULTS.CANDIDATES_PER_BATCH,
        SEARCH_DEFAULTS.TARGET_GOOD_RESULTS,
        SEARCH_DEFAULTS.CREATIVITY,
        SEARCH_DEFAULTS.RDAP_DELAY_SECONDS,
        1,
        timestamp,
        timestamp,
      )
      .run();
    config = await getActiveConfig(db);
  }

  if (!config) return;

  const fields: string[] = ['updated_at = datetime("now")'];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.driver_model !== undefined) {
    fields.push("driver_model = ?");
    values.push(updates.driver_model);
  }
  if (updates.swarm_model !== undefined) {
    fields.push("swarm_model = ?");
    values.push(updates.swarm_model);
  }
  if (updates.max_batches !== undefined) {
    fields.push("max_batches = ?");
    values.push(updates.max_batches);
  }
  if (updates.candidates_per_batch !== undefined) {
    fields.push("candidates_per_batch = ?");
    values.push(updates.candidates_per_batch);
  }
  if (updates.target_good_results !== undefined) {
    fields.push("target_good_results = ?");
    values.push(updates.target_good_results);
  }
  if (updates.creativity !== undefined) {
    fields.push("creativity = ?");
    values.push(updates.creativity);
  }
  if (updates.rdap_delay_seconds !== undefined) {
    fields.push("rdap_delay_seconds = ?");
    values.push(updates.rdap_delay_seconds);
  }

  values.push(config.id);

  await db
    .prepare(
      `UPDATE domain_search_config SET ${fields.join(", ")} WHERE id = ?`,
    )
    .bind(...values)
    .run();
}
