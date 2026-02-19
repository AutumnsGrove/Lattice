/**
 * Static category metadata for the knowledge base.
 *
 * These are the category definitions (specCategories, helpSections, exhibitWings)
 * that rarely change. They define how documents are grouped and displayed.
 *
 * Individual document metadata now lives in frontmatter of each .md file.
 * See docs-scanner.ts for the frontmatter-based document discovery.
 */

import type { SpecCategory, HelpSection, ExhibitWing } from "$lib/types/docs";

/**
 * Spec category metadata (mirrors workshop page organization)
 * Icons use keys from $lib/utils/icons.ts toolIcons map
 */
export const specCategories: {
  id: SpecCategory;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "core-infrastructure",
    name: "Core Infrastructure",
    description: "The foundation everything grows from",
    icon: "pyramid",
  },
  {
    id: "platform-services",
    name: "Platform Services",
    description: "Essential services that power every Grove blog",
    icon: "circuitboard",
  },
  {
    id: "content-community",
    name: "Content & Community",
    description: "Writing, moderation, and social features",
    icon: "id-card-lanyard",
  },
  {
    id: "standalone-tools",
    name: "Standalone Tools",
    description: "Independent tools that integrate with Grove",
    icon: "wrench",
  },
  {
    id: "operations",
    name: "Operations",
    description: "Internal infrastructure keeping Grove running",
    icon: "dock",
  },
  {
    id: "reference",
    name: "Reference",
    description: "Implementation guides and auxiliary documentation",
    icon: "filecode",
  },
];

/**
 * Help section metadata (mirrors specCategories pattern)
 * Icons use keys from $lib/utils/icons.ts toolIcons map
 */
export const helpSections: {
  id: HelpSection;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "getting-started",
    name: "Getting Started",
    description: "Begin your Grove journey",
    icon: "landplot",
  },
  // NOTE: "how-it-works" section intentionally excluded from display.
  // These articles are accessed via Waystones (contextual help links),
  // not browsed directly. They remain valid in docs-scanner.ts.
  {
    id: "writing-publishing",
    name: "Writing & Publishing",
    description: "Create and share your content",
    icon: "feather",
  },
  {
    id: "customization",
    name: "Customization",
    description: "Make Grove feel like yours",
    icon: "palette",
  },
  {
    id: "community-social",
    name: "Community & Social",
    description: "Connect with other writers",
    icon: "users",
  },
  {
    id: "account-billing",
    name: "Account & Billing",
    description: "Manage your subscription",
    icon: "store",
  },
  {
    id: "privacy-security",
    name: "Privacy & Security",
    description: "How we protect you and your content",
    icon: "shieldcheck",
  },
  {
    id: "ai-features",
    name: "AI Features",
    description: "Smart tools that respect your privacy",
    icon: "bird",
  },
  {
    id: "philosophy-vision",
    name: "Philosophy & Vision",
    description: "What Grove believes in",
    icon: "trees",
  },
  {
    id: "support-resources",
    name: "Support & Resources",
    description: "Help when you need it",
    icon: "lifebuoy",
  },
  {
    id: "troubleshooting",
    name: "Troubleshooting",
    description: "Fix common issues",
    icon: "helpcircle",
  },
];

/**
 * Exhibit wing metadata (museum organization)
 * Icons use keys from $lib/utils/icons.ts toolIcons map
 */
export const exhibitWings: {
  id: ExhibitWing;
  name: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "entrance",
    name: "The Entrance",
    description: "Welcome to the Lattice Museum",
    icon: "signpost",
  },
  {
    id: "architecture",
    name: "Architecture Wing",
    description: "How Grove is built at the infrastructure level",
    icon: "pyramid",
  },
  {
    id: "nature",
    name: "Nature Wing",
    description: "The visual and emotional language of Grove",
    icon: "trees",
  },
  {
    id: "trust",
    name: "Trust Wing",
    description: "Authentication, security, and identity",
    icon: "shieldcheck",
  },
  {
    id: "data",
    name: "Data Wing",
    description: "How information flows and persists",
    icon: "database",
  },
  {
    id: "personalization",
    name: "Personalization Wing",
    description: "Making each blog feel like home",
    icon: "palette",
  },
  {
    id: "community",
    name: "Community Wing",
    description: "The social layer and shared spaces",
    icon: "users",
  },
  {
    id: "naming",
    name: "Naming Wing",
    description: "How Grove names things, and why it matters",
    icon: "feather",
  },
];

/**
 * Document category metadata for the main knowledge base index.
 * Maps category IDs to display information.
 */
export const categoryMetadata: Record<
  string,
  { name: string; description: string; icon: string; path: string }
> = {
  specs: {
    name: "Technical Specifications",
    description: "Deep dives into Grove's architecture and systems",
    icon: "filecode",
    path: "/knowledge/specs",
  },
  help: {
    name: "Help Center",
    description: "Guides and answers for using Grove",
    icon: "helpcircle",
    path: "/knowledge/help",
  },
  patterns: {
    name: "Architecture Patterns",
    description: "Reusable patterns and design decisions",
    icon: "pyramid",
    path: "/knowledge/patterns",
  },
  design: {
    name: "Design System",
    description: "Visual language and UI components",
    icon: "palette",
    path: "/knowledge/design",
  },
  philosophy: {
    name: "Philosophy",
    description: "The values and vision behind Grove",
    icon: "trees",
    path: "/knowledge/philosophy",
  },
  legal: {
    name: "Legal",
    description: "Terms, privacy, and policies",
    icon: "shieldcheck",
    path: "/knowledge/legal",
  },
  marketing: {
    name: "Marketing",
    description: "Messaging and promotional materials",
    icon: "megaphone",
    path: "/knowledge/marketing",
  },
  exhibit: {
    name: "Lattice Museum",
    description: "A guided tour through how this forest grows",
    icon: "signpost",
    path: "/knowledge/exhibit",
  },
};
