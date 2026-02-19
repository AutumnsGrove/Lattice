/**
 * Curio Widget Components
 *
 * Embeddable curios: mounted by CurioHydrator via ::curio-name[]:: directives
 * Global layers: mounted once in root layout for site-wide effects
 */

// Embeddable curio widgets (dynamically imported by CurioHydrator)
export { default as CurioHitcounter } from "./CurioHitcounter.svelte";
export { default as CurioNowplaying } from "./CurioNowplaying.svelte";
export { default as CurioBadges } from "./CurioBadges.svelte";
export { default as CurioGuestbook } from "./CurioGuestbook.svelte";
export { default as CurioPoll } from "./CurioPoll.svelte";
export { default as CurioMoodring } from "./CurioMoodring.svelte";
export { default as CurioBlogroll } from "./CurioBlogroll.svelte";
export { default as CurioStatusbadges } from "./CurioStatusbadges.svelte";
export { default as CurioArtifacts } from "./CurioArtifacts.svelte";
export { default as CurioWebring } from "./CurioWebring.svelte";
export { default as CurioLinkgarden } from "./CurioLinkgarden.svelte";
export { default as CurioActivitystatus } from "./CurioActivitystatus.svelte";
export { default as CurioBookmarkshelf } from "./CurioBookmarkshelf.svelte";

// Global curio layers (imported directly in root layout)
export { default as CurioCursorsLayer } from "./CurioCursorsLayer.svelte";
export { default as CurioAmbientLayer } from "./CurioAmbientLayer.svelte";
