/**
 * ExportJob Durable Object (Loom SDK)
 *
 * Handles background processing of file exports to ZIP archives.
 * Uses SQLite storage for persistent state and alarm-based chunk processing.
 *
 * Architecture:
 * - Extends LoomDO for declarative routing, structured logging, alarm scheduling
 * - SQLite tables store job state, processed files, and missing files
 * - Alarm API drives batch processing loop
 * - State survives DO hibernation and restarts
 */

import { LoomDO } from "@autumnsgrove/lattice/loom";
import type { LoomRoute, LoomRequestContext } from "@autumnsgrove/lattice/loom";
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
 * Export job row stored in DO SQLite
 */
interface ExportJobRow {
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
}

/**
 * ExportJob Durable Object with Loom SDK
 */
export class ExportJobV2 extends LoomDO<null, Env> {
	config() {
		return { name: "ExportJobV2", blockOnInit: true };
	}

	schema() {
		return `
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

			CREATE TABLE IF NOT EXISTS export_missing (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				r2_key TEXT NOT NULL,
				created_at TEXT DEFAULT (datetime('now'))
			);

			CREATE INDEX IF NOT EXISTS idx_export_files_r2_key ON export_files(r2_key);
		`;
	}

	routes(): LoomRoute[] {
		return [
			{ method: "POST", path: "/start/:exportId", handler: (ctx) => this.handleStart(ctx) },
			{ method: "GET", path: "/status", handler: () => this.handleGetStatus() },
			{ method: "POST", path: "/reset", handler: () => this.handleReset() },
			{
				method: "POST",
				path: "/process-sync/:exportId",
				handler: (ctx) => this.handleProcessSync(ctx),
			},
		];
	}

	protected async onAlarm(): Promise<void> {
		const job = this.getJob();
		if (!job) {
			this.log.error("Alarm fired but no job found");
			return;
		}

		if (job.status !== "running") {
			this.log.info(`Job status is ${job.status}, skipping alarm`);
			return;
		}

		this.log.info("Alarm processing chunk", { exportId: job.id, offset: job.current_offset });

		try {
			const hasMoreChunks = await this.processChunk(job);
			this.log.info("Chunk processed", {
				hasMore: hasMoreChunks,
				files: this.getProcessedFileCount(),
			});

			if (hasMoreChunks) {
				// Schedule next chunk processing (2 second delay between chunks)
				await this.alarms.schedule(2000);
			} else {
				this.log.info("No more chunks, finalizing export");
				await this.finalizeExport(job);
				this.log.info("Export finalized successfully");
			}
		} catch (error) {
			this.log.error("Alarm processing error", { error: String(error) });
			this.updateJobStatus("failed", String(error));
			await this.updateD1Status(job.id, "failed", String(error));
		}
	}

	// ============================================================================
	// Route handlers
	// ============================================================================

	/**
	 * Start a new export job
	 */
	private async handleStart(ctx: LoomRequestContext): Promise<Response> {
		const exportId = ctx.params.exportId;

		// Check if job already exists
		const existing = this.getJob();
		if (existing) {
			return Response.json({ error: "Job already exists", job_id: existing.id }, { status: 409 });
		}

		// Fetch export from D1 to get metadata
		const result = await this.env.DB.prepare(
			"SELECT id, user_id, export_type, filter_params FROM storage_exports WHERE id = ?",
		)
			.bind(exportId)
			.first<{ id: string; user_id: string; export_type: string; filter_params: string | null }>();

		if (!result) {
			return Response.json({ error: `Export ${exportId} not found` }, { status: 404 });
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
		await this.alarms.schedule(0);

		this.log.info("Job started", { exportId });

		return Response.json({ job_id: exportId, status: "running" }, { status: 201 });
	}

	/**
	 * Get current job status
	 */
	private handleGetStatus(): Response {
		const job = this.getJob();
		if (!job) {
			return Response.json({ error: "No job found" }, { status: 404 });
		}

		return Response.json({
			job_id: job.id,
			status: job.status,
			current_offset: job.current_offset,
			total_size: job.total_size,
			file_count: this.getProcessedFileCount(),
			missing_files: this.getMissingFileCount(),
			r2_key: job.r2_key,
			error: job.error,
			created_at: job.created_at,
			updated_at: job.updated_at,
		});
	}

	/**
	 * Reset DO state (clear all tables)
	 */
	private handleReset(): Response {
		this.sql.exec("DELETE FROM export_job");
		this.sql.exec("DELETE FROM export_files");
		this.sql.exec("DELETE FROM export_missing");

		this.log.info("DO state cleared via reset");

		return Response.json({ success: true, message: "DO state cleared" });
	}

	/**
	 * Process export synchronously (fallback for cron-based processing)
	 */
	private async handleProcessSync(ctx: LoomRequestContext): Promise<Response> {
		let job = this.getJob();

		if (!job) {
			// Initialize the job first
			const startResponse = await this.handleStart(ctx);
			if (startResponse.status !== 201) {
				return startResponse;
			}
			job = this.getJob();
		}

		if (!job) {
			return Response.json({ error: "Failed to create job" }, { status: 500 });
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
				this.log.info("Sync chunk processed", {
					hasMore: hasMoreChunks,
					files: this.getProcessedFileCount(),
				});
			}

			// Finalize
			await this.finalizeExport(job);

			return Response.json({ success: true, message: "Export processed" });
		} catch (error) {
			this.log.error("Sync processing error", { error: String(error) });
			this.updateJobStatus("failed", String(error));
			await this.updateD1Status(job.id, "failed", String(error));

			return Response.json({ success: false, error: String(error) }, { status: 500 });
		}
	}

