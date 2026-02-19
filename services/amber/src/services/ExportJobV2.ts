/**
 * ExportJob Durable Object
 *
 * Handles background processing of file exports to ZIP archives.
 * Uses SQLite storage for persistent state and alarm-based chunk processing.
 *
 * Architecture (inspired by Forage):
 * - SQLite tables store job state, processed files, and missing files
 * - Alarm API drives batch processing loop
 * - State survives DO hibernation and restarts
 */

import { ZipStreamer, createManifest, createReadme, ZIP_CONFIG } from "./zipStream";
import type { Env } from "../index";

/**
 * Export job status
 */
type ExportStatus = "pending" | "running" | "completed" | "failed";

/**
 * File record from D1 database
 */
interface FileRecord {
	id: string;
	r2_key: string;
	filename: string;
	size_bytes: number;
	mime_type: string;
	product: string;
	category: string;
	created_at: string;
}

/**
 * Processed file record stored in DO SQLite
 */
interface ProcessedFile {
	id: string;
	r2_key: string;
	filename: string;
	size_bytes: number;
	product: string;
	category: string;
}

/**
 * ExportJob Durable Object with SQLite storage for reliable state management
 */
export class ExportJobV2 implements DurableObject {
	private state: DurableObjectState;
	private sql: SqlStorage;
	private env: Env;
	private initialized = false;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.sql = state.storage.sql;
		this.env = env;
		console.log("[ExportJobV2] Constructor called, DO ID:", state.id.toString());
	}

	/**
	 * Initialize SQLite schema if not already done
	 */
	private ensureSchema(): void {
		if (this.initialized) return;

		// Create tables for export state (sql already initialized in constructor)
		this.sql.exec(`
      -- Core export job tracking (single row per DO instance)
      CREATE TABLE IF NOT EXISTS export_job (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        export_type TEXT NOT NULL,
        filter_params TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        current_offset INTEGER DEFAULT 0,
        total_size INTEGER DEFAULT 0,
        file_count INTEGER DEFAULT 0,
        r2_key TEXT,
        error TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Processed files ready for zipping
      CREATE TABLE IF NOT EXISTS export_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_id TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        filename TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        product TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Files that were missing in R2
      CREATE TABLE IF NOT EXISTS export_missing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        r2_key TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Index for faster queries
      CREATE INDEX IF NOT EXISTS idx_export_files_r2_key ON export_files(r2_key);
    `);

		this.initialized = true;
	}

	/**
	 * Handle HTTP requests to the Durable Object
	 */
	async fetch(request: Request): Promise<Response> {
		this.ensureSchema();

		const url = new URL(request.url);
		const action = url.searchParams.get("action");
		const exportId = url.searchParams.get("exportId");

		console.log("[ExportJob] fetch() called with action:", action, "exportId:", exportId);

		try {
			if (action === "start" && exportId) {
				return await this.handleStart(exportId);
			}

			if (action === "status") {
				return this.handleGetStatus();
			}

			if (action === "reset") {
				return await this.handleReset();
			}

			// Legacy sync processing - still supported as fallback
			if (action === "process-sync" && exportId) {
				return await this.handleProcessSync(exportId);
			}

			return new Response(JSON.stringify({ error: "Invalid action" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			console.error("[ExportJob] Request error:", error);
			return new Response(JSON.stringify({ error: String(error) }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	/**
	 * Alarm handler - processes chunks and schedules next iteration
	 */
	async alarm(): Promise<void> {
		this.ensureSchema();

		const job = this.getJob();
		if (!job) {
			console.error("[ExportJob] Alarm fired but no job found");
			return;
		}

		if (job.status !== "running") {
			console.log(`[ExportJob] Job status is ${job.status}, skipping alarm`);
			return;
		}

		console.log(
			"[ExportJob] Alarm processing chunk for export:",
			job.id,
			"offset:",
			job.current_offset,
		);

		try {
			// Process next chunk of files
			const hasMoreChunks = await this.processChunk(job);
			console.log(
				"[ExportJob] Chunk processed, hasMore:",
				hasMoreChunks,
				"files:",
				this.getProcessedFileCount(),
			);

			if (hasMoreChunks) {
				// Schedule next chunk processing (2 second delay between chunks)
				await this.scheduleAlarm(2000);
			} else {
				// All chunks processed, finalize the export
				console.log("[ExportJob] No more chunks, finalizing export...");
				await this.finalizeExport(job);
				console.log("[ExportJob] Export finalized successfully");
			}
		} catch (error) {
			console.error("[ExportJob] Alarm processing error:", error);
			this.updateJobStatus("failed", String(error));
			await this.updateD1Status(job.id, "failed", String(error));
		}
	}

	/**
	 * Start a new export job
	 */
	private async handleStart(exportId: string): Promise<Response> {
		// Check if job already exists
		const existing = this.getJob();
		if (existing) {
			return new Response(JSON.stringify({ error: "Job already exists", job_id: existing.id }), {
				status: 409,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Fetch export from D1 to get metadata
		const result = await this.env.DB.prepare(
			"SELECT id, user_id, export_type, filter_params FROM storage_exports WHERE id = ?",
		)
			.bind(exportId)
			.first<{
				id: string;
				user_id: string;
				export_type: string;
				filter_params: string | null;
			}>();

		if (!result) {
			return new Response(JSON.stringify({ error: `Export ${exportId} not found` }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Create job in SQLite
		const r2Key = `exports/${result.user_id}/${exportId}/${Date.now()}-export.zip`;

		this.sql.exec(
			`INSERT INTO export_job (id, user_id, export_type, filter_params, status, r2_key)
       VALUES (?, ?, ?, ?, 'running', ?)`,
			exportId,
			result.user_id,
			result.export_type,
			result.filter_params,
			r2Key,
		);

		// Update D1 to mark as processing
		await this.env.DB.prepare("UPDATE storage_exports SET status = 'processing' WHERE id = ?")
			.bind(exportId)
			.run();

		// Schedule first alarm immediately
		await this.scheduleAlarm(0);

		console.log("[ExportJob] Job started:", exportId, "scheduled first alarm");

		return new Response(JSON.stringify({ job_id: exportId, status: "running" }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	}

	/**
	 * Get current job status
	 */
	private handleGetStatus(): Response {
		const job = this.getJob();
		if (!job) {
			return new Response(JSON.stringify({ error: "No job found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const fileCount = this.getProcessedFileCount();
		const missingCount = this.getMissingFileCount();

		return new Response(
			JSON.stringify({
				job_id: job.id,
				status: job.status,
				current_offset: job.current_offset,
				total_size: job.total_size,
				file_count: fileCount,
				missing_files: missingCount,
				r2_key: job.r2_key,
				error: job.error,
				created_at: job.created_at,
				updated_at: job.updated_at,
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	}

	/**
	 * Reset DO state (clear all tables)
	 */
	private async handleReset(): Promise<Response> {
		this.sql.exec("DELETE FROM export_job");
		this.sql.exec("DELETE FROM export_files");
		this.sql.exec("DELETE FROM export_missing");

		console.log("[ExportJob] DO state cleared via reset action");

		return new Response(JSON.stringify({ success: true, message: "DO state cleared" }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	/**
	 * Process export synchronously (fallback for cron-based processing)
	 */
	private async handleProcessSync(exportId: string): Promise<Response> {
		// Check if already processing
		let job = this.getJob();

		if (!job) {
			// Initialize the job first
			const startResponse = await this.handleStart(exportId);
			if (startResponse.status !== 201) {
				return startResponse;
			}
			job = this.getJob();
		}

		if (!job) {
			return new Response(JSON.stringify({ error: "Failed to create job" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Ensure status is running
		if (job.status !== "running") {
			this.updateJobStatus("running");
		}

		try {
			// Process all chunks synchronously
			let hasMoreChunks = true;
			while (hasMoreChunks) {
				hasMoreChunks = await this.processChunk(job);
				job = this.getJob()!; // Refresh job state
				console.log(
					"[ExportJob] Sync chunk processed, hasMore:",
					hasMoreChunks,
					"files:",
					this.getProcessedFileCount(),
				);
			}

			// Finalize
			await this.finalizeExport(job);

			return new Response(JSON.stringify({ success: true, message: "Export processed" }), {
				headers: { "Content-Type": "application/json" },
			});
		} catch (error) {
			console.error("[ExportJob] Sync processing error:", error);
			this.updateJobStatus("failed", String(error));
			await this.updateD1Status(job.id, "failed", String(error));

			return new Response(JSON.stringify({ success: false, error: String(error) }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	// ============================================================================
	// Helper methods
	// ============================================================================

	/**
	 * Get job from SQLite
	 */
	private getJob(): {
		id: string;
		user_id: string;
		export_type: string;
		filter_params: string | null;
		status: ExportStatus;
		current_offset: number;
		total_size: number;
		file_count: number;
		r2_key: string;
		error: string | null;
		created_at: string;
		updated_at: string;
	} | null {
		const rows = this.sql
			.exec<{
				id: string;
				user_id: string;
				export_type: string;
				filter_params: string | null;
				status: string;
				current_offset: number;
				total_size: number;
				file_count: number;
				r2_key: string;
				error: string | null;
				created_at: string;
				updated_at: string;
			}>("SELECT * FROM export_job LIMIT 1")
			.toArray();

		if (rows.length === 0) return null;

		const row = rows[0];
		return {
			...row,
			status: row.status as ExportStatus,
		};
	}

	/**
	 * Update job status in SQLite
	 */
	private updateJobStatus(status: ExportStatus, error?: string): void {
		if (error) {
			this.sql.exec(
				`UPDATE export_job SET status = ?, error = ?, updated_at = datetime('now')`,
				status,
				error,
			);
		} else {
			this.sql.exec(`UPDATE export_job SET status = ?, updated_at = datetime('now')`, status);
		}
	}

	/**
	 * Update job offset after processing a chunk
	 */
	private updateJobOffset(offset: number, totalSize: number): void {
		this.sql.exec(
			`UPDATE export_job SET current_offset = ?, total_size = ?, updated_at = datetime('now')`,
			offset,
			totalSize,
		);
	}

	/**
	 * Schedule an alarm
	 */
	private async scheduleAlarm(delayMs: number): Promise<void> {
		const time = Date.now() + delayMs;
		await this.state.storage.setAlarm(time);
		console.log(`[ExportJob] Scheduled alarm for ${new Date(time).toISOString()}`);
	}

	/**
	 * Get count of processed files
	 */
	private getProcessedFileCount(): number {
		const result = this.sql
			.exec<{ count: number }>("SELECT COUNT(*) as count FROM export_files")
			.toArray();
		return result[0]?.count ?? 0;
	}

	/**
	 * Get count of missing files
	 */
	private getMissingFileCount(): number {
		const result = this.sql
			.exec<{ count: number }>("SELECT COUNT(*) as count FROM export_missing")
			.toArray();
		return result[0]?.count ?? 0;
	}

	/**
	 * Get all processed files
	 */
	private getProcessedFiles(): ProcessedFile[] {
		const rows = this.sql
			.exec<{
				file_id: string;
				r2_key: string;
				filename: string;
				size_bytes: number;
				product: string;
				category: string;
			}>("SELECT file_id, r2_key, filename, size_bytes, product, category FROM export_files")
			.toArray();

		return rows.map((r) => ({
			id: r.file_id,
			r2_key: r.r2_key,
			filename: r.filename,
			size_bytes: r.size_bytes,
			product: r.product,
			category: r.category,
		}));
	}

	/**
	 * Save a processed file
	 */
	private saveProcessedFile(file: ProcessedFile): void {
		this.sql.exec(
			`INSERT INTO export_files (file_id, r2_key, filename, size_bytes, product, category)
       VALUES (?, ?, ?, ?, ?, ?)`,
			file.id,
			file.r2_key,
			file.filename,
			file.size_bytes,
			file.product,
			file.category,
		);
	}

	/**
	 * Save a missing file
	 */
	private saveMissingFile(r2Key: string): void {
		this.sql.exec("INSERT INTO export_missing (r2_key) VALUES (?)", r2Key);
	}

	/**
	 * Update D1 status (external database)
	 */
	private async updateD1Status(exportId: string, status: string, error?: string): Promise<void> {
		if (error) {
			await this.env.DB.prepare(
				`UPDATE storage_exports SET status = ?, error_message = ? WHERE id = ?`,
			)
				.bind(status, error, exportId)
				.run();
		} else {
			await this.env.DB.prepare(`UPDATE storage_exports SET status = ? WHERE id = ?`)
				.bind(status, exportId)
				.run();
		}
	}

	// ============================================================================
	// Core processing logic
	// ============================================================================

	/**
	 * Process a single chunk of files
	 * Returns true if more chunks exist
	 */
	private async processChunk(job: {
		id: string;
		user_id: string;
		export_type: string;
		filter_params: string | null;
		current_offset: number;
		total_size: number;
	}): Promise<boolean> {
		const filters = job.filter_params ? JSON.parse(job.filter_params) : null;
		const query = this.buildFileQuery(job.user_id, job.export_type, filters);
		const [baseQuery, params] = query;

		// Fetch batch of files
		const files = await this.env.DB.prepare(`${baseQuery} LIMIT ? OFFSET ?`)
			.bind(...params, ZIP_CONFIG.CHUNK_FILE_LIMIT, job.current_offset)
			.all<FileRecord>();

		if (!files.results || files.results.length === 0) {
			return false; // No more files
		}

		let chunkSize = job.total_size;

		// Process files in parallel batches of 10
		const batchSize = 10;
		for (let i = 0; i < files.results.length; i += batchSize) {
			const batch = files.results.slice(i, i + batchSize);
			const promises = batch.map(async (file) => {
				try {
					const object = await this.env.R2_BUCKET.head(file.r2_key);
					if (!object) {
						this.saveMissingFile(file.r2_key);
						return;
					}

					// Store file metadata for later zipping
					this.saveProcessedFile({
						id: file.id,
						r2_key: file.r2_key,
						filename: file.filename,
						size_bytes: file.size_bytes,
						product: file.product,
						category: file.category,
					});

					chunkSize += file.size_bytes;
				} catch (error) {
					console.warn(`Failed to check file ${file.r2_key}:`, error);
					this.saveMissingFile(file.r2_key);
				}
			});

			await Promise.all(promises);
		}

		// Update offset
		const newOffset = job.current_offset + files.results.length;
		this.updateJobOffset(newOffset, chunkSize);

		// Log missing files count
		const missingCount = this.getMissingFileCount();
		if (missingCount > 0) {
			console.info(`Export ${job.id}: ${missingCount} files missing in R2`);
		}

		// Check if we've exceeded chunk size limit or got all files
		if (chunkSize >= ZIP_CONFIG.CHUNK_SIZE_BYTES) {
			return true; // More chunks needed (size limit)
		}

		if (files.results.length < ZIP_CONFIG.CHUNK_FILE_LIMIT) {
			return false; // No more files available
		}

		return true; // More chunks available
	}

	/**
	 * Finalize export by streaming all files to ZIP and uploading to R2
	 */
	private async finalizeExport(job: {
		id: string;
		user_id: string;
		r2_key: string;
		export_type: string;
	}): Promise<void> {
		const processedFiles = this.getProcessedFiles();
		console.log("[ExportJob] Finalizing export, creating ZIP with", processedFiles.length, "files");

		// Handle empty export
		if (processedFiles.length === 0) {
			console.log("[ExportJob] No files to export, marking as completed with 0 files");
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
			await this.env.DB.prepare(
				`UPDATE storage_exports
         SET status = 'completed', r2_key = NULL, expires_at = ?, size_bytes = 0, file_count = 0
         WHERE id = ?`,
			)
				.bind(expiresAt, job.id)
				.run();
			this.updateJobStatus("completed");
			console.info(`Export ${job.id} completed with 0 files (all files missing in R2)`);
			return;
		}

		const MIN_PART_SIZE = 5 * 1024 * 1024; // 5MB minimum per part (R2 requirement)

		// Create multipart upload
		const multipartUpload = await this.env.R2_BUCKET.createMultipartUpload(job.r2_key, {
			customMetadata: {
				"export-id": job.id,
				"user-id": job.user_id,
				"export-type": job.export_type,
				"file-count": processedFiles.length.toString(),
			},
		});

		console.log("[ExportJob] Created multipart upload:", multipartUpload.uploadId);

		const uploadedParts: { partNumber: number; etag: string }[] = [];
		let partNumber = 1;
		let currentBuffer: Uint8Array[] = [];
		let currentBufferSize = 0;
		let totalBytesUploaded = 0;

		// Helper to upload a part when buffer is large enough
		const uploadPart = async (isLast: boolean): Promise<void> => {
			if (currentBufferSize === 0) return;
			if (!isLast && currentBufferSize < MIN_PART_SIZE) return;

			// Combine buffer chunks
			const combined = new Uint8Array(currentBufferSize);
			let offset = 0;
			for (const chunk of currentBuffer) {
				combined.set(chunk, offset);
				offset += chunk.length;
			}

			console.log(`[ExportJob] Uploading part ${partNumber}, size: ${currentBufferSize} bytes`);
			const part = await multipartUpload.uploadPart(partNumber, combined);
			uploadedParts.push({ partNumber, etag: part.etag });
			totalBytesUploaded += currentBufferSize;
			partNumber++;
			currentBuffer = [];
			currentBufferSize = 0;
		};

		// Create ZIP stream
		const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
		const zipStreamer = new ZipStreamer(writable);

		// Create manifest
		const manifestEntries = processedFiles.map((file) => ({
			filename: file.filename,
			size: file.size_bytes,
			r2_key: file.r2_key,
			product: file.product,
			category: file.category,
		}));

		// Start the zip writing in background (runs concurrently with reading)
		const writePromise = (async () => {
			try {
				// Add README
				await zipStreamer.addTextFile("README.txt", createReadme());
				await zipStreamer.addTextFile("manifest.json", createManifest(manifestEntries));

				// Stream files into ZIP
				console.log("[ExportJob] Streaming", processedFiles.length, "files into ZIP");
				for (const file of processedFiles) {
					const object = await this.env.R2_BUCKET.get(file.r2_key);
					if (!object?.body) {
						console.warn(`Skipping file ${file.r2_key} - not found during finalization`);
						continue;
					}

					await zipStreamer.addFile({
						filename: `${file.product}/${file.category}/${file.filename}`,
						data: object.body,
						size: file.size_bytes,
						mtime: new Date(),
					});
				}

				// Close ZIP stream
				await zipStreamer.close();
				console.log("[ExportJob] ZIP stream closed");
			} catch (err) {
				console.error("[ExportJob] Error writing to ZIP:", err);
				throw err;
			}
		})();

		// Read from stream and upload parts (runs concurrently with writing)
		const readPromise = (async () => {
			const reader = readable.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					currentBuffer.push(value);
					currentBufferSize += value.length;
					if (currentBufferSize >= MIN_PART_SIZE) {
						await uploadPart(false);
					}
				}
				// Upload final part
				await uploadPart(true);
				console.log("[ExportJob] Finished reading stream");
			} finally {
				reader.releaseLock();
			}
		})();

		// Wait for both to complete
		await Promise.all([writePromise, readPromise]);

		console.log(
			`[ExportJob] Uploaded ${uploadedParts.length} parts, completing multipart upload...`,
		);

		// Complete multipart upload
		await multipartUpload.complete(uploadedParts);

		// Update D1 to mark as completed
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
		await this.env.DB.prepare(
			`UPDATE storage_exports
       SET status = 'completed', r2_key = ?, expires_at = ?, size_bytes = ?, file_count = ?
       WHERE id = ?`,
		)
			.bind(job.r2_key, expiresAt, totalBytesUploaded, processedFiles.length, job.id)
			.run();

		// Update DO status
		this.updateJobStatus("completed");

		console.info(
			`Export ${job.id} completed: ${processedFiles.length} files, ${totalBytesUploaded} bytes (ZIP)`,
		);
	}

	/**
	 * Build D1 query based on export type and filters
	 */
	private buildFileQuery(
		userId: string,
		exportType: string,
		filters: Record<string, string> | null,
	): [string, unknown[]] {
		const baseQuery = `
      SELECT id, r2_key, filename, size_bytes, mime_type, product, category, created_at
      FROM storage_files
      WHERE user_id = ? AND deleted_at IS NULL
    `;

		const params: unknown[] = [userId];

		let typeCondition = "";

		switch (exportType) {
			case "full":
				typeCondition = "";
				break;
			case "blog":
				typeCondition = " AND product = ?";
				params.push("blog");
				break;
			case "ivy":
				typeCondition = " AND product = ?";
				params.push("ivy");
				break;
			case "category":
				if (filters?.category) {
					typeCondition = " AND category = ?";
					params.push(filters.category);
				}
				break;
		}

		return [baseQuery + typeCondition + " ORDER BY created_at DESC", params];
	}
}
