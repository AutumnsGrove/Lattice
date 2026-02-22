/**
 * Database Configuration
 *
 * Registry of all Grove D1 databases that need to be backed up.
 */

import type { DatabaseConfig } from "../types";

export type { DatabaseConfig };

export const DATABASES: DatabaseConfig[] = [
	{
		name: "groveauth",
		id: "45eae4c7-8ae7-4078-9218-8e1677a4360f",
		binding: "GROVEAUTH_DB",
		description: "Authentication, users, sessions, OAuth",
		priority: "critical",
		estimatedSize: "212 KB",
		dailyBackup: true,
	},
	{
		name: "scout-db",
		id: "6a289378-c662-4c6a-9f1b-fa5296e03fa2",
		binding: "SCOUT_DB",
		description: "GroveScout searches, credits, referrals",
		priority: "critical",
		estimatedSize: "364 KB",
	},
	{
		name: "grove-engine-db",
		id: "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68",
		binding: "GROVE_ENGINE_DB",
		description: "Core engine, CDN files, signups",
		priority: "high",
		estimatedSize: "180 KB",
		dailyBackup: true,
	},
	{
		name: "grovemusic-db",
		id: "e1e31ed2-3b1f-4dbd-9435-c9105dadcfa2",
		binding: "GROVEMUSIC_DB",
		description: "GroveMusic data",
		priority: "normal",
		estimatedSize: "98 KB",
	},
	{
		name: "library-enhancer-db",
		id: "afd1ce4c-618a-430a-bf0f-0a57647a388d",
		binding: "LIBRARY_ENHANCER_DB",
		description: "Library enhancer data",
		priority: "normal",
		estimatedSize: "679 KB",
	},
	{
		name: "autumnsgrove-posts",
		id: "510badf3-457a-4892-bf2a-45d4bfd7a7bb",
		binding: "AUTUMNSGROVE_POSTS_DB",
		description: "Blog posts",
		priority: "high",
		estimatedSize: "118 KB",
	},
	{
		name: "autumnsgrove-git-stats",
		id: "0ca4036f-93f7-4c8a-98a5-5353263acd44",
		binding: "AUTUMNSGROVE_GIT_STATS_DB",
		description: "Git statistics",
		priority: "normal",
		estimatedSize: "335 KB",
	},
	{
		name: "grove-domain-jobs",
		id: "cd493112-a901-4f6d-aadf-a5ca78929557",
		binding: "GROVE_DOMAIN_JOBS_DB",
		description: "Domain search jobs",
		priority: "normal",
		estimatedSize: "45 KB",
	},
	{
		name: "your-site-posts",
		id: "86342742-7d34-486f-97f0-928136555e1a",
		binding: "YOUR_SITE_POSTS_DB",
		description: "Site posts",
		priority: "normal",
		estimatedSize: "12 KB",
	},
	{
		name: "amber",
		id: "f688021b-a986-495a-94bb-352354768a22",
		binding: "AMBER_DB",
		description: "Amber application data",
		priority: "normal",
		estimatedSize: "86 KB",
	},
	{
		name: "mycelium-oauth",
		id: "fc477b40-3691-4a01-85b8-bb4e00b17606",
		binding: "MYCELIUM_OAUTH_DB",
		description: "Mycelium OAuth system",
		priority: "high",
		estimatedSize: "28 KB",
	},
	{
		name: "ivy-db",
		id: "57738720-bc43-4a7f-ad5b-ceb86b3c0542",
		binding: "IVY_DB",
		description: "Ivy application data",
		priority: "normal",
		estimatedSize: "147 KB",
	},
	{
		name: "grove-curios-db",
		id: "b03756ad-30d7-427a-9a1b-ec2f6478fcbd",
		binding: "GROVE_CURIOS_DB",
		description: "Curio widgets: timeline, gallery, guestbook, polls, mood ring, shrines, etc.",
		priority: "high",
		estimatedSize: "~50 KB",
		dailyBackup: true,
	},
	{
		name: "grove-observability-db",
		id: "59e70f9e-8f9c-4021-96e5-1e130e753766",
		binding: "GROVE_OBSERVABILITY_DB",
		description: "Sentinel + Vista monitoring data",
		priority: "normal",
		estimatedSize: "~200 KB",
	},
];

// Helper to get databases for daily backup
export const DAILY_DATABASES = DATABASES.filter((db) => db.dailyBackup === true);

// Cron patterns
export const CRON_DAILY = "0 3 * * *";
export const CRON_WEEKLY = "0 4 * * SUN";

// Backup schedule and retention
export const BACKUP_CONFIG = {
	// Cron: Every Sunday at 3:00 AM UTC
	cronSchedule: "0 3 * * 0",

	// Keep 12 weeks of backups
	retentionWeeks: 12,

	// R2 bucket name
	bucketName: "grove-backups",

	// Max concurrent database exports
	concurrency: 3,

	// Timeout per database export (ms)
	exportTimeout: 30000,
};
