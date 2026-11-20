/**
 * Image Upload Endpoint
 *
 * Thin routing layer — delegates to upload-pipeline.ts.
 * POST /api/images/upload
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold/factory";
import { thresholdCheckWithResult } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
import { validateEnv } from "@autumnsgrove/lattice/server/env-validation";
import { canUploadImages } from "@autumnsgrove/lattice/server/upload-gate";
import {
	API_ERRORS,
	buildErrorJson,
	logGroveError,
	throwGroveError,
} from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	ImageUploadMetadataSchema,
	validateFile,
	validateImageDimensions,
	runPetalScan,
	checkDuplicate,
	uploadAndStore,
} from "./upload-pipeline";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Upload Gate
	const flagsEnv = platform?.env?.CACHE_KV
		? { DB: platform.env.DB!, FLAGS_KV: platform.env.CACHE_KV }
		: null;

	if (!flagsEnv) {
		return json(buildErrorJson(API_ERRORS.FEATURE_DISABLED), { status: 403 });
	}

	const uploadGate = await canUploadImages(locals.tenantId, locals.user.id, flagsEnv);
	if (!uploadGate.allowed) {
		return json(buildErrorJson(API_ERRORS.FEATURE_DISABLED), { status: 403 });
	}

	// Validate environment
	const envValidation = validateEnv(platform?.env, ["DB", "IMAGES", "CACHE_KV"]);
	if (!envValidation.valid) {
		console.error(`[Image Upload] ${envValidation.message}`);
		throwGroveError(503, API_ERRORS.UPLOAD_SERVICE_UNAVAILABLE, "API");
	}

	const db = platform!.env!.DB;
	const images = platform!.env!.IMAGES;
	const kv = platform!.env!.CACHE_KV;
	const threshold = createThreshold(platform?.env, { identifier: locals.user?.id });

	// Two-layer rate limiting: burst + hourly.
	// Burst (20/5min) catches scripted rapid-fire uploads.
	// Hourly (200/hr) catches sustained volume abuse.
	// A normal user uploading photos for a blog post never approaches either limit.
	if (threshold) {
		const burstCheck = await thresholdCheckWithResult(threshold, {
			key: `upload/burst:${locals.user.id}`,
			limit: 20,
			windowSeconds: 300,
		});
		if (burstCheck.response) {
			const retryAfter = burstCheck.result.retryAfter ?? 300;
			const retrySecs = Math.ceil(retryAfter);
			const retryText =
				retrySecs < 60
					? `${retrySecs} second${retrySecs !== 1 ? "s" : ""}`
					: `${Math.ceil(retrySecs / 60)} minute${Math.ceil(retrySecs / 60) !== 1 ? "s" : ""}`;
			return json(
				{
					error: "rate_limited",
					message: `You're uploading too fast — try again in ${retryText}.`,
					retryAfter,
				},
				{ status: 429 },
			);
		}

		const hourlyCheck = await thresholdCheckWithResult(threshold, {
			key: `upload/image:${locals.user.id}`,
			limit: 200,
			windowSeconds: 3600,
		});
		if (hourlyCheck.response) {
			const retryAfter = hourlyCheck.result.retryAfter ?? 3600;
			const retryMins = Math.ceil(retryAfter / 60);
			return json(
				{
					error: "rate_limited",
					message: `Upload limit reached — try again in ${retryMins} minute${retryMins !== 1 ? "s" : ""}.`,
					retryAfter,
				},
				{ status: 429 },
			);
		}
	}

	// Pre-scan restriction gate — truly read-only KV lookup, no counter increment.
	// threshold.check() always increments, so we use a separate KV flag that gets
	// written only when the Petal rejection counter actually exceeds its limit.
	// This short-circuits before file parsing, DB queries, and Petal API calls.
	const uploadRestricted = kv
		? await kv.get(`upload/restricted:${locals.user.id}`).catch(() => null)
		: null;
	if (uploadRestricted !== null) {
		return json(buildErrorJson(API_ERRORS.UPLOAD_RESTRICTED), { status: 429 });
	}

	try {
		const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user);
		const formData = await request.formData();
		const file = formData.get("file");
		const metaParsed = parseFormData(formData, ImageUploadMetadataSchema);
		const meta = metaParsed.success
			? metaParsed.data
			: {
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
				};

		if (!file || !(file instanceof File)) {
			throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API", { detail: "file required" });
		}

		// Read file once for both validation and upload
		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		// Validate file type, extension, size, signature
		validateFile(file, buffer);

		// Validate image dimensions
		await validateImageDimensions(file, buffer);

		// Storage quota check via TenantDO.
		// The DO tracks both committed bytes (from D1) and in-flight reservations for
		// uploads that have been approved but not yet written. Its single-writer
		// guarantee means concurrent uploads see each other's reservations — closing
		// the TOCTOU race that exists with direct D1 reads from parallel workers.
		// Fails open: if the DO is unavailable, the upload proceeds rather than blocking.
		let storageReservationId: string | null = null;
		let tenantStub: DurableObjectStub | null = null;
		if (platform?.env?.TENANTS && locals.context?.type === "tenant") {
			try {
				const doId = platform.env.TENANTS.idFromName(`tenant:${locals.context.tenant.subdomain}`);
				tenantStub = platform.env.TENANTS.get(doId);
				const storageRes = await tenantStub.fetch("https://tenant.internal/storage/check", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Tenant-Subdomain": locals.context.tenant.subdomain,
					},
					body: JSON.stringify({ bytes: file.size }),
				});

				if (storageRes.ok) {
					const { allowed, usedBytes, storageDisplay, reservationId } =
						(await storageRes.json()) as {
							allowed: boolean;
							usedBytes: number;
							storageDisplay: string;
							reservationId?: string;
						};
					if (!allowed) {
						const usedMB = Math.round(usedBytes / (1024 * 1024));
						return json(
							{
								error: "storage_limit_exceeded",
								message: `You've used ${usedMB} MB of your ${storageDisplay} storage limit. Delete some images or upgrade to upload more.`,
							},
							{ status: 413 },
						);
					}
					storageReservationId = reservationId ?? null;
				}
			} catch {
				// Non-critical — fail open if TenantDO is unavailable
			}
		}

		// Petal Content Moderation
		const hasPetalProvider = platform?.env?.AI || platform?.env?.OPENROUTER_API_KEY;
		if (hasPetalProvider) {
			const petalResult = await runPetalScan(
				buffer,
				file,
				locals.user.id,
				tenantId,
				meta.hash ?? null,
				meta.context || "general",
				{
					AI: platform!.env!.AI,
					DB: db,
					CACHE_KV: kv,
					OPENROUTER_API_KEY: platform!.env!.OPENROUTER_API_KEY as string | undefined,
				},
			);

			if (!petalResult.allowed) {
				// Infrastructure/temporary errors use UPLOAD_SERVICE_UNAVAILABLE
				const isInfraError = ["SCAN_ERROR", "CSAM_SCAN_FAILED"].includes(
					petalResult.response?.code || "",
				);
				const apiError = isInfraError
					? API_ERRORS.UPLOAD_SERVICE_UNAVAILABLE
					: API_ERRORS.INVALID_FILE;

				// Count this rejection. After 15 Petal rejections in an hour, restrict uploads.
				// Limit is set high enough to survive Petal false positives on legitimate content.
				// (Skip counting for infrastructure errors to avoid false positives)
				if (threshold && !isInfraError) {
					try {
						const rejectedResult = await threshold.check({
							key: `upload/rejected:${locals.user.id}`,
							limit: 15,
							windowSeconds: 3600,
						});
						if (!rejectedResult.allowed) {
							// Write a KV flag so future uploads are short-circuited at the
							// pre-scan gate without incrementing the counter further or burning
							// Petal quota. TTL matches the rejection counter window.
							await kv
								.put(`upload/restricted:${locals.user.id}`, "1", { expirationTtl: 3600 })
								.catch(() => {});
							return json(buildErrorJson(API_ERRORS.UPLOAD_RESTRICTED), { status: 429 });
						}
					} catch {
						// Non-critical — don't block on counter failure
					}
				}

				return json(
					{
						...buildErrorJson(apiError),
						error_description: petalResult.response?.message,
						processingTimeMs: petalResult.response?.processingTimeMs,
					},
					{ status: isInfraError ? 503 : 400 },
				);
			}
		}

		// Check for duplicates
		const hash = meta.hash ?? null;
		if (hash) {
			const existing = await checkDuplicate(db, hash, tenantId);
			if (existing) {
				return json({
					success: true,
					duplicate: true,
					url: existing.url,
					key: existing.key,
					message: "Duplicate image detected - using existing upload",
				});
			}
		}

		// Upload and store
		const thumbnail = formData.get("thumbnail") as File | null;
		const cdnBaseUrl = (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";

		const result = await uploadAndStore({
			file,
			arrayBuffer,
			tenantId,
			images,
			db,
			customFilename: meta.filename ?? null,
			altText: meta.altText || "",
			description: meta.description || "",
			hash,
			imageFormat: meta.imageFormat ?? null,
			originalSizeBytes: meta.originalSize ? parseInt(meta.originalSize, 10) : null,
			storedSizeBytes: meta.storedSize ? parseInt(meta.storedSize, 10) : null,
			thumbnail,
			dominantColor: meta.dominantColor ?? null,
			parsedWidth: meta.imageWidth ? parseInt(meta.imageWidth, 10) : null,
			parsedHeight: meta.imageHeight ? parseInt(meta.imageHeight, 10) : null,
			cdnBaseUrl,
		});

		// Release the storage reservation now that the upload has committed to D1.
		// Fire-and-forget: don't let a DO failure block the success response.
		if (storageReservationId && tenantStub) {
			tenantStub
				.fetch("https://tenant.internal/storage/release", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ reservationId: storageReservationId }),
				})
				.catch(() => {});
		}

		return json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
		throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
	}
};
