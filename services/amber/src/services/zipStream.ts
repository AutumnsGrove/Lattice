import { Zip, ZipDeflate, ZipPassThrough } from "fflate";

/**
 * ZIP streaming configuration constants
 */
export const ZIP_CONFIG = {
	COMPRESSION_LEVEL: 0, // Store only (no compression) - faster for CF Workers CPU limits
	CHUNK_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
	CHUNK_FILE_LIMIT: 100,
} as const;

/**
 * Entry representing a file to be added to the ZIP archive
 */
export interface ZipFileEntry {
	filename: string;
	data: ReadableStream<Uint8Array>;
	size: number;
	mtime?: Date;
}

/**
 * Entry representing metadata about a file in the manifest
 */
export interface ManifestEntry {
	filename: string;
	size: number;
	r2_key: string;
	product: string;
	category: string;
}

/**
 * Streams files into a ZIP archive with support for large files
 * Handles both binary streams and text content
 */
export class ZipStreamer {
	private zip: Zip;
	private outputStream: WritableStream<Uint8Array>;
	private writer: WritableStreamDefaultWriter<Uint8Array>;
	private fileCount: number = 0;
	// Buffer chunks since fflate callback is synchronous but writes are async
	private pendingChunks: Uint8Array[] = [];
	private writeError: Error | null = null;

	constructor(outputStream: WritableStream<Uint8Array>) {
		this.outputStream = outputStream;
		this.writer = outputStream.getWriter();

		// Initialize fflate Zip with callback to buffer chunks (sync callback)
		this.zip = new Zip((error, data, final) => {
			if (error) {
				this.writeError = new Error(`ZIP compression error: ${error.message}`);
				return;
			}
			if (data && data.length > 0) {
				// Copy the data since fflate reuses the buffer
				this.pendingChunks.push(new Uint8Array(data));
			}
		});
	}

	/**
	 * Flush all buffered chunks to the output stream
	 * Must be called periodically to prevent memory buildup
	 */
	async flushChunks(): Promise<void> {
		if (this.writeError) throw this.writeError;

		while (this.pendingChunks.length > 0) {
			const chunk = this.pendingChunks.shift()!;
			await this.writer.write(chunk);
		}
	}

	/**
	 * Add a file from a ReadableStream to the ZIP archive
	 * Uses synchronous ZipDeflate (CF Workers don't support Web Workers)
	 */
	async addFile(entry: ZipFileEntry): Promise<void> {
		if (this.fileCount >= ZIP_CONFIG.CHUNK_FILE_LIMIT) {
			throw new Error(`File limit exceeded: ${ZIP_CONFIG.CHUNK_FILE_LIMIT} files per ZIP`);
		}

		// Use synchronous ZipDeflate (AsyncZipDeflate requires Web Workers which CF doesn't have)
		const deflate = new ZipDeflate(entry.filename, {
			level: ZIP_CONFIG.COMPRESSION_LEVEL,
		});
		if (entry.mtime) deflate.mtime = entry.mtime;

		this.zip.add(deflate);

		const reader = entry.data.getReader();
		let totalSize = 0;

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				totalSize += value.length;
				if (totalSize > entry.size) {
					throw new Error(`Stream size exceeded declared size for ${entry.filename}`);
				}

				// Push data to the deflate stream (synchronous - buffers to pendingChunks)
				deflate.push(value, false);

				// Flush buffered chunks periodically to prevent memory buildup
				if (this.pendingChunks.length > 10) {
					await this.flushChunks();
				}
			}

			// Finalize the file entry
			deflate.push(new Uint8Array(), true);

			// Flush any remaining chunks
			await this.flushChunks();

			this.fileCount++;
		} finally {
			reader.releaseLock();
		}
	}

	/**
	 * Add a text file to the ZIP archive
	 * Useful for metadata files like manifest.json or README.txt
	 */
	async addTextFile(filename: string, content: string): Promise<void> {
		if (this.fileCount >= ZIP_CONFIG.CHUNK_FILE_LIMIT) {
			throw new Error(`File limit exceeded: ${ZIP_CONFIG.CHUNK_FILE_LIMIT} files per ZIP`);
		}

		const encoder = new TextEncoder();
		const data = encoder.encode(content);

		const passthrough = new ZipPassThrough(filename);
		passthrough.mtime = new Date();

		this.zip.add(passthrough);
		passthrough.push(data);
		passthrough.push(new Uint8Array());

		// Flush buffered chunks
		await this.flushChunks();

		this.fileCount++;
	}

	/**
	 * Finalize the ZIP archive and close the output stream
	 * Must be called after all files have been added
	 */
	async close(): Promise<void> {
		// End the ZIP archive (triggers final central directory)
		this.zip.end();

		// Flush any remaining chunks
		await this.flushChunks();

		// Check for errors
		if (this.writeError) throw this.writeError;

		await this.writer.close();
	}
}

/**
 * Generate manifest.json content from manifest entries
 * Returns a stringified JSON representation of the manifest
 */
export function createManifest(entries: ManifestEntry[]): string {
	const manifest = {
		version: "1.0",
		created: new Date().toISOString(),
		files: entries.map((entry) => ({
			filename: entry.filename,
			size: entry.size,
			r2_key: entry.r2_key,
			product: entry.product,
			category: entry.category,
		})),
		summary: {
			totalFiles: entries.length,
			totalSize: entries.reduce((sum, e) => sum + e.size, 0),
		},
	};

	return JSON.stringify(manifest, null, 2);
}

/**
 * Generate README.txt content with archive information
 * Provides user-friendly documentation about the ZIP contents
 */
export function createReadme(): string {
	return `Amber Export Archive
=====================

This archive contains exported data from the Amber system.

Contents:
- manifest.json: Complete file manifest with metadata
- Product data and associated files organized by category

Extraction:
Simply extract this archive using your preferred ZIP tool.

Created: ${new Date().toISOString()}

For more information, visit: https://amber.autumnsgrove.dev
`;
}
