/**
 * Mock for SvelteKit's $app/navigation module
 * Used in vitest to allow testing components that use SvelteKit navigation
 */

import { vi } from "vitest";

// Mock navigation functions
export const goto = vi.fn(async (url: string, opts?: any) => {});
export const invalidate = vi.fn(async (url?: string) => {});
export const invalidateAll = vi.fn(async () => {});
export const preloadData = vi.fn(async (url: string) => ({
  type: "loaded" as const,
  status: 200,
  data: {},
}));
export const preloadCode = vi.fn(async (...urls: string[]) => {});
export const beforeNavigate = vi.fn((callback: any) => {});
export const afterNavigate = vi.fn((callback: any) => {});
export const onNavigate = vi.fn((callback: any) => {});
export const disableScrollHandling = vi.fn(() => {});
export const pushState = vi.fn((url: string, state: any) => {});
export const replaceState = vi.fn((url: string, state: any) => {});
