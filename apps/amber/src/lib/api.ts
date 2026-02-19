/**
 * Amber API Client
 * Frontend API wrapper for storage operations
 */

import type { StorageFile, QuotaStatus, UsageBreakdown, StorageExport } from "$types";
import { browser } from "$app/environment";

// Worker API endpoint
const WORKER_API_BASE = "https://amber-api.grove.place/api/storage";

// Use mock data in development, real API in production
// Set to true to force mock data for testing
const USE_MOCK_DATA = browser && import.meta.env.DEV;

interface ApiResponse<T> {
	data?: T;
	error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
	try {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...(options?.headers as Record<string, string>),
		};

		const response = await fetch(`${WORKER_API_BASE}${path}`, {
			...options,
			headers,
			credentials: "include", // Required for cross-origin cookies
		});

		const data = await response.json();

		if (!response.ok) {
			return { error: (data as { error?: string }).error || "Request failed" };
		}

		return { data: data as T };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Network error" };
	}
}

// ============== Mock Data ==============

const MOCK_FILES: StorageFile[] = [
	{
		id: "1",
		user_id: "user1",
		r2_key: "user1/blog/images/sunset.jpg",
		filename: "sunset.jpg",
		mime_type: "image/jpeg",
		size_bytes: 2456789,
		product: "blog",
		category: "images",
		created_at: "2024-12-10T10:30:00Z",
		updated_at: "2024-12-10T10:30:00Z",
	},
	{
		id: "2",
		user_id: "user1",
		r2_key: "user1/ivy/attachments/document.pdf",
		filename: "quarterly-report.pdf",
		mime_type: "application/pdf",
		size_bytes: 1234567,
		product: "ivy",
		category: "attachments",
		created_at: "2024-12-09T14:20:00Z",
		updated_at: "2024-12-09T14:20:00Z",
	},
	{
		id: "3",
		user_id: "user1",
		r2_key: "user1/profile/avatar/profile.png",
		filename: "profile.png",
		mime_type: "image/png",
		size_bytes: 456789,
		product: "profile",
		category: "avatar",
		created_at: "2024-12-08T09:15:00Z",
		updated_at: "2024-12-08T09:15:00Z",
	},
	{
		id: "4",
		user_id: "user1",
		r2_key: "user1/blog/images/hero-banner.png",
		filename: "hero-banner.png",
		mime_type: "image/png",
		size_bytes: 3456789,
		product: "blog",
		category: "images",
		created_at: "2024-12-07T16:45:00Z",
		updated_at: "2024-12-07T16:45:00Z",
	},
	{
		id: "5",
		user_id: "user1",
		r2_key: "user1/themes/assets/custom-font.woff2",
		filename: "custom-font.woff2",
		mime_type: "font/woff2",
		size_bytes: 89012,
		product: "themes",
		category: "assets",
		created_at: "2024-12-05T11:00:00Z",
		updated_at: "2024-12-05T11:00:00Z",
	},
];

const MOCK_TRASH: StorageFile[] = [
	{
		id: "99",
		user_id: "user1",
		r2_key: "user1/blog/images/old-photo.jpg",
		filename: "old-photo.jpg",
		mime_type: "image/jpeg",
		size_bytes: 1567890,
		product: "blog",
		category: "images",
		created_at: "2024-11-20T08:00:00Z",
		updated_at: "2024-12-01T12:00:00Z",
		deleted_at: "2024-12-14T09:30:00Z",
	},
];

const MOCK_QUOTA: QuotaStatus = {
	used_bytes: 7693946,
	total_bytes: 1073741824,
	total_gb: 1,
	available_bytes: 1066047878,
	percentage: 0.72,
	warning_level: "none",
};

const MOCK_BREAKDOWN: UsageBreakdown[] = [
	{ product: "blog", category: "images", bytes: 5913578, file_count: 2 },
	{ product: "ivy", category: "attachments", bytes: 1234567, file_count: 1 },
	{ product: "profile", category: "avatar", bytes: 456789, file_count: 1 },
	{ product: "themes", category: "assets", bytes: 89012, file_count: 1 },
];

// ============== Storage Info ==============

export interface StorageInfoResponse {
	quota: QuotaStatus;
	breakdown: UsageBreakdown[];
}

export async function getStorageInfo(): Promise<ApiResponse<StorageInfoResponse>> {
	if (USE_MOCK_DATA) {
		return { data: { quota: MOCK_QUOTA, breakdown: MOCK_BREAKDOWN } };
	}
	return request<StorageInfoResponse>("");
}

