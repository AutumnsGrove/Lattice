/**
 * Chrome Components Index
 * Re-exports all shared chrome/navigation components from the engine package
 */

export { default as ThemeToggle } from "./ThemeToggle.svelte";
export { default as MobileMenu } from "./MobileMenu.svelte";
export { default as Header } from "./Header.svelte";
export { default as HeaderMinimal } from "./HeaderMinimal.svelte";
export { default as AdminHeader } from "./AdminHeader.svelte";
export { default as Footer } from "./Footer.svelte";
export { default as FooterMinimal } from "./FooterMinimal.svelte";

export * from "./types";
export * from "./defaults";

// Tenant navigation utility
export { buildTenantNavItems } from "./tenant-nav";
export type { TenantNavOptions, TenantNavPage } from "./tenant-nav";

// Re-export stores for convenient access
export { seasonStore, themeStore, groveModeStore } from "../../stores";
