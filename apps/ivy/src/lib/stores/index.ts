/**
 * Svelte Stores
 *
 * Reactive state management for the Ivy client.
 */

import { writable, derived } from "svelte/store";

// TODO: Define email types
export interface Email {
	id: string;
	threadId: string;
	from: string;
	to: string[];
	subject: string;
	snippet: string;
	date: Date;
	isRead: boolean;
	labels: string[];
}

export interface Thread {
	id: string;
	emails: Email[];
	subject: string;
	participants: string[];
	lastDate: Date;
	isRead: boolean;
	labels: string[];
}

// Mock data for UI development
const mockThreads: Thread[] = [
	{
		id: "1",
		emails: [],
		subject: "Welcome to Grove",
		participants: ["Grove Team", "you"],
		lastDate: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
		isRead: false,
		labels: ["inbox"],
	},
	{
		id: "2",
		emails: [],
		subject: "Your account has been created",
		participants: ["noreply@grove.place"],
		lastDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
		isRead: false,
		labels: ["inbox"],
	},
	{
		id: "3",
		emails: [],
		subject: "Re: Project proposal for Q1",
		participants: ["Alex Chen", "you", "Jordan Miller"],
		lastDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
		isRead: true,
		labels: ["inbox"],
	},
	{
		id: "4",
		emails: [],
		subject: "Meeting notes from last week",
		participants: ["Sarah Johnson"],
		lastDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
		isRead: true,
		labels: ["inbox"],
	},
	{
		id: "5",
		emails: [],
		subject: "Invoice #1234 - December 2024",
		participants: ["Billing"],
		lastDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
		isRead: true,
		labels: ["inbox"],
	},
	{
		id: "6",
		emails: [],
		subject: "Your weekly digest",
		participants: ["Grove Weekly"],
		lastDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
		isRead: true,
		labels: ["inbox"],
	},
];

// Email stores
export const emails = writable<Email[]>([]);
export const threads = writable<Thread[]>(mockThreads);
export const selectedThreadId = writable<string | null>(null);

// Derived stores
export const selectedThread = derived(
	[threads, selectedThreadId],
	([$threads, $selectedThreadId]) => $threads.find((t) => t.id === $selectedThreadId) ?? null,
);

// UI state
export const isComposing = writable(false);
export const searchQuery = writable("");
export const isSidebarOpen = writable(false); // Mobile sidebar drawer state
export const isSearchExpanded = writable(false); // Mobile search expansion state

// Theme state
export type Theme = "dark" | "light";
export const theme = writable<Theme>("dark");

// User state (populated from server-side session data)
export const currentUser = writable<{
	id: string;
	email: string;
	name?: string;
	avatar?: string;
} | null>(null);