	// ============================================================================
	// Helper methods
	// ============================================================================

	/**
	 * Get job from SQLite
	 */
	private getJob(): (ExportJobRow & { status: ExportStatus }) | null {
		const row = this.sql.queryOne<ExportJobRow>("SELECT * FROM export_job LIMIT 1");
		if (!row) return null;
		return { ...row, status: row.status as ExportStatus };
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
	 * Get count of processed files
	 */
	private getProcessedFileCount(): number {
		const result = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM export_files",
		);
		return result?.count ?? 0;
	}

	/**
	 * Get count of missing files
	 */
	private getMissingFileCount(): number {
		const result = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM export_missing",
		);
		return result?.count ?? 0;
	}

	/**
	 * Get all processed files
	 */
	private getProcessedFiles(): ProcessedFile[] {
		const rows = this.sql.queryAll<{
			file_id: string;
			r2_key: string;
			filename: string;
			size_bytes: number;
			product: string;
			category: string;
		}>("SELECT file_id, r2_key, filename, size_bytes, product, category FROM export_files");

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
		const [baseQuery, params] = this.buildFileQuery(job.user_id, job.export_type, filters);

		// Fetch batch of files from D1
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
					this.log.warn("Failed to check file", {
						r2Key: file.r2_key,
						error: String(error),
					});
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
			this.log.info("Files missing in R2", { exportId: job.id, missingCount });
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
		this.log.info("Finalizing export, creating ZIP", { fileCount: processedFiles.length });

		// Handle empty export
		if (processedFiles.length === 0) {
			this.log.info("No files to export, marking as completed with 0 files");
			const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
			await this.env.DB.prepare(
				`UPDATE storage_exports
				 SET status = 'completed', r2_key = NULL, expires_at = ?, size_bytes = 0, file_count = 0
				 WHERE id = ?`,
			)
				.bind(expiresAt, job.id)
				.run();
			this.updateJobStatus("completed");
			this.log.info("Export completed with 0 files (all missing in R2)", { exportId: job.id });
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

		this.log.info("Created multipart upload", { uploadId: multipartUpload.uploadId });

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

			this.log.info("Uploading part", { partNumber, size: currentBufferSize });
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
				this.log.info("Streaming files into ZIP", { count: processedFiles.length });
				for (const file of processedFiles) {
					const object = await this.env.R2_BUCKET.get(file.r2_key);
					if (!object?.body) {
						this.log.warn("Skipping file - not found during finalization", {
							r2Key: file.r2_key,
						});
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
				this.log.info("ZIP stream closed");
			} catch (err) {
				this.log.error("Error writing to ZIP", { error: String(err) });
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
				this.log.info("Finished reading stream");
			} finally {
				reader.releaseLock();
			}
		})();

		// Wait for both to complete
		await Promise.all([writePromise, readPromise]);

		this.log.info("Completing multipart upload", { parts: uploadedParts.length });

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

		this.log.info("Export completed", {
			exportId: job.id,
			fileCount: processedFiles.length,
			totalBytes: totalBytesUploaded,
		});
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
