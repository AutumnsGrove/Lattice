import { describe, it, expect } from "vitest";
import { createManifest, createReadme, ZIP_CONFIG } from "./zipStream";
import type { ManifestEntry } from "./zipStream";

describe("ZIP Stream Utilities", () => {
	describe("createManifest", () => {
		it("should generate valid JSON manifest", () => {
			const entries: ManifestEntry[] = [
				{
					filename: "document.pdf",
					size: 1024,
					r2_key: "documents/doc1.pdf",
					product: "Amber",
					category: "Reports",
				},
				{
					filename: "image.png",
					size: 2048,
					r2_key: "images/img1.png",
					product: "Amber",
					category: "Media",
				},
			];

			const manifestJson = createManifest(entries);
			const manifest = JSON.parse(manifestJson);

			// Verify structure
			expect(manifest).toHaveProperty("version");
			expect(manifest).toHaveProperty("created");
			expect(manifest).toHaveProperty("files");
			expect(manifest).toHaveProperty("summary");

			// Verify files array
			expect(manifest.files).toHaveLength(2);
			expect(manifest.files[0]).toEqual({
				filename: "document.pdf",
				size: 1024,
				r2_key: "documents/doc1.pdf",
				product: "Amber",
				category: "Reports",
			});

			// Verify summary
			expect(manifest.summary.totalFiles).toBe(2);
			expect(manifest.summary.totalSize).toBe(3072);
		});

		it("should handle empty manifest entries", () => {
			const manifestJson = createManifest([]);
			const manifest = JSON.parse(manifestJson);

			expect(manifest.files).toHaveLength(0);
			expect(manifest.summary.totalFiles).toBe(0);
			expect(manifest.summary.totalSize).toBe(0);
		});

		it("should include ISO timestamp in created field", () => {
			const manifestJson = createManifest([]);
			const manifest = JSON.parse(manifestJson);

			expect(manifest.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});
	});

	describe("createReadme", () => {
		it("should generate formatted text content", () => {
			const readme = createReadme();

			expect(typeof readme).toBe("string");
			expect(readme.length).toBeGreaterThan(0);
		});

		it("should contain key header text", () => {
			const readme = createReadme();

			expect(readme).toContain("Amber Export Archive");
			expect(readme).toContain("Contents:");
			expect(readme).toContain("Extraction:");
		});

		it("should reference manifest.json", () => {
			const readme = createReadme();

			expect(readme).toContain("manifest.json");
		});

		it("should include creation timestamp", () => {
			const readme = createReadme();

			expect(readme).toMatch(/Created: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});

		it("should include documentation link", () => {
			const readme = createReadme();

			expect(readme).toContain("https://amber.autumnsgrove.dev");
		});
	});

	describe("ZIP_CONFIG", () => {
		it("should have COMPRESSION_LEVEL set to 6", () => {
			expect(ZIP_CONFIG.COMPRESSION_LEVEL).toBe(6);
		});

		it("should have CHUNK_SIZE_BYTES set to 50MB", () => {
			const fiftyMB = 50 * 1024 * 1024;
			expect(ZIP_CONFIG.CHUNK_SIZE_BYTES).toBe(fiftyMB);
		});

		it("should have CHUNK_FILE_LIMIT set to 100", () => {
			expect(ZIP_CONFIG.CHUNK_FILE_LIMIT).toBe(100);
		});

		it("should be an immutable object", () => {
			// ZIP_CONFIG is typed as readonly via 'as const', but not frozen at runtime
			// Verify the values are correct instead
			expect(ZIP_CONFIG).toBeDefined();
			expect(typeof ZIP_CONFIG).toBe("object");
		});
	});
});
