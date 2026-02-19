// Amber Type Definitions
// TODO: Define types as implementation progresses

export interface UserStorage {
	user_id: string;
	tier_gb: number;
	additional_gb: number;
	used_bytes: number;
	updated_at: string;
}

export interface StorageFile {
	id: string;
	user_id: string;
	r2_key: string;
	filename: string;
	mime_type: string;
	size_bytes: number;
	product: "blog" | "ivy" | "profile" | "themes";
	category: string;
	parent_id?: string;
	metadata?: Record<string, unknown>;
	created_at: string;
	updated_at?: string;
	deleted_at?: string;
}

export interface StorageAddon {
	id: string;
	user_id: string;
	addon_type: "storage_10gb" | "storage_50gb" | "storage_100gb";
	gb_amount: number;
	stripe_subscription_item_id?: string;
	active: boolean;
	created_at: string;
	cancelled_at?: string;
}

export interface StorageExport {
	id: string;
	user_id: string;
	status: "pending" | "processing" | "completed" | "failed";
	export_type: "full" | "blog" | "ivy" | "category";
	filter_params?: Record<string, unknown>;
	r2_key?: string;
	size_bytes?: number;
	file_count?: number;
	created_at: string;
	completed_at?: string;
	expires_at?: string;
	error_message?: string;
}

export interface UsageBreakdown {
	product: string;
	category: string;
	bytes: number;
	file_count: number;
}

export interface QuotaStatus {
	tier_gb?: number;
	additional_gb?: number;
	total_gb: number;
	total_bytes?: number;
	used_bytes: number;
	used_gb?: number;
	available_bytes: number;
	percentage: number;
	warning_level: "none" | "warning" | "critical" | "full";
}
