/**
 * The rules a removal can cite
 *
 * An email that says "your account was removed" and nothing else is the silent
 * removal this whole issue exists to stop (#1596 §A). It also leaves the person
 * with no way to check we're describing their account honestly — which is why
 * the citation travels with the removal rather than being written after the
 * fact by whoever sends the mail.
 *
 * **This list mirrors the documents; it does not replace them.** The section
 * numbers below are the ones in `docs/legal/acceptable-use-policy.md` and
 * `docs/legal/terms-of-service.md`, and `removal-policy.test.ts` reads those
 * files and fails when a section it cites is no longer there. Renaming a section
 * without updating this table is how an email ends up citing a rule nobody can
 * find.
 */

export type RemovalPolicyKey = "aup-1.4" | "aup-1.5" | "aup-1.9" | "requested";

export interface RemovalPolicy {
	key: RemovalPolicyKey;
	/** The section as it is written in the document — `§1.4`. */
	section: string;
	/** The section's heading, so the citation is checkable by eye. */
	title: string;
	/** Where to read it. */
	url: string;
	/** What we actually found, in one sentence, in our own voice. */
	found: string;
	/**
	 * An abuse removal.
	 *
	 * Abuse removals do not offer an export — we are not handing back the content
	 * we removed for a reason — and they read differently from a deletion the
	 * person asked for.
	 */
	abuse: boolean;
}

const AUP = "https://grove.place/legal/acceptable-use";

export const REMOVAL_POLICIES: Record<RemovalPolicyKey, RemovalPolicy> = {
	"aup-1.4": {
		key: "aup-1.4",
		section: "§1.4",
		title: "Spam and Malicious Content",
		url: `${AUP}#14-spam-and-malicious-content`,
		found:
			"the account was created to place outbound links, or to publish promotional or template content for another site, rather than to write here",
		abuse: true,
	},
	"aup-1.5": {
		key: "aup-1.5",
		section: "§1.5",
		title: "Impersonation and Fraud",
		url: `${AUP}#15-impersonation-and-fraud`,
		found: "the account was presenting itself as someone or something it is not",
		abuse: true,
	},
	"aup-1.9": {
		key: "aup-1.9",
		section: "§1.9",
		title: "One Account, One Person",
		url: `${AUP}#19-one-account-one-person`,
		found:
			"the account was created or operated automatically, or was an extra account for a person or business that already has one",
		abuse: true,
	},
	requested: {
		key: "requested",
		section: "",
		title: "",
		url: "",
		found: "the account was deleted at the account holder's request",
		abuse: false,
	},
};

/** The citation a removal gets when nobody passed one. */
export const DEFAULT_REMOVAL_POLICY: RemovalPolicyKey = "aup-1.4";

export function isRemovalPolicyKey(value: string): value is RemovalPolicyKey {
	return Object.prototype.hasOwnProperty.call(REMOVAL_POLICIES, value);
}

/**
 * Resolve a caller's `policy` string.
 *
 * An unknown key is an error rather than a quiet fallback: a removal that
 * guesses at which rule it is citing is a removal that will eventually cite the
 * wrong one to the wrong person.
 */
export function resolveRemovalPolicy(key?: string | null): RemovalPolicy {
	if (!key) return REMOVAL_POLICIES[DEFAULT_REMOVAL_POLICY];
	if (!isRemovalPolicyKey(key)) {
		throw new Error(
			`unknown removal policy "${key}" — expected one of: ${Object.keys(REMOVAL_POLICIES).join(", ")}`,
		);
	}
	return REMOVAL_POLICIES[key];
}
