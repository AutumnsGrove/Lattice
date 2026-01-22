/**
 * Vineyard Components
 * Shared showcase/documentation components for the Grove ecosystem
 *
 * Usage:
 * import { VineyardLayout, FeatureCard, StatusBadge } from '@autumnsgrove/groveengine/vineyard';
 */

// Layout
export { default as VineyardLayout } from './VineyardLayout.svelte';

// Feature Display
export { default as FeatureCard } from './FeatureCard.svelte';
export { default as StatusBadge } from './StatusBadge.svelte';

// Demo & Code
export { default as DemoContainer } from './DemoContainer.svelte';
export { default as CodeExample } from './CodeExample.svelte';

// Access Control
export { default as TierGate } from './TierGate.svelte';

// Roadmap
export { default as RoadmapSection } from './RoadmapSection.svelte';

// Authentication
export { default as AuthButton } from './AuthButton.svelte';
export { default as UserMenu } from './UserMenu.svelte';

// Re-export types
export type {
  VineyardStatus,
  GroveTool,
  GroveTier,
  VineyardLayoutProps,
  FeatureCardProps,
  StatusBadgeProps,
  DemoContainerProps,
  CodeExampleProps,
  TierGateProps,
  RoadmapSectionProps,
  BetterAuthUser,
  BetterAuthSession,
  BetterAuthSessionResponse,
  BetterAuthProvider,
  AuthButtonProps,
  UserMenuProps
} from '../../types/index.js';

// Re-export auth utilities
export { signIn, signOut, getSession, isAuthenticated } from '../../auth/index.js';
