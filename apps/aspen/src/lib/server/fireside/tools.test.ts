/**
 * The proposal, and the row it has to fit in.
 *
 * `fireside_messages.content` is capped at 8,000 characters by migration 128, and a
 * stored proposal is its own JSON payload serialised. So the schema's bounds and
 * that CHECK are one contract, and this is where it is tested: the largest proposal
 * the model is allowed to make must still be storable.
 *
 * It matters because of the order things happen in — the run is paid for before the
 * append. A proposal that cannot be stored is a paid run, a `500`, and a writer who
 * cannot get their draft.
 */

import { describe, expect, it } from "vitest";
import { PROPOSAL_SCHEMA } from "./tools";

/** The CHECK in `libs/engine/migrations/128_fireside.sql`. */
const MESSAGE_LIMIT = 8000;

interface Bounds {
	title: number;
	body: number;
	vines: number;
	quote: number;
	text: number;
}

/** The most a schema permits, rather than the constants it happens to use. */
function schemaBounds(): Bounds {
	const properties = PROPOSAL_SCHEMA.properties as Record<string, Record<string, unknown>>;
	const vine = (properties.vines.items as { properties: Record<string, unknown> })
		.properties as Record<string, Record<string, number>>;

	return {
		title: properties.title.maxLength as number,
		body: properties.body.maxLength as number,
		vines: properties.vines.maxItems as number,
		quote: vine.quote.maxLength as number,
		text: vine.text.maxLength as number,
	};
}

describe("PROPOSAL_SCHEMA", () => {
	it("can make a proposal, but cannot make one too big to store", () => {
		const bounds = schemaBounds();

		// Every bound is explicit: an absent maxLength is an unbounded field, and an
		// unbounded field is a row that fails after the model has been paid.
		expect(bounds.title).toBeGreaterThan(0);
		expect(bounds.body).toBeGreaterThan(0);
		expect(bounds.quote).toBeGreaterThan(0);
		expect(bounds.text).toBeGreaterThan(0);

		// A payload at every maximum, with anchors resolved the way `propose_draft`
		// rewrites them, then serialised exactly as the route stores it.
		const proposal = {
			title: "t".repeat(bounds.title),
			body: "b".repeat(bounds.body),
			vines: Array.from({ length: bounds.vines }, () => ({
				// `paragraph:1234` is the longest anchor the resolver produces.
				anchor: "paragraph:1234",
				text: "v".repeat(bounds.text),
			})),
			proposedAgainst: 999_999,
		};

		expect(JSON.stringify(proposal).length).toBeLessThanOrEqual(MESSAGE_LIMIT);
	});

	it("still asks for the two things a proposal needs", () => {
		expect(PROPOSAL_SCHEMA.required).toEqual(["title", "body"]);
	});
});
