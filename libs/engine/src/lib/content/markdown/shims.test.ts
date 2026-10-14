/**
 * The engine's markdown modules are deprecated re-exports of
 * @autumnsgrove/grove-markdown, the one implementation. They used to be full
 * copies that drifted (the TOC nesting fix landed in only one of them), so this
 * asserts they are the very same functions rather than look-alikes.
 */

import { describe, it, expect } from "vitest";
import * as gm from "@autumnsgrove/grove-markdown";
import * as gmMarkdown from "@autumnsgrove/grove-markdown/markdown";
import * as gmDirectives from "@autumnsgrove/grove-markdown/directives";
import * as barrel from "./markdown";
import * as renderer from "./renderer";
import * as parse from "./parse";
import * as headingId from "./heading-id";
import * as gutter from "./gutter";
import * as modules from "./modules";
import * as contentLoader from "./content-loader";
import * as registry from "./registry";
import * as mentions from "./mentions";
import * as suppress from "./suppress";
import * as hum from "./hum";
import * as directives from "./directives";
import { sanitizeMarkdown } from "../../utils/sanitize";
import { sanitizeMarkdown as gmSanitize } from "@autumnsgrove/grove-markdown/utils/sanitize";

describe("engine markdown modules are re-exports of grove-markdown", () => {
	it("share the exact same rendering and parsing functions", () => {
		expect(barrel.renderMarkdown).toBe(gm.renderMarkdown);
		expect(renderer.renderMarkdown).toBe(gm.renderMarkdown);
		expect(parse.extractHeaders).toBe(gm.extractHeaders);
		expect(parse.parseMarkdownContent).toBe(gm.parseMarkdownContent);
		expect(parse.processAnchorTags).toBe(gm.processAnchorTags);
		expect(headingId.generateHeadingId).toBe(gm.generateHeadingId);
		expect(gutter.processGutterContent).toBe(gm.processGutterContent);
	});

	it("share the content loader and its global registry, not a second copy of its state", () => {
		expect(contentLoader.createContentLoader).toBe(gm.createContentLoader);
		expect(registry.registerContentLoader).toBe(gm.registerContentLoader);
		expect(registry.getAllPosts).toBe(gm.getAllPosts);
		expect(modules.processMarkdownModules).toBe(gm.processMarkdownModules);
		expect(modules.getItemBySlug).toBe(gm.getItemBySlug);
	});

	it("share the markdown-it plugins", () => {
		expect(mentions.mentionsPlugin).toBe(gm.mentionsPlugin);
		expect(suppress.suppressHeadingPlugin).toBe(gm.suppressHeadingPlugin);
		expect(hum.humPlugin).toBe(gm.humPlugin);
		expect(directives.groveDirectivePlugin).toBe(gmDirectives.groveDirectivePlugin);
	});

	it("share the markdown sanitizer", () => {
		expect(sanitizeMarkdown).toBe(gmSanitize);
	});

	it("expose the same surface from the barrel and the package module", () => {
		expect(Object.keys(barrel).sort()).toEqual(Object.keys(gmMarkdown).sort());
	});
});
