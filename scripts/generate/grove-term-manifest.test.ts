import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGroveNaming } from "./grove-term-manifest.ts";

/**
 * The last term in the naming doc used to absorb everything after it — the
 * `---` separator, the footnotes, and the `_Last updated:_` footer — because
 * only another heading ended an entry. `findRelatedTerms` then read whatever
 * term the footer happened to mention as a real cross-reference, so adding a
 * term elsewhere rewrote this one's see-also links (#1697).
 *
 * The doc below has to define Lyra as a real heading, or the footer mentioning
 * it proves nothing: see-also only cross-references terms that exist.
 */

const DOC = `# Grove Naming

## Platform Services

### Lyra

**Agent core**

An agent core for Grove.

---

### Terrarium

**Testing sandbox**

A glass box for trying things.

---

### Meadow

**Community feed** · _Chronological_

A meadow is open ground. It mentions Blazes by name.

---

### Blazes

**Content Type Indicators**

A trail blaze is a painted mark. It sits in Meadow.

---

[^1]: A footnote that mentions Lyra, which is not part of Blazes.

---

_Last updated: November 15, 2026 — Added Lyra (agent core)_
_Status: Placeholder names_
`;

test("the last entry does not inherit the document footer", () => {
	const manifest = parseGroveNaming(DOC);

	assert.deepEqual(manifest.blazes.seeAlso, ["meadow"]);
});

test("a footer naming other terms does not change any see-also list", () => {
	// Terrarium is a real term that Blazes never mentions, so it can only arrive
	// through the footer.
	const withFooter = `${DOC}\n_Last updated: December 1, 2026 — Added Terrarium_`;
	const before = parseGroveNaming(DOC);
	const after = parseGroveNaming(withFooter);

	for (const slug of Object.keys(before)) {
		assert.deepEqual(after[slug].seeAlso, before[slug].seeAlso, `${slug} seeAlso changed`);
	}
});

test("a term's body still cross-references its neighbours", () => {
	const manifest = parseGroveNaming(DOC);

	// The fix must end an entry at `---`, not stop collecting content entirely.
	assert.deepEqual(manifest.meadow.seeAlso, ["blazes"]);
	assert.deepEqual(manifest.blazes.seeAlso, ["meadow"]);
});

test("footnotes and footer stay out of the definition", () => {
	const manifest = parseGroveNaming(DOC);

	assert.ok(!manifest.blazes.definition.includes("footnote"));
	assert.ok(!manifest.blazes.definition.includes("Last updated"));
	assert.equal(manifest.blazes.definition, "A trail blaze is a painted mark. It sits in Meadow.");
});

/**
 * `findRelatedTerms` used to do `content.includes(slug)`, so a short slug hit
 * inside any longer word: Hum matched "humble", Plant matched "planted", Flow
 * matched "flowers" (#1754). Cross-references are the vocabulary's edges, and
 * an edge that exists only because two words share letters is wrong.
 */

const SUBSTRING_DOC = `# Grove Naming

## Platform Services

### Hum

**Music previews**

Link previews for songs.

---

### Plant

**Sign-up**

Where a Wanderer takes root.

---

### Flow

**Writing mode**

A quiet place to write.

---

### Wander

**Exploring**

Moving through groves.

---

### Blazes

**Content Type Indicators**

A humble badge. Something planted, in flowers, wandering.

---

### Terrarium

**Testing sandbox**

Try Plant here, and let your Flow settle.
`;

test("a term nested inside a longer word is not a cross-reference", () => {
	const manifest = parseGroveNaming(SUBSTRING_DOC);

	// "humble", "planted", "flowers" and "wandering" contain a slug but never name it.
	assert.equal(manifest.blazes.seeAlso, undefined);
});

test("a term named as a whole word is still a cross-reference", () => {
	const manifest = parseGroveNaming(SUBSTRING_DOC);

	assert.deepEqual(manifest.terrarium.seeAlso, ["plant", "flow"]);
});

test("a term is matched case-insensitively and next to punctuation", () => {
	const doc = SUBSTRING_DOC.replace(
		"Try Plant here, and let your Flow settle.",
		"Try (plant), then FLOW. Hum!",
	);
	const manifest = parseGroveNaming(doc);

	assert.deepEqual(manifest.terrarium.seeAlso, ["hum", "plant", "flow"]);
});