// ============== Files ==============

export interface FilesResponse {
	files: StorageFile[];
	total: number;
	limit: number;
	offset: number;
}

export interface FilesOptions {
	product?: string;
	category?: string;
	search?: string;
	sort?: "created_at" | "size_bytes" | "filename";
	order?: "asc" | "desc";
	limit?: number;
	offset?: number;
}

export async function getFiles(options: FilesOptions = {}): Promise<ApiResponse<FilesResponse>> {
	if (USE_MOCK_DATA) {
		let files = [...MOCK_FILES];
		if (options.product) {
			files = files.filter((f) => f.product === options.product);
		}
		if (options.search) {
			const search = options.search.toLowerCase();
			files = files.filter((f) => f.filename.toLowerCase().includes(search));
		}
		return { data: { files, total: files.length, limit: 50, offset: 0 } };
	}
	const params = new URLSearchParams();
	if (options.product) params.set("product", options.product);
	if (options.category) params.set("category", options.category);
	if (options.search) params.set("search", options.search);
	if (options.sort) params.set("sort", options.sort);
	if (options.order) params.set("order", options.order);
	if (options.limit) params.set("limit", options.limit.toString());
	if (options.offset) params.set("offset", options.offset.toString());

	const query = params.toString();
	return request<FilesResponse>(`/files${query ? `?${query}` : ""}`);
}

export async function getFile(id: string): Promise<ApiResponse<StorageFile>> {
	return request<StorageFile>(`/files/${id}`);
}

export async function deleteFile(
	id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
	return request(`/files/${id}`, { method: "DELETE" });
}

export async function restoreFile(
	id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
	return request(`/files/${id}/restore`, { method: "POST" });
}

// ============== Trash ==============

export interface TrashResponse {
	files: StorageFile[];
	total_size: number;
}

export async function getTrash(): Promise<ApiResponse<TrashResponse>> {
	if (USE_MOCK_DATA) {
		const total_size = MOCK_TRASH.reduce((sum, f) => sum + f.size_bytes, 0);
		return { data: { files: MOCK_TRASH, total_size } };
	}
	return request<TrashResponse>("/trash");
}

export async function emptyTrash(): Promise<
	ApiResponse<{ success: boolean; deleted_count: number; freed_bytes: number }>
> {
	return request("/trash", { method: "DELETE" });
}

export async function permanentlyDeleteFile(
	id: string,
): Promise<ApiResponse<{ success: boolean; freed_bytes: number }>> {
	return request(`/trash/${id}`, { method: "DELETE" });
}

// ============== Exports ==============

export interface CreateExportRequest {
	type: "full" | "blog" | "ivy" | "category";
	filters?: Record<string, string>;
}

export interface ExportResponse {
	export_id: string;
	status: string;
	message?: string;
}

export async function createExport(req: CreateExportRequest): Promise<ApiResponse<ExportResponse>> {
	return request<ExportResponse>("/export", {
		method: "POST",
		body: JSON.stringify(req),
	});
}

export async function getExport(id: string): Promise<ApiResponse<StorageExport>> {
	return request<StorageExport>(`/export/${id}`);
}

export async function getExportDownload(
	id: string,
): Promise<ApiResponse<{ download_url: string; expires_at: string }>> {
	return request(`/export/${id}/download`);
}

// ============== Add-ons ==============

export interface AddonsResponse {
	available: Array<{
		type: string;
		gb: number;
		price_cents: number;
		price_display: string;
	}>;
	purchased: Array<{
		id: string;
		addon_type: string;
		gb_amount: number;
		active: boolean;
		created_at: string;
	}>;
}

export async function getAddons(): Promise<ApiResponse<AddonsResponse>> {
	return request<AddonsResponse>("/addons");
}

export async function purchaseAddon(
	addonType: string,
): Promise<ApiResponse<{ message: string; redirect_url: string }>> {
	return request("/addons", {
		method: "POST",
		body: JSON.stringify({ addon_type: addonType }),
	});
}

export async function cancelAddon(
	id: string,
): Promise<ApiResponse<{ success: boolean; message: string }>> {
	return request(`/addons/${id}`, { method: "DELETE" });
}

// ============== Download ==============

export function getDownloadUrl(r2Key: string): string {
	return `${WORKER_API_BASE}/download/${encodeURIComponent(r2Key)}`;
}
