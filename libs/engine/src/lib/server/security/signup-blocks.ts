/**
 * Signup Identity Blocks
 *
 * A small, database-backed deny list checked at signup. It exists because
 * email verification proves only that someone can read the mailbox they signed
 * up with — not that a person is behind it. Agent mailboxes do exactly that,
 * and plus aliases (`maplecrest+ella@`, `maplecrest+grace@`) mean one operator
 * can hold many addresses that all land in the same inbox.
 *
 * So the unit of blocking is the *normalized identity*: lowercased, with
 * everything after `+` in the local part removed. A rule on the domain catches
 * the class; a rule on the address catches one alias.
 *
 * The list is data, not code — it lives in `signup_blocks` and can be changed
 * without a deploy (see `gw block`). Grove's signup stays open; this is a deny
 * list, never an allow list.
 *
 * @see docs/legal/acceptable-use-policy.md — the rule this enforces
 */

// `normalizeEmail` is the platform's lowercase-and-trim helper; this builds on
// it so there is one definition of "normalized" in the codebase.
import { normalizeEmail } from "../../utils/user";

// ============================================================================
// Types
// ============================================================================

export type SignupBlockKind = "domain" | "email" | "substring";

export interface SignupBlock {
	id: string;
	kind: SignupBlockKind;
	/** Stored normalized (lowercased; email kind also drops the +alias). */
	value: string;
	reason: string | null;
	createdBy: string | null;
	createdAt: number;
	/** Unix seconds, or null for a permanent block. */
	expiresAt: number | null;
	source: string | null;
}

export interface NormalizedIdentity {
	/** Trimmed and lowercased as given. */
	email: string;
	/** Local part, lowercased, `+alias` removed. */
	local: string;
	/** Domain, lowercased. */
	domain: string;
	/** `${local}@${domain}` — what an `email` block is compared against. */
	normalized: string;
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Reduce an email address to the identity an operator cannot cheaply change.
 *
 * Returns null for anything that isn't shaped like an address, so callers can
 * skip the check rather than guessing.
 */
export function normalizeIdentity(email: string | null | undefined): NormalizedIdentity | null {
	const trimmed = normalizeEmail(email);
	if (!trimmed) return null;
	const at = trimmed.lastIndexOf("@");
	if (at <= 0 || at === trimmed.length - 1) return null;

	const rawLocal = trimmed.slice(0, at);
	const domain = trimmed.slice(at + 1);
	if (!rawLocal || !domain.includes(".")) return null;

	// `a+b@example.com` and `a+c@example.com` are one inbox. `+` is not valid in
	// the domain, so only the local part needs this.
	const plus = rawLocal.indexOf("+");
	const local = plus > 0 ? rawLocal.slice(0, plus) : rawLocal;

	return { email: trimmed, local, domain, normalized: `${local}@${domain}` };
}

/**
 * Normalize a value at write time so comparisons are always like-for-like.
 * An `email` block loses its alias here, once, rather than at every check.
 */
export function normalizeBlockValue(kind: SignupBlockKind, value: string): string {
	const trimmed = value.trim().toLowerCase();
	switch (kind) {
		case "domain":
			// Accept "@example.com" and "example.com" as the same rule.
			return trimmed.replace(/^@/, "").replace(/\.$/, "");
		case "email": {
			const identity = normalizeIdentity(trimmed);
			return identity ? identity.normalized : trimmed;
		}
		case "substring":
			return trimmed;
	}
}

// ============================================================================
// Matching
// ============================================================================

function blockApplies(block: SignupBlock, nowSeconds: number): boolean {
	if (block.expiresAt !== null && block.expiresAt <= nowSeconds) return false;
	return true;
}

/**
 * Does this block catch this identity?
 *
 * - `domain` matches the domain exactly, or any subdomain of it — blocking
 *   `grokbot.com` catches `mail.grokbot.com`.
 * - `email` compares the normalized identity, so plus aliases collapse.
 * - `substring` is a last resort for a rotating pattern; it is applied to the
 *   full address and is the only kind that can surprise you.
 */
export function blockMatches(
	identity: NormalizedIdentity,
	block: SignupBlock,
	nowSeconds: number,
): boolean {
	if (!blockApplies(block, nowSeconds)) return false;

	switch (block.kind) {
		case "domain":
			return identity.domain === block.value || identity.domain.endsWith(`.${block.value}`);
		case "email":
			return identity.normalized === block.value;
		case "substring":
			return block.value.length > 0 && identity.email.includes(block.value);
	}
}

/**
 * The first active block that catches this identity, or null.
 *
 * Returning the block rather than a boolean lets callers log *why* without
 * leaking the rule to the person signing up.
 */
export function findBlock(
	identity: NormalizedIdentity | null,
	blocks: readonly SignupBlock[],
	nowSeconds: number = Math.floor(Date.now() / 1000),
): SignupBlock | null {
	if (!identity) return null;
	for (const block of blocks) {
		if (blockMatches(identity, block, nowSeconds)) return block;
	}
	return null;
}

// ============================================================================
// Loading
// ============================================================================

/** Minimal DB shape — matches both D1Database and GroveDatabase. */
interface BlockDatabase {
	prepare(sql: string): {
		bind(...params: unknown[]): {
			all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
		};
	};
}

interface SignupBlockRow {
	id: string;
	kind: string;
	value: string;
	reason: string | null;
	created_by: string | null;
	created_at: number;
	expires_at: number | null;
	source: string | null;
}

/**
 * Load every block. Throws on database errors — the caller decides whether to
 * fail open, and must log it when it does, because a block list that silently
 * stopped loading is a protection that silently stopped protecting.
 */
export async function loadSignupBlocks(db: BlockDatabase): Promise<SignupBlock[]> {
	// `.bind()` with no params is the one shape both D1 and GroveDatabase share.
	const { results } = await db
		.prepare(
			`SELECT id, kind, value, reason, created_by, created_at, expires_at, source
       FROM signup_blocks`,
		)
		.bind()
		.all<SignupBlockRow>();

	return (results ?? []).map((row) => ({
		id: row.id,
		kind: row.kind as SignupBlockKind,
		value: row.value,
		reason: row.reason ?? null,
		createdBy: row.created_by ?? null,
		createdAt: row.created_at,
		expiresAt: row.expires_at ?? null,
		source: row.source ?? null,
	}));
}

/** Human-readable reason for an ops log — never shown to the person signing up. */
export function describeBlock(block: SignupBlock): string {
	const parts = [`${block.kind}=${block.value}`];
	if (block.reason) parts.push(block.reason);
	if (block.source) parts.push(`source=${block.source}`);
	return parts.join(" · ");
}
