// GroveUI - Basic UI Components
//
// This module exports all basic UI components:
// Button, Card, Input, Dialog, Select, Tabs, Accordion, Badge, etc.
//
// Usage:
//   import { Button, Card } from '@lattice/ui/ui';

// Types
export * from "./types";

// Wrapper components
export { default as Button } from "./Button.svelte";
export { default as Card } from "./Card.svelte";
export { default as Badge } from "./Badge.svelte";
export { default as FeatureStar } from "./FeatureStar.svelte";
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

// Beta program components
export { default as BetaBadge } from "./BetaBadge.svelte";
export { default as BetaWelcomeDialog } from "./BetaWelcomeDialog.svelte";

// Glass suite - glassmorphism components
export { default as Glass } from "./Glass.svelte";
export { default as GlassButton } from "./GlassButton.svelte";
export { default as GlassCard } from "./GlassCard.svelte";
export { default as GlassConfirmDialog } from "./GlassConfirmDialog.svelte";
export { default as GlassNavbar } from "./GlassNavbar.svelte";
export { default as GlassOverlay } from "./GlassOverlay.svelte";
export { default as PassageTransition } from "./PassageTransition.svelte";
export { default as GlassLogo } from "./GlassLogo.svelte";
export { default as GlassLogoArchive } from "./GlassLogoArchive.svelte";
export { default as GlassCarousel } from "./GlassCarousel.svelte";
export { default as GlassLegend } from "./GlassLegend.svelte";
export { default as GlassStatusWidget } from "./GlassStatusWidget.svelte";
export { default as GlassComparisonTable } from "./GlassComparisonTable.svelte";

// GlassChat - reusable chat interface
export { default as GlassChat } from "./glasschat/GlassChat.svelte";
export { default as ChatMessage } from "./glasschat/ChatMessage.svelte";
export { default as ChatInput } from "./glasschat/ChatInput.svelte";
export { default as ChatTypingIndicator } from "./glasschat/ChatTypingIndicator.svelte";
export * from "./glasschat/types";
export {
	createChatMessage,
	createChatController,
	createAIChatController,
	createConversationalChatController,
} from "./glasschat/controller.svelte";
export type {
	ChatController,
	AIChatController,
	AIChatControllerOptions,
	AIChatResponse,
	ConversationalChatController,
	ConversationalChatControllerOptions,
} from "./glasschat/controller.svelte";

export { default as Waystone } from "./Waystone.svelte";
export { default as WaystonePopup } from "./waystone/WaystonePopup.svelte";
export * from "./waystone/types";

// GroveMessages - cross-app communication system
export { default as GroveMessages } from "./grove-messages/GroveMessages.svelte";
export * from "./grove-messages/types";
export type { GroveMessageChannel } from "./grove-messages/types";

// GroveTerm - unified terminology (non-interactive by default, add `interactive` for popup)
export { default as GroveTerm } from "./groveterm/GroveTerm.svelte";
export { default as GroveText } from "./groveterm/GroveText.svelte";
export { default as GroveTermPopup } from "./groveterm/GroveTermPopup.svelte";
export * from "./groveterm/types";

// GroveIcon - manifest-driven service icon swap
export { default as GroveIcon } from "./groveicon/GroveIcon.svelte";
export { defaultSuite, groveIconManifest, getSuite } from "./groveicon/manifest";
export { resolveIcon, hasIcon } from "./groveicon/resolver";
export type {
	IconComponent,
	GroveIconEntry,
	GroveIconSuite,
	GroveIconManifest,
	ResolvedIcon,
} from "./groveicon/types";

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

export const UI_VERSION = "0.3.0";
