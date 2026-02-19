# Amber Worker Services

This directory contains the export services that handle background processing of large file exports to ZIP archives. The services leverage Cloudflare Durable Objects for reliable, long-running operations that exceed typical request timeout limits.

## ExportJob (Durable Object)

The ExportJob is a Durable Object that orchestrates the asynchronous processing of file exports. It breaks large exports into manageable chunks, handles streaming to cloud storage, and manages the complete lifecycle of an export operation.

### Architecture

The ExportJob uses an alarm-based, chunk-processing architecture to handle exports that may contain hundreds of files and gigabytes of data:

- **Chunk-Based Processing**: Files are processed in batches limited to 100 files or 50MB per iteration, preventing memory exhaustion and request timeout issues
- **Alarm-Driven Workflow**: Each chunk completion schedules the next alarm (with 2-second delays) to process the subsequent batch, enabling exports to span minutes without timeout
- **Streaming Pipeline**: Files are streamed from R2 directly into ZIP compression without buffering entire files in memory
- **Parallel Batch Fetching**: File metadata is verified in parallel batches of 10 from R2 for efficiency

### Usage Example

```typescript
// Start an export job from your API handler
const exportId = crypto.randomUUID();
const exportJobId = this.env.EXPORT_JOB.idFromName(exportId);
const exportJob = this.env.EXPORT_JOB.get(exportJobId);

// Initiate background processing
await exportJob.startExport(exportId);

// Return immediately to user
return new Response(
	JSON.stringify({
		exportId,
		status: "processing",
	}),
	{ status: 202 },
);
```

The user receives an immediate response while processing happens asynchronously in the background.

### Background Processing Flow

1. **startExport()**: Fetches export metadata from D1 (user_id, export_type, filter_params), initializes state, and schedules the first alarm
2. **alarm()**: Triggered on schedule, processes the next chunk by:
   - Querying D1 for the next batch of files (with LIMIT and OFFSET)
   - Verifying files exist in R2 using `head()` requests
   - Accumulating file metadata and total size
   - Scheduling the next alarm if more chunks exist
3. **finalizeExport()**: Once all chunks are processed:
   - Creates a ZIP streaming pipeline with TransformStream
   - Adds manifest.json and README.txt metadata files
   - Streams all verified files from R2 into the ZIP archive
   - Uploads the complete ZIP to R2 while streaming
   - Updates D1 with the R2 key and completion timestamp
4. **handleFailure()**: On any error, logs the failure and updates D1 status to 'failed' with error details

### Error Handling

The service implements graceful error handling at multiple levels:

- **File Verification**: Missing files in R2 are tracked in `missingFiles` array and logged without stopping the export
- **Batch Operations**: Individual file fetch failures don't halt processing; they're logged as warnings
- **Streaming Errors**: Zip finalization catches errors during streaming, closes the stream gracefully, and propagates the error
- **State Cleanup**: Failed exports clean up their storage state after logging the error
- **Partial Success**: If some files fail, the export completes with the available files rather than the entire operation failing

### Configuration Constants

Located in `zipStream.ts`:

```typescript
export const ZIP_CONFIG = {
	COMPRESSION_LEVEL: 6, // Standard gzip compression
	CHUNK_SIZE_BYTES: 50 * 1024 * 1024, // 50MB max per chunk
	CHUNK_FILE_LIMIT: 100, // 100 files max per chunk
} as const;
```

These values balance memory usage, R2 API rate limits, and processing speed.

### State Management

Export state persists in Durable Object storage as a JSON object:

```typescript
interface ExportState {
  exportId: string;                    // Unique export identifier
  userId: string;                      // Owner of the export
  exportType: 'full' | 'blog' | 'ivy' | 'category';  // Export scope
  filterParams: Record<string, string> | null;       // Type-specific filters
  currentOffset: number;               // DB query offset for pagination
  processedFiles: Array<{...}>;        // Verified files with metadata
  totalSize: number;                   // Cumulative bytes
  missingFiles: string[];              // Files that failed R2 checks
  r2Key: string;                       // Final R2 path for the ZIP
  createdAt: string;                   // ISO timestamp
}
```

### Monitoring

Export progress can be monitored by:

1. **D1 Status Column**: Query `storage_exports.status` for 'processing', 'completed', or 'failed'
2. **Logs**: Console output logs each chunk processed and the final completion with file count and size
3. **R2 Metadata**: Completed ZIPs include custom metadata with export-id, user-id, file-count, and total-size

## zipStream Utilities

The `zipStream.ts` module provides low-level utilities for efficient ZIP archive creation with streaming support.

### ZipStreamer Usage Example

```typescript
// Create a readable/writable pair for streaming
const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
const zipStreamer = new ZipStreamer(writable);

// Add text files (manifest, README, etc)
await zipStreamer.addTextFile("manifest.json", manifestContent);
await zipStreamer.addTextFile("README.txt", readmeContent);

// Add binary files from streams
await zipStreamer.addFile({
	filename: "documents/file.pdf",
	data: pdfStream, // ReadableStream<Uint8Array>
	size: fileSizeBytes, // Must declare expected size
	mtime: new Date(),
});

// Finalize and upload
await zipStreamer.close();
const response = await r2Bucket.put("exports/archive.zip", readable);
```

### Helper Functions

- **createManifest(entries)**: Generates a structured manifest.json with version, creation timestamp, file list, and summary statistics
- **createReadme()**: Generates a user-friendly README.txt with extraction instructions and archive metadata

## Future Enhancements

Potential improvements for future releases:

### Email Notifications

- Notify users when exports complete or fail
- Include download links in completion emails
- Add unread notification counts to user dashboard

### Multi-Part ZIP Support

- Split large archives (>1GB) into multiple ZIP files
- Create index file linking parts together
- Improve browser compatibility for very large exports

### Export Cancellation

- Add cancel endpoint to stop in-progress exports
- Clean up R2 objects for cancelled exports
- Track cancellation reason in D1

### Progress Streaming

- Expose real-time progress via WebSocket or Server-Sent Events
- Stream progress as percentage or file count increments
- Allow clients to estimate completion time based on current rate
