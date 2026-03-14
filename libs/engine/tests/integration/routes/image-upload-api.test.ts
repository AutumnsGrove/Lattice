/**
 * Image Upload API Route Integration Tests
 *
 * Tests the POST handler for image uploads at /api/images/upload
 * Focus areas:
 * - Auth gates (401/403)
 * - Feature gates (upload_gate, cache_kv availability)
 * - Environment validation
 * - File validation (type, extension, signature, size, dimensions)
 * - Filename handling (sanitization, collision prevention)
 * - Duplicate detection via hash
 * - Content moderation (Petal)
 * - R2 upload with correct metadata and key structure
 * - D1 graceful degradation (hash storage, gallery insert)
 * - Copy format generation (markdown, html, svelte)
 * - Response headers (Cache-Control: no-store)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks
// ============================================================================

vi.mock("$lib/auth/session.js", () => ({
	getVerifiedTenantId: vi.fn(async (_db: unknown, tenantId: string) => tenantId),
}));

vi.mock("$lib/utils/validation.js", () => ({
	sanitizeObject: vi.fn((obj: unknown) => obj),
}));

vi.mock("$lib/curios/gallery", () => ({
	generateGalleryId: vi.fn(() => "gallery-id-001"),
	parseImageFilename: vi.fn((key: string) => ({
		slug:
			key
				.split("/")
				.pop()
				?.replace(/\.[^.]+$/, "") ?? "unknown",
		date: null,
		category: null,
	})),
}));

vi.mock("$lib/threshold/factory.js", () => ({
	createThreshold: vi.fn(() => null),
}));

vi.mock("$lib/threshold/adapters/sveltekit.js", () => ({
	thresholdCheck: vi.fn(async () => null),
	thresholdCheckWithResult: vi.fn(async () => ({ result: null, response: null })),
	thresholdHeaders: vi.fn(() => ({})),
}));

vi.mock("$lib/server/upload-gate.js", () => ({
	canUploadImages: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("$lib/server/env-validation.js", () => ({
	validateEnv: vi.fn(() => ({ valid: true })),
	hasAnyEnv: vi.fn(() => true),
}));

vi.mock("$lib/utils/upload-validation.js", () => ({
	ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
	ALLOWED_TYPES_DISPLAY: "JPEG, PNG, GIF, WebP",
	MIME_TO_EXTENSIONS: {
		"image/jpeg": ["jpg", "jpeg"],
		"image/png": ["png"],
		"image/gif": ["gif"],
		"image/webp": ["webp"],
	},
	isAllowedImageType: vi.fn((type: string) =>
		["image/jpeg", "image/png", "image/gif", "image/webp"].includes(type),
	),
	validateFileSignature: vi.fn(() => true),
}));

vi.mock("$lib/server/petal/index.js", () => ({
	scanImage: vi.fn(async () => ({ allowed: true, processingTimeMs: 50 })),
}));

vi.mock("$lib/server/activity-tracking.js", () => ({
	updateLastActivity: vi.fn(),
}));

vi.mock("$lib/server/utils/form-data.js", () => ({
	parseFormData: vi.fn(() => ({
		success: true,
		data: {
			filename: null,
			altText: "",
			description: "",
			hash: null,
			imageFormat: null,
			originalSize: null,
			storedSize: null,
			dominantColor: null,
			imageWidth: null,
			imageHeight: null,
			context: "general",
		},
	})),
}));

vi.mock("$lib/errors", () => {
	function throwGroveError(
		status: number,
		groveError: { code: string; userMessage: string },
		_context: string,
		_detail?: Record<string, unknown>,
	): never {
		const err = Object.assign(new Error(groveError.userMessage), {
			status,
			body: { message: groveError.userMessage, code: groveError.code },
		});
		throw err;
	}

	return {
		API_ERRORS: {
			UNAUTHORIZED: { code: "GROVE-API-001", userMessage: "Unauthorized", category: "user" },
			TENANT_CONTEXT_REQUIRED: {
				code: "GROVE-API-002",
				userMessage: "Tenant required",
				category: "user",
			},
			FEATURE_DISABLED: {
				code: "GROVE-API-003",
				userMessage: "Feature disabled",
				category: "user",
			},
			UPLOAD_SERVICE_UNAVAILABLE: {
				code: "GROVE-API-004",
				userMessage: "Upload unavailable",
				category: "system",
			},
			INVALID_REQUEST_BODY: {
				code: "GROVE-API-005",
				userMessage: "Invalid request",
				category: "user",
			},
			INVALID_FILE: { code: "GROVE-API-006", userMessage: "Invalid file", category: "user" },
			VALIDATION_FAILED: {
				code: "GROVE-API-007",
				userMessage: "Validation failed",
				category: "user",
			},
			CONTENT_TOO_LARGE: {
				code: "GROVE-API-008",
				userMessage: "Content too large",
				category: "user",
			},
			UPLOAD_RESTRICTED: {
				code: "GROVE-API-009",
				userMessage: "Upload restricted",
				category: "user",
			},
			OPERATION_FAILED: {
				code: "GROVE-API-010",
				userMessage: "Operation failed",
				category: "system",
			},
		},
		throwGroveError,
		logGroveError: vi.fn(),
		buildErrorJson: vi.fn((err: { code: string; userMessage: string }) => ({
			error_code: err.code,
			error: err.userMessage,
		})),
	};
});

// ============================================================================
// Import route handler
// ============================================================================

const { POST: uploadHandler } = await import("../../../src/routes/api/images/upload/+server.js");

// ============================================================================
// Helpers & Constants
// ============================================================================

const TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

// PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A + IHDR chunk (width/height at bytes 16-23)
const PNG_MAGIC = new Uint8Array([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a, // PNG signature
	0x00,
	0x00,
	0x00,
	0x0d,
	0x49,
	0x48,
	0x44,
	0x52, // IHDR chunk header
	0x00,
	0x00,
	0x01,
	0x00, // width: 256
	0x00,
	0x00,
	0x00,
	0xc8, // height: 200
	0x08,
	0x06,
	0x00,
	0x00,
	0x00, // bit depth, color type, etc.
]);

const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

function createMockFile(name: string, type: string, sizeBytes: number, content?: Uint8Array): File {
	const data = content ?? new Uint8Array(sizeBytes);
	const blob = new Blob([data], { type });
	const file = new File([blob], name, { type });
	// Always override size so tests can control it independently of actual data
	Object.defineProperty(file, "size", { value: sizeBytes });
	return file;
}

function createMockFormData(file?: File, metadata?: Record<string, string>): FormData {
	const formData = new FormData();
	if (file) {
		formData.append("file", file);
	}
	if (metadata) {
		for (const [key, value] of Object.entries(metadata)) {
			formData.append(key, value);
		}
	}
	return formData;
}

function createMockR2() {
	return {
		put: vi.fn(async () => undefined),
		delete: vi.fn(async () => undefined),
		list: vi.fn(async () => ({ objects: [], truncated: false, cursor: null })),
		head: vi.fn(async () => null),
	};
}

function createMockDB() {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return this;
			}),
			first: vi.fn(async () => null),
			all: vi.fn(async () => ({ results: [] })),
			run: vi.fn(async () => ({ meta: { changes: 0 } })),
		})),
	};
}

function createUploadEvent(options: {
	user?: { id: string; email: string; name: string; picture: string } | null;
	tenantId?: string | null;
	formData?: FormData;
	r2?: ReturnType<typeof createMockR2>;
	db?: ReturnType<typeof createMockDB>;
	cacheKv?: Record<string, unknown>;
	ai?: unknown;
}) {
	const r2 = options.r2 ?? createMockR2();
	const db = options.db ?? createMockDB();

	const request: Record<string, unknown> = {
		method: "POST",
		url: "https://autumn.grove.place/api/images/upload",
		headers: new Headers({ "content-type": "multipart/form-data" }),
		formData: vi.fn(async () => options.formData ?? new FormData()),
	};

	return {
		request: request as unknown as Request,
		url: new URL("https://autumn.grove.place/api/images/upload"),
		locals: {
			user:
				"user" in options
					? options.user
					: {
							id: "user-123",
							email: "test@grove.place",
							name: "Test User",
							picture: "https://cdn.grove.place/default.jpg",
						},
			tenantId: "tenantId" in options ? options.tenantId : TENANT_ID,
			context: { type: "tenant" },
			csrfToken: "test-csrf",
		},
		platform: {
			env: {
				IMAGES: r2,
				DB: db,
				CACHE_KV: options.cacheKv ?? {},
				CDN_BASE_URL: "https://cdn.grove.place",
				AI: options.ai,
			},
		},
		params: {},
		cookies: {
			get: vi.fn(),
			set: vi.fn(),
			delete: vi.fn(),
			getAll: vi.fn(() => []),
			serialize: vi.fn(() => ""),
		},
		getClientAddress: vi.fn(() => "127.0.0.1"),
		isDataRequest: false,
		isSubRequest: false,
		route: { id: "/api/images/upload" },
		setHeaders: vi.fn(),
		fetch: vi.fn(),
	};
}

// ============================================================================
// Auth Gates
// ============================================================================

describe("POST /api/images/upload — Auth Gates", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects unauthenticated (user: null) → 401", async () => {
		const event = createUploadEvent({ user: null });
		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(401);
		}
	});

	it("rejects without tenant context (tenantId: null) → 403", async () => {
		const event = createUploadEvent({ tenantId: null });
		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(403);
		}
	});
});

// ============================================================================
// Feature Gates
// ============================================================================

describe("POST /api/images/upload — Feature Gates", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects when CACHE_KV missing → 403", async () => {
		const event = createUploadEvent({});
		event.platform.env.CACHE_KV = undefined as any;

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(response.status).toBe(403);
		expect(body.error).toBeDefined();
	});

	it("rejects when canUploadImages returns not allowed → 403", async () => {
		const { canUploadImages } = await vi.importMock("$lib/server/upload-gate.js");
		canUploadImages.mockResolvedValueOnce({ allowed: false });

		const event = createUploadEvent({});
		const response = await uploadHandler(event as any);

		expect(response.status).toBe(403);
	});
});

// ============================================================================
// Environment Validation
// ============================================================================

describe("POST /api/images/upload — Environment Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects when env validation fails → 503", async () => {
		const { validateEnv } = await vi.importMock("$lib/server/env-validation.js");
		validateEnv.mockReturnValueOnce({ valid: false, message: "Missing IMAGES" });

		const event = createUploadEvent({});
		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(503);
		}
	});
});

// ============================================================================
// File Validation
// ============================================================================

describe("POST /api/images/upload — File Validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("rejects when no file in formData → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(undefined),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects invalid MIME type (e.g., image/svg+xml) → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.svg", "image/svg+xml", 100)),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects file without extension → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo", "image/jpeg", 100, JPEG_MAGIC)),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects extension/MIME mismatch (photo.png with image/jpeg) → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.png", "image/jpeg", 100, JPEG_MAGIC)),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects double extension attack (malware.php.jpg) → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(
				createMockFile("malware.php.jpg", "image/jpeg", 100, JPEG_MAGIC),
			),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects oversized file (>10MB) → 400", async () => {
		const event = createUploadEvent({
			formData: createMockFormData(
				createMockFile("big.jpg", "image/jpeg", 11 * 1024 * 1024, JPEG_MAGIC),
			),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});

	it("rejects invalid file signature (wrong magic bytes) → 400", async () => {
		const { validateFileSignature } = await vi.importMock("$lib/utils/upload-validation.js");
		validateFileSignature.mockReturnValueOnce(false);

		const event = createUploadEvent({
			formData: createMockFormData(
				createMockFile("fake.jpg", "image/jpeg", 100, new Uint8Array(100)),
			),
		});

		try {
			await uploadHandler(event as any);
			expect.unreachable("should throw");
		} catch (e: any) {
			expect(e.status).toBe(400);
		}
	});
});

// ============================================================================
// Successful Upload
// ============================================================================

describe("POST /api/images/upload — Successful Upload", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("uploads valid JPEG with tenant-prefixed key", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("sunset.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(body.key).toContain(TENANT_ID);
		expect(body.key).toContain("photos/");
		expect(body.url).toContain("https://cdn.grove.place/");
	});

	it("key format: {tenantId}/photos/YYYY/MM/DD/{filename}-{timestamp}.{ext}", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.png", "image/png", 100, PNG_MAGIC)),
			r2,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		const key = body.key;
		const parts = key.split("/");

		expect(parts[0]).toBe(TENANT_ID);
		expect(parts[1]).toBe("photos");
		expect(/^\d{4}$/.test(parts[2])).toBe(true); // YYYY
		expect(/^\d{2}$/.test(parts[3])).toBe(true); // MM
		expect(/^\d{2}$/.test(parts[4])).toBe(true); // DD
		expect(parts[5]).toMatch(/-[a-z0-9]+\.png$/); // filename-timestamp.ext
	});

	it("sets R2 httpMetadata (contentType, cacheControl: immutable)", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		await uploadHandler(event as any);

		expect(r2.put).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(ArrayBuffer),
			expect.objectContaining({
				httpMetadata: expect.objectContaining({
					contentType: "image/jpeg",
					cacheControl: expect.stringContaining("immutable"),
				}),
			}),
		);
	});

	it("sets customMetadata (altText, description truncated)", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.jpg", "image/jpeg", 100, JPEG_MAGIC), {
				altText: "A beautiful sunset",
				description: "This is a description of the image",
			}),
			r2,
		});

		// Mock parseFormData to return the metadata
		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "A beautiful sunset",
				description: "This is a description of the image",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		await uploadHandler(event as any);

		expect(r2.put).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(ArrayBuffer),
			expect.objectContaining({
				customMetadata: expect.objectContaining({
					altText: "A beautiful sunset",
					description: "This is a description of the image",
				}),
			}),
		);
	});

	it("returns success response with url, key, filename, markdown, html, svelte fields", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "Mountain view",
				description: "",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(body.url).toContain("https://cdn.grove.place/");
		expect(body.key).toBeDefined();
		expect(body.filename).toBeDefined();
		expect(body.markdown).toBeDefined();
		expect(body.html).toBeDefined();
		expect(body.svelte).toBeDefined();
	});

	it("response has Cache-Control: no-store header", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const response = await uploadHandler(event as any);

		expect(response.headers.get("Cache-Control")).toBe("no-store");
	});
});

// ============================================================================
// Filename Handling
// ============================================================================

describe("POST /api/images/upload — Filename Handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sanitizes original filename (lowercase, replace special chars with hyphens)", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(
				createMockFile("My Photo_2024!.jpg", "image/jpeg", 100, JPEG_MAGIC),
			),
			r2,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.filename).toContain("my-photo-2024");
		expect(body.filename).not.toContain("_");
		expect(body.filename).not.toContain("!");
	});

	it("adds base-36 timestamp for collision prevention", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		// Timestamp should be in base-36 format (alphanumeric)
		expect(body.filename).toMatch(/-[a-z0-9]+\.jpg$/);
	});
});

// ============================================================================
// Duplicate Detection
// ============================================================================

describe("POST /api/images/upload — Duplicate Detection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns existing URL when hash matches → success:true, duplicate:true", async () => {
		const db = createMockDB();
		db.prepare = vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return {
					first: vi.fn(async () => ({
						key: `${TENANT_ID}/photos/2024/01/01/existing.jpg`,
						url: "https://cdn.grove.place/existing.jpg",
					})),
					run: vi.fn(async () => ({ meta: { changes: 0 } })),
				};
			}),
		}));

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			db,
		});

		// Mock parseFormData to include a hash
		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: "abc123def456",
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(body.duplicate).toBe(true);
		expect(body.url).toBe("https://cdn.grove.place/existing.jpg");
	});

	it("continues upload when hash doesn't match", async () => {
		const r2 = createMockR2();
		const db = createMockDB();
		db.prepare = vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return {
					first: vi.fn(async () => null), // No existing hash
					run: vi.fn(async () => ({ meta: { changes: 0 } })),
				};
			}),
		}));

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			db,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: "xyz789",
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(body.duplicate).toBeUndefined();
		expect(r2.put).toHaveBeenCalled();
	});

	it("skips duplicate check when no hash provided", async () => {
		const r2 = createMockR2();
		const db = createMockDB();

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			db,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		// DB prepare should not be called for duplicate check (will be called for gallery insert, which is ok)
	});

	it("gracefully handles D1 query failure in duplicate check", async () => {
		const r2 = createMockR2();
		const db = createMockDB();
		db.prepare = vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				return {
					first: vi.fn(async () => {
						throw new Error("D1 unavailable");
					}),
					run: vi.fn(async () => ({ meta: { changes: 0 } })),
				};
			}),
		}));

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			db,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: "abc123",
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		// Should still succeed — D1 failure is non-critical
		expect(body.success).toBe(true);
		expect(r2.put).toHaveBeenCalled();
	});
});

// ============================================================================
// Content Moderation (Petal)
// ============================================================================

describe("POST /api/images/upload — Content Moderation (Petal)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("skips scan when no AI binding or API key", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			ai: undefined,
		});
		event.platform.env.TOGETHER_API_KEY = undefined as any;

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
	});

	it("rejects when Petal scan returns not allowed → 400", async () => {
		const { scanImage } = await vi.importMock("$lib/server/petal/index.js");
		scanImage.mockResolvedValueOnce({
			allowed: false,
			message: "Content violates policy",
			processingTimeMs: 100,
		});

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			ai: {},
		});

		const response = await uploadHandler(event as any);

		expect(response.status).toBe(400);
	});

	it("passes context mapping (tryon, profile, blog → petal context; unknown → general)", async () => {
		const { scanImage } = await vi.importMock("$lib/server/petal/index.js");

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			ai: {},
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "tryon",
			},
		});

		await uploadHandler(event as any);

		expect(scanImage).toHaveBeenCalledWith(
			expect.objectContaining({
				context: "tryon",
			}),
			expect.any(Object),
		);
	});

	it("maps unknown context to 'general'", async () => {
		const { scanImage } = await vi.importMock("$lib/server/petal/index.js");

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			ai: {},
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "unknown-context",
			},
		});

		await uploadHandler(event as any);

		expect(scanImage).toHaveBeenCalledWith(
			expect.objectContaining({
				context: "general",
			}),
			expect.any(Object),
		);
	});
});

// ============================================================================
// D1 Graceful Degradation
// ============================================================================

describe("POST /api/images/upload — D1 Graceful Degradation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("hash storage failure doesn't fail upload", async () => {
		const r2 = createMockR2();
		const db = createMockDB();

		let callCount = 0;
		db.prepare = vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				callCount++;
				if (callCount > 1) {
					// First call is for duplicate check (might not happen), later calls are for hash/gallery insert
					return {
						first: vi.fn(async () => null),
						run: vi.fn(async () => {
							throw new Error("Hash table not found");
						}),
					};
				}
				return {
					first: vi.fn(async () => null),
					run: vi.fn(async () => ({ meta: { changes: 0 } })),
				};
			}),
		}));

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			db,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "",
				description: "",
				hash: "abc123",
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(r2.put).toHaveBeenCalled();
	});

	it("gallery insert failure doesn't fail upload", async () => {
		const r2 = createMockR2();
		const db = createMockDB();

		let callCount = 0;
		db.prepare = vi.fn(() => ({
			bind: vi.fn(function (this: any) {
				callCount++;
				// Make gallery insert fail (typically the last call)
				if (callCount >= 3) {
					return {
						first: vi.fn(async () => null),
						run: vi.fn(async () => {
							throw new Error("Gallery table not found");
						}),
					};
				}
				return {
					first: vi.fn(async () => null),
					run: vi.fn(async () => ({ meta: { changes: 0 } })),
				};
			}),
		}));

		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("photo.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
			db,
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.success).toBe(true);
		expect(r2.put).toHaveBeenCalled();
	});
});

// ============================================================================
// Copy Formats
// ============================================================================

describe("POST /api/images/upload — Copy Formats", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("markdown format: ![altText](cdnUrl)", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: "Beautiful sunset",
				description: "",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.markdown).toBe(`![Beautiful sunset](${body.url})`);
	});

	it("html escapes quotes in altText", async () => {
		const r2 = createMockR2();
		const event = createUploadEvent({
			formData: createMockFormData(createMockFile("test.jpg", "image/jpeg", 100, JPEG_MAGIC)),
			r2,
		});

		const { parseFormData } = await vi.importMock("$lib/server/utils/form-data.js");
		parseFormData.mockReturnValueOnce({
			success: true,
			data: {
				filename: null,
				altText: 'Photo with "quotes"',
				description: "",
				hash: null,
				imageFormat: null,
				originalSize: null,
				storedSize: null,
				dominantColor: null,
				imageWidth: null,
				imageHeight: null,
				context: "general",
			},
		});

		const response = await uploadHandler(event as any);
		const body = (await response.json()) as any;

		expect(body.html).toContain('alt="Photo with &quot;quotes&quot;"');
		expect(body.svelte).toContain('alt="Photo with &quot;quotes&quot;"');
	});
});
