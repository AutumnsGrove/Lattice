// Hum — Universal Music Link Previews
//
// Transforms music links into beautiful Grove-branded preview cards.
// Share a song. The grove hums along.
//
// Usage:
//   import { HumCard, HumCardFallback, HumProviderBadge } from '@autumnsgrove/lattice/ui/content/hum';

export { default as HumCard } from "./HumCard.svelte";
export { default as HumCardSkeleton } from "./HumCardSkeleton.svelte";
export { default as HumCardFallback } from "./HumCardFallback.svelte";
export { default as HumProviderBadge } from "./HumProviderBadge.svelte";
export { default as HumPlatformTray } from "./HumPlatformTray.svelte";

export {
  detectProvider,
  isMusicUrl,
  getProviderInfo,
  HUM_PROVIDERS,
} from "./providers.js";

export type {
  HumMetadata,
  HumProvider,
  HumContentType,
  HumStatus,
  HumProviderInfo,
} from "./types.js";
