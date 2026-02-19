import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getSession, type User } from "./auth";

// Theme store (dark/light)
export const theme = writable<"dark" | "light">("dark");

// Current user store
export const currentUser = writable<User | null>(null);

// Initialize user session on app load
if (browser) {
	getSession().then((session) => {
		if (session?.user) {
			currentUser.set(session.user);
		}
	});
}

// Search query store
export const searchQuery = writable("");

// Sidebar open state (for mobile navigation)
export const sidebarOpen = writable(false);
