// GroveUI - Basic UI Components
//
// This module exports all basic UI components:
// Button, Card, Input, Dialog, Select, Tabs, Accordion, Badge, etc.
//
// Usage:
//   import { Button, Card } from '@groveengine/ui/ui';

// Types
export * from "./types";

// Wrapper components
export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as Dialog } from "./Dialog.svelte";
export { default as Input } from "./Input.svelte";
export { default as Textarea } from "./Textarea.svelte";
export { default as Select } from "./Select.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Accordion } from "./Accordion.svelte";
export { default as Sheet } from "./Sheet.svelte";
export { default as Toast } from "./Toast.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as Spinner } from "./Spinner.svelte";
export { default as Table } from "./Table.svelte";
export { default as CollapsibleSection } from "./CollapsibleSection.svelte";
export { default as Logo } from "./Logo.svelte";
export { default as LogoLoader } from "./LogoLoader.svelte";
export { default as LogoArchive } from "./LogoArchive.svelte";

// Glass suite - glassmorphism components
export { default as Glass } from "./Glass.svelte";
export { default as GlassButton } from "./GlassButton.svelte";
export { default as GlassCard } from "./GlassCard.svelte";
export { default as GlassConfirmDialog } from "./GlassConfirmDialog.svelte";
export { default as GlassNavbar } from "./GlassNavbar.svelte";
export { default as GlassOverlay } from "./GlassOverlay.svelte";
export { default as GlassLogo } from "./GlassLogo.svelte";
export { default as GlassLogoArchive } from "./GlassLogoArchive.svelte";
export { default as GlassCarousel } from "./GlassCarousel.svelte";
export { default as GlassLegend } from "./GlassLegend.svelte";

// Table sub-components (from primitives)
export {
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableFooter,
  TableCaption,
} from "$lib/ui/components/primitives/table";

// Toast utility
export * from "./toast.js";

export const UI_VERSION = "0.2.0";
