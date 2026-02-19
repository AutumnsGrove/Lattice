import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock $app/environment to ensure browser is false (forces real API calls, not mock data)
vi.mock("$app/environment", () => ({
	browser: false,
	dev: false,
	building: false,
	version: "test",
}));

import * as api from "./api";

// Mock the base URL used by the API client
const WORKER_API_BASE = "https://amber-api.grove.place/api/storage";

describe("API Client", () => {
	const originalFetch = global.fetch;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	afterEach(() => {
		global.fetch = originalFetch;
	});

	function mockFetch(response: unknown, status = 200) {
		global.fetch = vi.fn().mockResolvedValue({
			ok: status >= 200 && status < 300,
			status,
			json: () => Promise.resolve(response),
		});
	}

	describe("getStorageInfo", () => {
		it("should fetch storage info successfully", async () => {
			const mockData = {
				quota: {
					tier_gb: 20,
					additional_gb: 0,
					total_gb: 20,
					used_bytes: 5000000000,
					used_gb: 4.66,
					available_bytes: 16463088435,
					percentage: 23.3,
					warning_level: "none",
				},
				breakdown: [{ product: "blog", category: "images", bytes: 4000000000, file_count: 50 }],
			};

			mockFetch(mockData);

			const result = await api.getStorageInfo();

			expect(result.data).toEqual(mockData);
			expect(result.error).toBeUndefined();
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}`,
				expect.objectContaining({
					headers: expect.objectContaining({ "Content-Type": "application/json" }),
				}),
			);
		});

		it("should handle errors", async () => {
			mockFetch({ error: "Unauthorized" }, 401);

			const result = await api.getStorageInfo();

			expect(result.error).toBe("Unauthorized");
			expect(result.data).toBeUndefined();
		});

		it("should handle network errors", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

			const result = await api.getStorageInfo();

			expect(result.error).toBe("Network failure");
		});
	});

	describe("getFiles", () => {
		it("should fetch files with default options", async () => {
			const mockFiles = {
				files: [
					{
						id: "file_1",
						filename: "photo.jpg",
						size_bytes: 1024000,
						product: "blog",
					},
				],
				total: 1,
				limit: 50,
				offset: 0,
			};

			mockFetch(mockFiles);

			const result = await api.getFiles();

			expect(result.data).toEqual(mockFiles);
			expect(global.fetch).toHaveBeenCalledWith(`${WORKER_API_BASE}/files`, expect.any(Object));
		});

		it("should include query parameters", async () => {
			mockFetch({ files: [], total: 0, limit: 20, offset: 10 });

			await api.getFiles({
				product: "blog",
				category: "images",
				search: "photo",
				sort: "size_bytes",
				order: "desc",
				limit: 20,
				offset: 10,
			});

			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/files?product=blog&category=images&search=photo&sort=size_bytes&order=desc&limit=20&offset=10`,
				expect.any(Object),
			);
		});
	});

	describe("getFile", () => {
		it("should fetch single file by ID", async () => {
			const mockFile = {
				id: "file_123",
				filename: "document.pdf",
				size_bytes: 2048000,
			};

			mockFetch(mockFile);

			const result = await api.getFile("file_123");

			expect(result.data).toEqual(mockFile);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/files/file_123`,
				expect.any(Object),
			);
		});

		it("should handle not found", async () => {
			mockFetch({ error: "File not found" }, 404);

			const result = await api.getFile("nonexistent");

			expect(result.error).toBe("File not found");
		});
	});

	describe("deleteFile", () => {
		it("should delete file (soft delete)", async () => {
			mockFetch({ success: true, message: "File moved to trash" });

			const result = await api.deleteFile("file_123");

			expect(result.data?.success).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/files/file_123`,
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});

	describe("restoreFile", () => {
		it("should restore file from trash", async () => {
			mockFetch({ success: true, message: "File restored" });

			const result = await api.restoreFile("file_123");

			expect(result.data?.success).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/files/file_123/restore`,
				expect.objectContaining({ method: "POST" }),
			);
		});
	});

	describe("getTrash", () => {
		it("should fetch trash files", async () => {
			const mockTrash = {
				files: [{ id: "file_1", filename: "deleted.jpg", deleted_at: "2025-01-01" }],
				total_size: 5000000,
			};

			mockFetch(mockTrash);

			const result = await api.getTrash();

			expect(result.data).toEqual(mockTrash);
			expect(global.fetch).toHaveBeenCalledWith(`${WORKER_API_BASE}/trash`, expect.any(Object));
		});
	});

	describe("emptyTrash", () => {
		it("should empty all trash", async () => {
			mockFetch({ success: true, deleted_count: 5, freed_bytes: 10000000 });

			const result = await api.emptyTrash();

			expect(result.data?.success).toBe(true);
			expect(result.data?.deleted_count).toBe(5);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/trash`,
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});

	describe("permanentlyDeleteFile", () => {
		it("should permanently delete file from trash", async () => {
			mockFetch({ success: true, freed_bytes: 1024000 });

			const result = await api.permanentlyDeleteFile("file_123");

			expect(result.data?.success).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/trash/file_123`,
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});

	describe("createExport", () => {
		it("should create export job", async () => {
			mockFetch({
				export_id: "export_abc",
				status: "pending",
				message: "Export job created",
			});

			const result = await api.createExport({ type: "full" });

			expect(result.data?.export_id).toBe("export_abc");
			expect(result.data?.status).toBe("pending");
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/export`,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ type: "full" }),
				}),
			);
		});

		it("should include filters", async () => {
			mockFetch({ export_id: "export_xyz", status: "pending" });

			await api.createExport({
				type: "category",
				filters: { category: "images" },
			});

			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/export`,
				expect.objectContaining({
					body: JSON.stringify({
						type: "category",
						filters: { category: "images" },
					}),
				}),
			);
		});
	});

	describe("getExport", () => {
		it("should get export status", async () => {
			const mockExport = {
				id: "export_123",
				status: "completed",
				size_bytes: 50000000,
				file_count: 100,
			};

			mockFetch(mockExport);

			const result = await api.getExport("export_123");

			expect(result.data).toEqual(mockExport);
		});
	});

	describe("getExportDownload", () => {
		it("should get download URL", async () => {
			mockFetch({
				download_url: "/api/storage/download/exports/user_123/export.zip",
				expires_at: "2025-01-08T00:00:00Z",
			});

			const result = await api.getExportDownload("export_123");

			expect(result.data?.download_url).toBeDefined();
			expect(result.data?.expires_at).toBeDefined();
		});
	});

	describe("getAddons", () => {
		it("should get available and purchased addons", async () => {
			const mockAddons = {
				available: [{ type: "storage_10gb", gb: 10, price_cents: 100, price_display: "$1/mo" }],
				purchased: [{ id: "addon_1", addon_type: "storage_50gb", gb_amount: 50, active: true }],
			};

			mockFetch(mockAddons);

			const result = await api.getAddons();

			expect(result.data).toEqual(mockAddons);
		});
	});

	describe("purchaseAddon", () => {
		it("should initiate addon purchase", async () => {
			mockFetch({
				message: "Redirecting to checkout",
				redirect_url: "/checkout/session_abc",
			});

			const result = await api.purchaseAddon("storage_50gb");

			expect(result.data?.redirect_url).toBeDefined();
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/addons`,
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ addon_type: "storage_50gb" }),
				}),
			);
		});
	});

	describe("cancelAddon", () => {
		it("should cancel addon", async () => {
			mockFetch({
				success: true,
				message: "Addon will be cancelled at end of billing period",
			});

			const result = await api.cancelAddon("addon_123");

			expect(result.data?.success).toBe(true);
			expect(global.fetch).toHaveBeenCalledWith(
				`${WORKER_API_BASE}/addons/addon_123`,
				expect.objectContaining({ method: "DELETE" }),
			);
		});
	});

	describe("getDownloadUrl", () => {
		it("should generate download URL", () => {
			const url = api.getDownloadUrl("user_123/blog/images/photo.jpg");

			expect(url).toBe(`${WORKER_API_BASE}/download/user_123%2Fblog%2Fimages%2Fphoto.jpg`);
		});
	});
});
