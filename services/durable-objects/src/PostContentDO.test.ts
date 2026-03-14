import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PostContentDO, type PostContent, type ContentEnv } from "./PostContentDO";
import {
	createTestDOState,
	createMockSql,
	createMockR2,
	doRequest,
	doPost,
	doPut,
	doPatch,
	waitForInit,
} from "./test-helpers";

// ============================================================================
// Test Data
// ============================================================================

const sampleContent: PostContent = {
	tenantId: "tenant-1",
	slug: "hello-world",
	title: "Hello World",
	description: "A test post",
	tags: ["test"],
	markdownContent: "# Hello",
	htmlContent: "<h1>Hello</h1>",
	gutterContent: "[]",
	font: "default",
	publishedAt: 1700000000,
	updatedAt: 1700000100,
	storageLocation: "hot",
};

// ============================================================================
// Test Setup & Teardown
// ============================================================================

describe("PostContentDO", () => {
	let state: DurableObjectState;
	let sql: ReturnType<typeof createMockSql>;
	let env: { DB: unknown; IMAGES: unknown };

	beforeEach(() => {
		const testState = createTestDOState("content:tenant-1:hello-world", createMockSql());
		state = testState.state;
		sql = testState.sql;
		env = {
			DB: undefined, // PostContentDO doesn't use DB directly
			IMAGES: createMockR2(),
		};
	});

	/** Create a PostContentDO with async init completed */
	async function createDO(loadStateResult: PostContent | null): Promise<PostContentDO> {
		if (loadStateResult) {
			sql._pushResult({ value: JSON.stringify(loadStateResult) });
		} else {
			sql._pushResult(null);
		}
		const doInstance = new PostContentDO(state, env as ContentEnv);
		await waitForInit();
		return doInstance;
	}

	// ========================================================================
	// GET /content Tests
	// ========================================================================

	describe("GET /content", () => {
		it("returns 404 when no content exists", async () => {
			// Arrange: No content in loadState
			const doInstance = await createDO(null);

			// Act: GET /content
			const request = doRequest("/content");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(404);
			const text = await response.text();
			expect(text).toContain("Content not found");
		});

		it("returns content when stored in hot storage", async () => {
			// Arrange: Content exists in hot storage
			const doInstance = await createDO(sampleContent);

			// Act: GET /content
			const request = doRequest("/content");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data).toEqual(sampleContent);
			expect(data.storageLocation).toBe("hot");
		});

		it("fetches from R2 when content is in cold storage", async () => {
			// Arrange: Content in cold storage with R2 key
			const coldContent: PostContent = {
				...sampleContent,
				storageLocation: "cold",
				r2Key: "posts/tenant-1/hello-world.json",
				markdownContent: "",
				htmlContent: "",
				gutterContent: "[]",
			};
			const doInstance = await createDO(coldContent);

			// Mock R2 content
			const r2Content = {
				markdownContent: "# Hello",
				htmlContent: "<h1>Hello</h1>",
				gutterContent: "[]",
			};
			const r2 = env.IMAGES as ReturnType<typeof createMockR2>;
			await r2.put("posts/tenant-1/hello-world.json", JSON.stringify(r2Content));

			// Act: GET /content
			const request = doRequest("/content");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.htmlContent).toBe("<h1>Hello</h1>");
			expect(data.markdownContent).toBe("# Hello");
		});

		it("returns metadata when R2 fetch fails for cold storage", async () => {
			// Arrange: Content in cold storage but R2 is unavailable
			const coldContent: PostContent = {
				...sampleContent,
				storageLocation: "cold",
				r2Key: "missing-key.json",
				markdownContent: "",
				htmlContent: "",
			};
			const doInstance = await createDO(coldContent);

			// Act: GET /content (R2 has no object)
			const request = doRequest("/content");
			const response = await doInstance.fetch(request);

			// Assert: Returns stored metadata
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.title).toBe(sampleContent.title);
			expect(data.storageLocation).toBe("cold");
		});
	});

	// ========================================================================
	// PUT /content Tests
	// ========================================================================

	describe("PUT /content", () => {
		it("stores content with required fields", async () => {
			// Arrange: No initial content
			const doInstance = await createDO(null);

			// Act: PUT /content with valid data
			const putData = {
				tenantId: "tenant-1",
				slug: "new-post",
				title: "New Post",
				description: "A new post",
				tags: ["new"],
				markdownContent: "# New",
				htmlContent: "<h1>New</h1>",
				gutterContent: "[]",
				font: "serif",
				publishedAt: 1700000000,
			};
			sql._pushResult({});
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
			expect(data.content.tenantId).toBe("tenant-1");
			expect(data.content.slug).toBe("new-post");
			expect(data.content.storageLocation).toBe("hot");
		});

		it("returns 400 when tenantId is missing", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act: PUT /content without tenantId
			const putData = { slug: "post", title: "Post" };
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("Missing required fields");
		});

		it("returns 400 when slug is missing", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act: PUT /content without slug
			const putData = { tenantId: "tenant-1", title: "Post" };
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(400);
		});

		it("returns 400 when title is missing", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act: PUT /content without title
			const putData = { tenantId: "tenant-1", slug: "post" };
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(400);
		});

		it("provides defaults for optional fields", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act: PUT /content with minimal fields
			const putData = {
				tenantId: "tenant-1",
				slug: "minimal",
				title: "Minimal Post",
			};
			sql._pushResult({});
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.description).toBe("");
			expect(data.content.tags).toEqual([]);
			expect(data.content.markdownContent).toBe("");
			expect(data.content.htmlContent).toBe("");
			expect(data.content.gutterContent).toBe("[]");
			expect(data.content.font).toBe("default");
			expect(data.content.publishedAt).toBe(null);
		});

		it("sets storageLocation to hot", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act
			const putData = {
				tenantId: "tenant-1",
				slug: "hot-post",
				title: "Hot Post",
			};
			sql._pushResult({});
			const request = doPut("/content", putData);
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.storageLocation).toBe("hot");
		});
	});

	// ========================================================================
	// PATCH /content Tests
	// ========================================================================

	describe("PATCH /content", () => {
		it("returns 404 when no content exists", async () => {
			// Arrange: No initial content
			const doInstance = await createDO(null);

			// Act: PATCH /content
			const request = doPatch("/content", { title: "Updated" });
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(404);
			const text = await response.text();
			expect(text).toContain("Content not found");
		});

		it("updates title field", async () => {
			// Arrange: Existing content
			const doInstance = await createDO(sampleContent);

			// Act: PATCH with title update
			sql._pushResult({});
			const request = doPatch("/content", { title: "Updated Title" });
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.content.title).toBe("Updated Title");
			expect(data.content.slug).toBe(sampleContent.slug);
		});

		it("updates description field", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPatch("/content", { description: "New description" });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.description).toBe("New description");
		});

		it("updates tags field", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPatch("/content", { tags: ["updated", "tags"] });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.tags).toEqual(["updated", "tags"]);
		});

		it("updates content fields", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPatch("/content", {
				markdownContent: "# Updated",
				htmlContent: "<h1>Updated</h1>",
			});
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.markdownContent).toBe("# Updated");
			expect(data.content.htmlContent).toBe("<h1>Updated</h1>");
		});

		it("updates font and gutterContent", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPatch("/content", {
				font: "monospace",
				gutterContent: '[{"line": 1}]',
			});
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.font).toBe("monospace");
			expect(data.content.gutterContent).toBe('[{"line": 1}]');
		});

		it("updates updatedAt timestamp", async () => {
			// Arrange
			const oldContent = { ...sampleContent, updatedAt: 1000000 };
			const doInstance = await createDO(oldContent);

			// Act
			sql._pushResult({});
			const request = doPatch("/content", { title: "Updated" });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.updatedAt).toBeGreaterThan(oldContent.updatedAt);
		});

		it("ignores undefined fields in update", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act: PATCH with only title, leave other fields untouched
			sql._pushResult({});
			const request = doPatch("/content", { title: "New Title" });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.content.title).toBe("New Title");
			expect(data.content.description).toBe(sampleContent.description);
			expect(data.content.tags).toEqual(sampleContent.tags);
		});
	});

	// ========================================================================
	// GET /content/html Tests
	// ========================================================================

	describe("GET /content/html", () => {
		it("returns 404 when no content exists", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act
			const request = doRequest("/content/html");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(404);
		});

		it("returns HTML with text/html content-type", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			const request = doRequest("/content/html");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("text/html");
			const html = await response.text();
			expect(html).toBe(sampleContent.htmlContent);
		});

		it("fetches HTML from R2 when in cold storage", async () => {
			// Arrange
			const coldContent: PostContent = {
				...sampleContent,
				storageLocation: "cold",
				r2Key: "posts/tenant-1/hello-world.json",
				htmlContent: "",
			};
			const doInstance = await createDO(coldContent);

			// Store R2 content
			const r2Content = {
				markdownContent: "# Hello",
				htmlContent: "<h1>Hello</h1>",
				gutterContent: "[]",
			};
			const r2 = env.IMAGES as ReturnType<typeof createMockR2>;
			await r2.put("posts/tenant-1/hello-world.json", JSON.stringify(r2Content));

			// Act
			const request = doRequest("/content/html");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toBe("<h1>Hello</h1>");
		});

		it("returns empty string when R2 fetch fails", async () => {
			// Arrange
			const coldContent: PostContent = {
				...sampleContent,
				storageLocation: "cold",
				r2Key: "missing.json",
				htmlContent: "",
			};
			const doInstance = await createDO(coldContent);

			// Act
			const request = doRequest("/content/html");
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const html = await response.text();
			expect(html).toBe("");
		});
	});

	// ========================================================================
	// POST /content/invalidate Tests
	// ========================================================================

	describe("POST /content/invalidate", () => {
		it("clears content and returns success", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/invalidate", null);
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
			expect(data.message).toBe("Content invalidated");
		});

		it("removes content from database", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/invalidate", null);
			await doInstance.fetch(request);

			// Assert: state_data should be null after invalidate
			expect(doInstance["state_data"]).toBeNull();
		});

		it("subsequent GET returns 404 after invalidate", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act: Invalidate
			sql._pushResult({});
			await doInstance.fetch(doPost("/content/invalidate", null));

			// Act: GET /content (should return 404)
			const getRequest = doRequest("/content");
			const getResponse = await doInstance.fetch(getRequest);

			// Assert
			expect(getResponse.status).toBe(404);
		});
	});

	// ========================================================================
	// POST /content/migrate Tests
	// ========================================================================

	describe("POST /content/migrate", () => {
		it("returns 404 when no content exists", async () => {
			// Arrange
			const doInstance = await createDO(null);

			// Act
			const request = doPost("/content/migrate", { r2Key: "posts/test.json" });
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(404);
		});

		it("returns 400 when r2Key is missing", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			const request = doPost("/content/migrate", {});
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain("R2 key required");
		});

		it("returns 500 when R2 is not configured", async () => {
			// Arrange: No R2 in env
			sql._pushResult({ value: JSON.stringify(sampleContent) });
			const doInstanceEnv = { DB: undefined, IMAGES: null } as any;
			const doInstance = new PostContentDO(state, doInstanceEnv);
			await waitForInit();

			// Act
			const request = doPost("/content/migrate", { r2Key: "posts/test.json" });
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(500);
			const text = await response.text();
			expect(text).toContain("R2 not configured");
		});

		it("migrates content to cold storage", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/migrate", { r2Key: "posts/migrated.json" });
			const response = await doInstance.fetch(request);

			// Assert
			expect(response.status).toBe(200);
			const data = (await response.json()) as any;
			expect(data.success).toBe(true);
			expect(data.r2Key).toBe("posts/migrated.json");
			expect(doInstance["state_data"]?.storageLocation).toBe("cold");
		});

		it("clears content fields in cold storage metadata", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/migrate", { r2Key: "posts/migrated.json" });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(doInstance["state_data"]?.markdownContent).toBe("");
			expect(doInstance["state_data"]?.htmlContent).toBe("");
			expect(doInstance["state_data"]?.gutterContent).toBe("[]");
		});

		it("stores r2Key in state after migration", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/migrate", { r2Key: "posts/key.json" });
			await doInstance.fetch(request);

			// Assert
			expect(doInstance["state_data"]?.r2Key).toBe("posts/key.json");
		});

		it("stores content payload in R2 as JSON", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);
			const r2 = env.IMAGES as ReturnType<typeof createMockR2>;

			// Act
			sql._pushResult({});
			const request = doPost("/content/migrate", { r2Key: "posts/content.json" });
			await doInstance.fetch(request);

			// Assert
			const r2Object = await r2.get("posts/content.json");
			expect(r2Object).toBeTruthy();
			const stored = (await r2Object?.json()) as any;
			expect(stored?.markdownContent).toBe(sampleContent.markdownContent);
			expect(stored?.htmlContent).toBe(sampleContent.htmlContent);
			expect(stored?.gutterContent).toBe(sampleContent.gutterContent);
		});

		it("returns success message on successful migration", async () => {
			// Arrange
			const doInstance = await createDO(sampleContent);

			// Act
			sql._pushResult({});
			const request = doPost("/content/migrate", { r2Key: "posts/test.json" });
			const response = await doInstance.fetch(request);

			// Assert
			const data = (await response.json()) as any;
			expect(data.message).toBe("Migrated to cold storage");
		});
	});

	// ========================================================================
	// Schema & Initialization Tests
	// ========================================================================

	describe("Schema & Initialization", () => {
		it("creates content table on initialization", async () => {
			// Arrange & Act
			sql._pushResult(null);
			const doInstance = new PostContentDO(state, env as ContentEnv);
			await waitForInit();

			// Assert: Should have executed CREATE TABLE for content
			const ddlCalls = sql._calls.filter((call) => call.query.includes("CREATE TABLE"));
			expect(ddlCalls.length).toBeGreaterThan(0);
			const contentTableCall = ddlCalls.find((call) => call.query.includes("content"));
			expect(contentTableCall).toBeTruthy();
		});

		it("loads null state when no content exists", async () => {
			// Arrange & Act
			const doInstance = await createDO(null);

			// Assert
			expect(doInstance["state_data"]).toBeNull();
		});

		it("loads content from database on initialization", async () => {
			// Arrange & Act
			const doInstance = await createDO(sampleContent);

			// Assert
			expect(doInstance["state_data"]).toEqual(sampleContent);
		});
	});
});
