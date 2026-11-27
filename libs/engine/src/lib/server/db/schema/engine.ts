/**
 * Drizzle Schema — grove-engine-db (DB binding)
 *
 * RE-EXPORT SHIM: Tables are now split into domain-specific files.
 * This file re-exports everything for backward compatibility.
 *
 * Domain files:
 *   platform.ts   — tenants, config, feature flags, admin (15 tables)
 *   auth.ts       — users, sessions, onboarding, verification (10 tables)
 *   content.ts    — posts, pages, blazes, themes (7 tables)
 *   billing.ts    — subscriptions, webhooks, comped invites (4 tables)
 *   social.ts     — meadow (deprecated), reeds (comments), feedback (11 tables)
 *   media.ts      — uploads, images, storage, amber (9 tables)
 *   monitoring.ts — thorn, petal, sentinel (11 tables)
 *   fireside.ts   — the conversation before the words exist (2 tables)
 *
 * Curio tables (045 tables) → see curios.ts
 * Observability tables (010 tables) → see observability.ts
 */

export * from "./platform.js";
export * from "./auth.js";
export * from "./content.js";
export * from "./billing.js";
export * from "./social.js";
export * from "./media.js";
export * from "./monitoring.js";
export * from "./fireside.js";
