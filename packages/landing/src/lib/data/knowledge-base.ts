import type { Doc, SpecCategory, HelpSection } from "$lib/types/docs";

// Re-export for convenience
export type { Doc, SpecCategory, HelpSection } from "$lib/types/docs";

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

// Technical Specifications - organized by category like workshop page
export const specs: Doc[] = [
  // ============================================================================
  // CORE INFRASTRUCTURE
  // The foundation everything grows from
  // ============================================================================
  {
    slug: "lattice-spec",
    title: "Lattice — Core Framework",
    description: "Core engine architecture and implementation details",
    excerpt:
      "GroveEngine is the core framework powering the Grove ecosystem. Built on Cloudflare Workers with SvelteKit frontend.",
    category: "specs",
    specCategory: "core-infrastructure",
    icon: "codesandbox",
    lastUpdated: "2025-11-15",
    readingTime: 12,
  },
  {
    slug: "grafts-spec",
    title: "Grafts — Feature Customization",
    description:
      "Per-tenant feature customization with boolean flags, percentage rollouts, and A/B variants",
    excerpt:
      "A graft makes your tree bear fruit no other can. Grove's Cloudflare-native feature flag system for per-tenant customization. Boolean flags, percentage rollouts, tier-gated features, and A/B variants—trusted configurations the Wayfinder enables for specific groves.",
    category: "specs",
    specCategory: "core-infrastructure",
    icon: "flag",
    lastUpdated: "2026-01-20",
    readingTime: 15,
  },

  // ============================================================================
  // PLATFORM SERVICES
  // Essential services that power every Grove blog
  // ============================================================================
  {
    slug: "heartwood-spec",
    title: "Heartwood — Centralized Authentication",
    description:
      "One identity across all Grove properties with Google OAuth and magic links",
    excerpt:
      "One identity, verified and protected, that works across every Grove property. Google OAuth or magic email codes, all secured with PKCE, rate limiting, and comprehensive audit logging. The authentic core of the ecosystem.",
    category: "specs",
    specCategory: "platform-services",
    icon: "shieldcheck",
    lastUpdated: "2026-01-04",
    readingTime: 20,
  },
  {
    slug: "arbor-spec",
    title: "Arbor — Admin Panel",
    description: "Content management and site administration interface",
    excerpt:
      "The Grove Admin Panel is where bloggers manage their content, customize their site, and configure settings. Designed to be simple, focused, and get out of the way.",
    category: "specs",
    specCategory: "platform-services",
    icon: "dashboard",
    lastUpdated: "2025-12-24",
    readingTime: 10,
  },
  {
    slug: "plant-spec",
    title: "Plant — Tenant Onboarding",
    description: "Multi-step onboarding flow for new Grove users",
    excerpt:
      "Comprehensive onboarding system guiding users through account creation, plan selection, payment, and initial setup.",
    category: "specs",
    specCategory: "platform-services",
    icon: "landplot",
    lastUpdated: "2025-12-01",
    readingTime: 7,
  },
  {
    slug: "loam-spec",
    title: "Loam — Name Protection",
    description:
      "Username and domain validation system protecting the grove from harm",
    excerpt:
      "Loam is Grove's username and domain validation system. Every name passes through it before taking root: reserved words, impersonation attempts, harmful content, fraud patterns. Good soil doesn't announce itself.",
    category: "specs",
    specCategory: "platform-services",
    icon: "funnel",
    lastUpdated: "2026-01-07",
    readingTime: 12,
  },
  {
    slug: "amber-spec",
    title: "Amber — Storage Management",
    description: "Unified storage management system for Grove",
    excerpt:
      "Amber is Grove's unified storage management system. Every file you upload—blog images, email attachments, profile pictures—is preserved in Amber, organized and accessible from one place.",
    category: "specs",
    specCategory: "platform-services",
    icon: "harddrive",
    lastUpdated: "2025-12-01",
    readingTime: 10,
  },
  {
    slug: "pantry-spec",
    title: "Pantry — Shop & Provisioning",
    description:
      "Grove's shop for subscriptions, merchandise, gift cards, and credits",
    excerpt:
      "A pantry is where you keep what sustains you. Pantry is Grove's shop—subscriptions, merchandise, credits, gift cards. Not a storefront with bright lights and sales pressure, just a cupboard in a warm kitchen, stocked and waiting.",
    category: "specs",
    specCategory: "platform-services",
    icon: "store",
    lastUpdated: "2026-01-06",
    readingTime: 12,
  },
  {
    slug: "foliage-project-spec",
    title: "Foliage — Theme System",
    description: "Customizable themes and visual customization options",
    excerpt:
      "Grove offers 10 hand-curated themes with tiered access based on subscription plans.",
    category: "specs",
    specCategory: "platform-services",
    icon: "swatchbook",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "terrarium-spec",
    title: "Terrarium — Creative Canvas",
    description: "Visual scene composition tool for blog decorations",
    excerpt:
      "A sealed world under glass—a miniature ecosystem you design, arrange, and watch grow. Drag nature components onto an open space, compose scenes from trees and creatures and flowers, then bring them home to your blog as decorations.",
    category: "specs",
    specCategory: "platform-services",
    icon: "pencilruler",
    lastUpdated: "2026-01-05",
    readingTime: 15,
  },
  {
    slug: "weave-spec",
    title: "Weave — Visual Composition Studio",
    description:
      "Node-graph editor for animations and diagrams within Terrarium",
    excerpt:
      "Weave your world together. Place elements on a grid, draw threads between them, watch relationships come alive. Create animations where chained vines ripple when shaken. Build diagrams with glass cards and Lucide icons.",
    category: "specs",
    specCategory: "platform-services",
    icon: "splinepointer",
    lastUpdated: "2026-01-06",
    readingTime: 12,
  },
  {
    slug: "rings-spec",
    title: "Rings — Private Analytics",
    description: "Privacy-respecting analytics system for Grove platform",
    excerpt:
      "Grove Analytics provides insights into blog performance while respecting user privacy. No personal data is collected, and all metrics are aggregated and anonymized.",
    category: "specs",
    specCategory: "platform-services",
    icon: "barchart",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "clearing-spec",
    title: "Clearing — Status Page",
    description:
      "Public-facing status page for platform health and incident communication",
    excerpt:
      "The Grove Status page provides transparent, real-time communication about platform health. When something goes wrong—or when maintenance is planned—users can check status.grove.place.",
    category: "specs",
    specCategory: "platform-services",
    icon: "activity",
    lastUpdated: "2025-12-24",
    readingTime: 12,
  },
  {
    slug: "waystone-spec",
    title: "Waystone — Help Center",
    description: "Integrated help system with contextual assistance",
    excerpt:
      "Grove's Help Center is built directly into the platform—no external docs site, no separate logins.",
    category: "specs",
    specCategory: "platform-services",
    icon: "signpost",
    lastUpdated: "2025-12-01",
    readingTime: 11,
  },
  {
    slug: "porch-spec",
    title: "Porch — Front Porch Conversations",
    description:
      "Warm, accessible support where you chat with the grove keeper",
    excerpt:
      "A porch is where you sit and talk. Come up the steps, have a seat, and the grove keeper comes out to chat. Submit a question, start a conversation, or just drop by to say hi. Every visit is tracked, but it never feels like a ticket.",
    category: "specs",
    specCategory: "platform-services",
    icon: "rocking-chair",
    lastUpdated: "2026-01-06",
    readingTime: 10,
  },
  {
    slug: "centennial-spec",
    title: "Centennial — Domain Preservation",
    description: "100-year domain preservation for long-term Grove members",
    excerpt:
      "Some trees outlive the people who planted them. Centennial is Grove's promise that your words can have that same longevity. After 12 months on Sapling tier or above, your grove earns Centennial status—your site stays online for 100 years.",
    category: "specs",
    specCategory: "platform-services",
    icon: "squares-exclude",
    lastUpdated: "2026-01-04",
    readingTime: 8,
  },

  // ============================================================================
  // CONTENT & COMMUNITY
  // Writing, moderation, and social features
  // ============================================================================
  {
    slug: "wisp-spec",
    title: "Wisp — Writing Assistant",
    description: "Ethical AI writing tool that polishes without replacing",
    excerpt:
      "Wisp is an ethical AI writing assistant that helps users polish their voice without replacing it. It analyzes content for grammar, tone, and readability—never generates or expands content.",
    category: "specs",
    specCategory: "content-community",
    icon: "wind",
    lastUpdated: "2025-12-30",
    readingTime: 6,
  },
  {
    slug: "reeds-spec",
    title: "Reeds — Comment System",
    description:
      "Dual-mode comment system with private replies and public comments",
    excerpt:
      "Grove implements a custom comment system with two modes: Replies (private messages to authors) and Comments (public, requiring approval).",
    category: "specs",
    specCategory: "content-community",
    icon: "messagessquare",
    lastUpdated: "2025-12-05",
    readingTime: 10,
  },
  {
    slug: "thorn-spec",
    title: "Thorn — Content Moderation",
    description:
      "Privacy-first automated content moderation using AI models with zero data retention",
    excerpt:
      "Grove uses automated content moderation to enforce our Acceptable Use Policy while maintaining strict privacy protections. This system is designed with a privacy-first architecture: no human eyes on user data, no retention of content.",
    category: "specs",
    specCategory: "content-community",
    icon: "file-warning",
    lastUpdated: "2026-01-01",
    readingTime: 18,
  },
  {
    slug: "meadow-spec",
    title: "Meadow — Social Feed",
    description: "Community feed, sharing, voting, and reactions system",
    excerpt:
      "Grove Social enables blogs to share posts to a community feed where users can vote and react with emojis.",
    category: "specs",
    specCategory: "content-community",
    icon: "users",
    lastUpdated: "2025-12-01",
    readingTime: 9,
  },
  {
    slug: "trails-spec",
    title: "Trails — Personal Roadmaps",
    description: "Build in public with beautiful project roadmaps",
    excerpt:
      "Trails lets Grove users create and share personal roadmaps. Build in public, plan content, and track progress with a beautiful way to show the journey.",
    category: "specs",
    specCategory: "content-community",
    icon: "mapplus",
    lastUpdated: "2025-12-29",
    readingTime: 6,
  },

  // ============================================================================
  // STANDALONE TOOLS
  // Independent tools that integrate with Grove
  // ============================================================================
  {
    slug: "ivy-mail-spec",
    title: "Ivy — Mail Client",
    description: "First-party mail client for @grove.place email addresses",
    excerpt:
      "Ivy is Grove's first-party mail client for @grove.place email addresses. Rather than forcing users to configure IMAP in third-party clients, Ivy provides a focused, privacy-first web interface.",
    category: "specs",
    specCategory: "standalone-tools",
    icon: "mailbox",
    lastUpdated: "2025-12-01",
    readingTime: 15,
  },
  {
    slug: "bloom-spec",
    title: "Bloom — Remote Coding Infrastructure",
    description: "Serverless autonomous coding agent on transient VPS",
    excerpt:
      "Bloom is a personal, serverless remote coding agent. Text it and forget it—send a task from your phone, the agent works until done, commits code, and the infrastructure self-destructs.",
    category: "specs",
    specCategory: "standalone-tools",
    icon: "loader",
    lastUpdated: "2025-12-30",
    readingTime: 23,
  },
  {
    slug: "forage-spec",
    title: "Forage — Domain Discovery",
    description:
      "AI-powered domain hunting that reduces weeks of searching to hours",
    excerpt:
      "Before you can plant, you have to search. Forage is an AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget, and it returns a curated list of available domains that actually fit.",
    category: "specs",
    specCategory: "standalone-tools",
    icon: "searchcode",
    lastUpdated: "2026-01-04",
    readingTime: 15,
  },
  {
    slug: "nook-spec",
    title: "Nook — Private Video Sharing",
    description:
      "Cozy corner for sharing videos with close friends, not the world",
    excerpt:
      "Where you share moments with the people who matter. Not a YouTube channel, not a public archive. Just a tucked-away space where your closest friends can watch the videos you've been meaning to share.",
    category: "specs",
    specCategory: "standalone-tools",
    icon: "projector",
    lastUpdated: "2026-01-04",
    readingTime: 12,
  },
  {
    slug: "shutter-spec",
    title: "Shutter — Web Content Distillation",
    description:
      "Token-efficient web fetching with built-in prompt injection defense",
    excerpt:
      "A shutter controls what reaches the lens. Shutter is Grove's web content distillation service. Hand it a URL and a question, and it opens briefly—just long enough to capture what you need—then closes, leaving the chaos outside. Your agents get clean, focused content instead of raw HTML noise.",
    category: "specs",
    specCategory: "standalone-tools",
    icon: "aperture",
    lastUpdated: "2026-01-13",
    readingTime: 15,
  },

  // ============================================================================
  // OPERATIONS
  // Internal infrastructure keeping Grove running
  // ============================================================================
  {
    slug: "press-spec",
    title: "Press — Image Processing CLI",
    description:
      "CLI tool for WebP conversion, AI descriptions, and CDN upload",
    excerpt:
      "A press takes something raw and makes it ready. Press is Grove's image processing CLI: convert to WebP, generate AI descriptions for accessibility, deduplicate by content hash, and upload to R2.",
    category: "specs",
    specCategory: "operations",
    icon: "stamp",
    lastUpdated: "2026-01-06",
    readingTime: 10,
  },
  {
    slug: "vista-spec",
    title: "Vista — Infrastructure Monitoring",
    description:
      "Real-time metrics, historical data, alerting, and cost tracking",
    excerpt:
      "A clearing in the forest where the whole grove stretches out before you. Vista monitors every worker, database, and storage bucket—tracking health, latency, error rates, and costs. Real-time dashboards, email alerts, and ninety days of history.",
    category: "specs",
    specCategory: "operations",
    icon: "binoculars",
    lastUpdated: "2026-01-04",
    readingTime: 18,
  },
  {
    slug: "patina-spec",
    title: "Patina — Automated Backup System",
    description:
      "Nightly database backups with weekly archives and 12-week retention",
    excerpt:
      "A patina forms on copper over time—not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved.",
    category: "specs",
    specCategory: "operations",
    icon: "database",
    lastUpdated: "2025-12-31",
    readingTime: 25,
  },
  {
    slug: "mycelium-spec",
    title: "Mycelium — MCP Server",
    description: "Model Context Protocol server for Grove ecosystem",
    excerpt:
      "Mycelium is Grove's Model Context Protocol (MCP) server—the wood wide web that lets AI agents interact with the entire Grove ecosystem. Claude talks to Grove through Mycelium.",
    category: "specs",
    specCategory: "operations",
    icon: "circuitboard",
    lastUpdated: "2025-12-30",
    readingTime: 15,
  },
  {
    slug: "shade-spec",
    title: "Shade — AI Content Protection System",
    description: "Layered defense against AI crawlers and scrapers",
    excerpt:
      "Users own their words. Shade is Grove's seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.",
    category: "specs",
    specCategory: "operations",
    icon: "blinds",
    lastUpdated: "2025-12-26",
    readingTime: 18,
  },

  // ============================================================================
  // REFERENCE
  // Implementation guides and auxiliary documentation
  // ============================================================================
  {
    slug: "vineyard-spec",
    title: "Vineyard — Tool Showcase Pattern",
    description: "Consistent documentation and demo pattern for Grove tools",
    excerpt:
      "Vineyard is a documentation and demo pattern that every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it's headed.",
    category: "specs",
    specCategory: "reference",
    icon: "grape",
    lastUpdated: "2025-12-30",
    readingTime: 5,
  },
  {
    slug: "seasons-spec",
    title: "Seasons — Versioning System",
    description: "Semantic versioning strategy and release workflow",
    excerpt:
      "GroveEngine follows Semantic Versioning 2.0.0 for all releases. This document defines how versions are managed and how updates propagate to customer repositories.",
    category: "specs",
    specCategory: "reference",
    icon: "tag",
    lastUpdated: "2025-11-26",
    readingTime: 7,
  },
  {
    slug: "customer-repo-spec",
    title: "Customer Repository Specification",
    description: "Template structure for customer blog repositories",
    excerpt:
      "Each customer has their own repository that imports @groveengine/core as a dependency. This single-tenant model provides isolation, customization, and independence.",
    category: "specs",
    specCategory: "reference",
    icon: "filecode",
    lastUpdated: "2025-11-26",
    readingTime: 6,
  },
  {
    slug: "website-spec",
    title: "Grove Website Specification",
    description: "Marketing site and client management platform",
    excerpt:
      "Grove Website is the main marketing site and client management platform. It handles marketing, client acquisition, onboarding, billing, and provides a dashboard for clients to manage their blogs.",
    category: "specs",
    specCategory: "reference",
    icon: "globe",
    lastUpdated: "2025-11-21",
    readingTime: 10,
  },
  {
    slug: "tenant-onboarding-implementation-plan",
    title: "Tenant Onboarding Implementation Plan",
    description: "Detailed implementation guide for the onboarding flow",
    excerpt:
      "Ready-to-implement plan covering architecture decisions, flow diagrams, and step-by-step implementation details for the tenant signup experience.",
    category: "specs",
    specCategory: "reference",
    icon: "layout",
    lastUpdated: "2025-12-01",
    readingTime: 12,
  },
  {
    slug: "fiction-house-publishing-spec",
    title: "Fiction House Publishing",
    description: "Project specification for the first Grove customer site",
    excerpt:
      "Fiction House Publishing is a publishing house portfolio site—the first customer deployment of GroveEngine with custom book catalog features.",
    category: "specs",
    specCategory: "reference",
    icon: "book",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
];

// Help Center Articles
export const helpArticles: Doc[] = [
  {
    slug: "what-is-grove",
    title: "What is Grove?",
    description: "An introduction to Grove and what makes it different",
    excerpt:
      "Grove is a multi-tenant blog platform where users get their own blogs on subdomains. Built on Cloudflare infrastructure with SvelteKit.",
    category: "help",
    section: "getting-started",
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "why-grove-is-different",
    title: "Why Grove is Different",
    description:
      "How Grove inverts every manipulation pattern used by algorithmic platforms",
    excerpt:
      "Most social platforms track every click, scroll, and pause. They feed that data into machine learning models that predict what will keep you engaged longest. Grove works differently.",
    category: "help",
    section: "philosophy-vision",
    icon: "shield",
    lastUpdated: "2026-01-14",
    readingTime: 8,
  },
  {
    slug: "writing-your-first-post",
    title: "Writing Your First Post",
    description: "Learn how to write and publish your first blog post on Grove",
    excerpt:
      "Welcome! Let's get your first post published. From your admin panel, click New Post in the sidebar.",
    category: "help",
    section: "getting-started",
    lastUpdated: "2025-12-13",
    readingTime: 5,
  },
  {
    slug: "choosing-your-plan",
    title: "Choosing Your Plan",
    description: "Understanding Grove's pricing tiers and features",
    excerpt:
      "Grove offers four plans: Seedling ($8), Sapling ($12), Oak ($25), and Evergreen ($35). Each plan includes different features and limits.",
    category: "help",
    section: "getting-started",
    lastUpdated: "2025-12-01",
    readingTime: 4,
  },
  {
    slug: "drafts-and-scheduling",
    title: "Drafts and Scheduling",
    description: "How to save drafts and schedule posts for later",
    excerpt:
      "Grove allows you to save posts as drafts and schedule them to be published at a future date.",
    category: "help",
    section: "writing-publishing",
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "tags-and-organization",
    title: "Tags and Organization",
    description: "Using tags to organize your blog posts",
    excerpt:
      "Tags help organize your content and make it easier for readers to find related posts.",
    category: "help",
    section: "writing-publishing",
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "exporting-your-content",
    title: "Exporting Your Content",
    description: "How to export your blog content from Grove",
    excerpt:
      "You can export all your blog content including posts, images, and comments as a ZIP file.",
    category: "help",
    section: "writing-publishing",
    lastUpdated: "2025-12-01",
    readingTime: 2,
  },
  {
    slug: "my-site-isnt-loading",
    title: "My Site Isn't Loading",
    description: "Troubleshooting steps for when your blog won't load",
    excerpt:
      "If your site isn't loading, check these common issues: DNS propagation, SSL certificates, and browser cache.",
    category: "help",
    section: "troubleshooting",
    lastUpdated: "2025-12-01",
    readingTime: 4,
  },
  {
    slug: "opting-into-the-feed",
    title: "Opting Into the Feed",
    description: "How to share your posts on the Grove community feed",
    excerpt:
      "The Meadow feed allows you to share your posts with the wider Grove community. Participation is optional.",
    category: "help",
    section: "community-social",
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "reactions-and-voting",
    title: "Reactions and Voting",
    description: "Understanding emoji reactions and voting on posts",
    excerpt:
      "Readers can react to your posts with emojis and vote on content in the community feed.",
    category: "help",
    section: "community-social",
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "understanding-replies-vs-comments",
    title: "Understanding Replies vs Comments",
    description: "The difference between private replies and public comments",
    excerpt:
      "Grove has two types of responses: Replies (private messages to the author) and Comments (public, requiring approval).",
    category: "help",
    section: "community-social",
    lastUpdated: "2025-12-01",
    readingTime: 4,
  },
  {
    slug: "understanding-your-privacy",
    title: "Understanding Your Privacy",
    description: "How Grove handles your data and privacy",
    excerpt:
      "Grove is built with privacy in mind. We don't track you, sell your data, or show ads.",
    category: "help",
    section: "privacy-security",
    lastUpdated: "2025-12-01",
    readingTime: 5,
  },
  {
    slug: "how-grove-protects-your-content",
    title: "How Grove Protects Your Content from AI Scraping",
    description:
      "Shade: Grove's seven-layer defense against AI crawlers and scrapers",
    excerpt:
      "Every major AI company sends crawlers across the web to train their models. Grove says no. Here's how our Shade protection system keeps your writing between you and your readers.",
    category: "help",
    section: "privacy-security",
    lastUpdated: "2025-12-25",
    readingTime: 6,
  },
  {
    slug: "what-is-zdr",
    title: "What is ZDR and Why Does It Matter?",
    description:
      "Zero Data Retention: how Grove's AI features process your content without storing it",
    excerpt:
      "When you use AI features on Grove, your words pass through external services. Most AI providers log everything. Grove's AI features work differently. We use Zero Data Retention: your words go in, results come out, everything in between vanishes.",
    category: "help",
    section: "ai-features",
    lastUpdated: "2026-01-07",
    readingTime: 4,
  },
  {
    slug: "what-is-swarm",
    title: "What is Swarm and How Does It Work?",
    description:
      "How Grove uses multiple AI agents working in parallel to deliver better results faster",
    excerpt:
      "Some Grove tools use a swarm approach. Instead of one AI assistant working through a task step by step, multiple agents work in parallel, each handling a piece of the problem. Think of it like a research team versus a single researcher.",
    category: "help",
    section: "ai-features",
    lastUpdated: "2026-01-07",
    readingTime: 4,
  },
  {
    slug: "how-grove-backs-up-your-data",
    title: "How Grove Backs Up Your Data",
    description: "Patina: Automated nightly backups with 12-week retention",
    excerpt:
      "Every night while you sleep, Grove quietly preserves everything: your posts, your comments, your settings. We call this system Patina. Age as armor.",
    category: "help",
    section: "privacy-security",
    lastUpdated: "2025-12-31",
    readingTime: 5,
  },
  {
    slug: "your-rss-feed",
    title: "Your RSS Feed",
    description: "How to access and use your blog's RSS feed",
    excerpt:
      "Every Grove blog has an RSS feed at yourdomain.grove.place/rss.xml",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-01",
    readingTime: 2,
  },
  {
    slug: "creating-your-account",
    title: "Creating Your Account",
    description: "How to sign up for Grove using Google authentication",
    excerpt:
      "Getting started with Grove takes about a minute. Grove uses Google for authentication—no new password to create or remember.",
    category: "help",
    section: "account-billing",
    lastUpdated: "2025-12-24",
    readingTime: 3,
  },
  {
    slug: "understanding-the-admin-panel",
    title: "Understanding the Admin Panel",
    description: "A tour of your Grove admin dashboard",
    excerpt:
      "Once you're signed in, the admin panel is your home base. Here's a quick tour of what you'll find and where to find it.",
    category: "help",
    section: "customization",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "formatting-your-posts",
    title: "Formatting Your Posts",
    description: "Markdown syntax and formatting options for your writing",
    excerpt:
      "Grove uses Markdown for formatting—a simple way to style text that's been around since 2004. Here's everything you need.",
    category: "help",
    section: "customization",
    lastUpdated: "2025-12-24",
    readingTime: 5,
  },
  {
    slug: "adding-images-and-media",
    title: "Adding Images and Media",
    description: "How to upload and use images in your posts",
    excerpt:
      "Images make posts more engaging. Here's how to add them to your Grove blog, including supported formats and size limits.",
    category: "help",
    section: "customization",
    lastUpdated: "2025-12-24",
    readingTime: 3,
  },
  {
    slug: "choosing-a-theme",
    title: "Choosing a Theme",
    description: "Customize your blog's appearance with themes and colors",
    excerpt:
      "Your blog should feel like yours. Grove's theme system gives you meaningful customization without requiring design expertise.",
    category: "help",
    section: "customization",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "what-is-meadow",
    title: "What is Meadow?",
    description: "Grove's community feed for discovering and sharing posts",
    excerpt:
      "Meadow is Grove's community feed—a shared space where bloggers can discover each other's work, react to posts, and have conversations.",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "known-limitations",
    title: "Known Limitations",
    description: "What Grove intentionally doesn't do",
    excerpt:
      "Grove is intentionally focused. Some things we don't do—not because we couldn't, but because they'd compromise what Grove is trying to be.",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-24",
    readingTime: 5,
  },
  {
    slug: "contact-support",
    title: "Contacting Support",
    description: "How to reach a real person when you need help",
    excerpt:
      "When you need help with something the documentation doesn't cover, here's how to reach a real person. No ticket system, no chatbot maze.",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-24",
    readingTime: 3,
  },
  {
    slug: "checking-grove-status",
    title: "Checking Grove Status",
    description: "How to check if Grove is experiencing issues",
    excerpt:
      "If something seems off with Grove, here's how to find out what's happening. Check status.grove.place for real-time updates.",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-24",
    readingTime: 3,
  },
  {
    slug: "upgrading-or-downgrading",
    title: "Upgrading or Downgrading Your Plan",
    description: "How to change your Grove subscription plan",
    excerpt:
      "You can change your Grove plan anytime. Upgrades take effect immediately; downgrades apply at the end of your billing period.",
    category: "help",
    section: "account-billing",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "account-deletion",
    title: "Deleting Your Account",
    description: "How to close your Grove account and delete your data",
    excerpt:
      "If you decide to leave Grove, you can delete your account and all associated data. Export your content first—deletion is permanent.",
    category: "help",
    section: "account-billing",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "browser-compatibility",
    title: "Browser Compatibility",
    description: "Supported browsers and troubleshooting tips",
    excerpt:
      "Grove works in all modern browsers. Here's what's supported and what to do if something isn't working right.",
    category: "help",
    section: "support-resources",
    lastUpdated: "2025-12-24",
    readingTime: 4,
  },
  {
    slug: "the-markdown-editor",
    title: "The Markdown Editor",
    description:
      "A guide to Grove's writing environment with preview, ambient sounds, and zen mode",
    excerpt:
      "Grove's editor is where you'll spend most of your time. Markdown with floating toolbar, live preview, drag-drop images, ambient sounds, zen mode, and autosave.",
    category: "help",
    section: "writing-publishing",
    lastUpdated: "2026-01-03",
    readingTime: 5,
  },
  {
    slug: "custom-fonts",
    title: "Custom Fonts",
    description:
      "20 curated fonts including accessibility options, with custom upload for Evergreen",
    excerpt:
      "Grove includes 20 fonts—accessibility fonts like Lexend and OpenDyslexic, serifs, sans-serifs, and display faces. Evergreen subscribers can upload their own.",
    category: "help",
    section: "customization",
    lastUpdated: "2026-01-03",
    readingTime: 4,
  },
  {
    slug: "understanding-your-plan",
    title: "Understanding Your Plan",
    description: "What's included in each Grove plan and how limits work",
    excerpt:
      "Here's what each Grove plan includes—post limits, storage, themes, and features—and what happens when you approach your limits.",
    category: "help",
    section: "account-billing",
    lastUpdated: "2026-01-03",
    readingTime: 5,
  },
  {
    slug: "data-portability",
    title: "Data Portability",
    description:
      "Taking your Grove content to WordPress, Ghost, Hugo, or anywhere else",
    excerpt:
      "Your content belongs to you. Grove exports in standard formats—Markdown and JSON—that work with WordPress, Ghost, Hugo, and other platforms.",
    category: "help",
    section: "privacy-security",
    lastUpdated: "2026-01-03",
    readingTime: 4,
  },
  {
    slug: "groves-vision",
    title: "Grove's Vision",
    description: "The philosophy and values behind Grove",
    excerpt:
      "The internet used to be a place of personal expression. Grove is a return to something simpler—a forest of voices, a place where your words are yours.",
    category: "help",
    section: "philosophy-vision",
    lastUpdated: "2026-01-03",
    readingTime: 5,
  },
  {
    slug: "gdpr-and-privacy-rights",
    title: "GDPR and Privacy Rights",
    description: "Your data rights under GDPR, CCPA, and similar laws",
    excerpt:
      "Whether you're in Europe, California, or anywhere else, you have rights over your personal data. Here's what Grove collects and what you can do about it.",
    category: "help",
    section: "privacy-security",
    lastUpdated: "2026-01-03",
    readingTime: 5,
  },
  {
    slug: "centennial-status",
    title: "Centennial Status: Your Grove for 100 Years",
    description:
      "How to earn 100-year domain preservation and what it means for your writing",
    excerpt:
      "Some trees outlive the people who planted them. After 12 months on Sapling tier or above, your grove earns Centennial status—your site stays online for 100 years from the day you planted it.",
    category: "help",
    section: "philosophy-vision",
    lastUpdated: "2026-01-06",
    readingTime: 6,
  },
  {
    slug: "why-some-usernames-arent-available",
    title: "Why Some Usernames Aren't Available",
    description: "How Grove protects the community through username validation",
    excerpt:
      "Every name passes through the same earth before taking root. Grove's username system quietly filters reserved terms, impersonation attempts, and harmful content. If your preferred username isn't available, here's why.",
    category: "help",
    section: "account-billing",
    lastUpdated: "2026-01-07",
    readingTime: 4,
  },
  {
    slug: "what-is-solarpunk",
    title: "What is Solarpunk?",
    description:
      "The philosophy behind Grove's approach to technology and community",
    excerpt:
      "Solarpunk is a vision of the future that's optimistic without being naive. Technology in service of people, not the other way around. Community ownership over corporate extraction. Here's what it means for Grove.",
    category: "help",
    section: "philosophy-vision",
    lastUpdated: "2026-01-07",
    readingTime: 5,
  },
  {
    slug: "what-is-loom",
    title: "What is Loom?",
    description: "The coordination layer that makes Grove fast and private",
    excerpt:
      "You don't need to understand Loom to use Grove. But if you're curious about what makes the platform work under the hood—why it's fast everywhere, why your data stays isolated—here's the story.",
    category: "help",
    section: "philosophy-vision",
    lastUpdated: "2026-01-16",
    readingTime: 4,
  },
  {
    slug: "wanderers-and-pathfinders",
    title: "Wanderers and Pathfinders",
    description:
      "Learn about Grove's community identity system - Wanderers, Rooted, Pathfinders, and the Wayfinder",
    excerpt:
      "Grove doesn't call you a 'user' or a 'member.' Those words feel transactional. Instead, we use language that reflects how people actually move through this place.",
    category: "help",
    section: "community-social",
    lastUpdated: "2026-01-15",
    readingTime: 3,
  },
];

// Legal Documents
export const legalDocs: Doc[] = [
  {
    slug: "terms-of-service",
    title: "Terms of Service",
    description: "Terms and conditions for using Grove",
    excerpt:
      "By using Grove, you agree to these terms. Please read them carefully.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 8,
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data",
    excerpt:
      "Grove is committed to protecting your privacy. We collect minimal data necessary to provide our service.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 6,
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    description: "Rules for what content and behavior is allowed on Grove",
    excerpt:
      "Grove is a platform for personal expression. This policy outlines what content is not allowed.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 5,
  },
  {
    slug: "dmca-policy",
    title: "DMCA Policy",
    description: "How to report copyright infringement on Grove",
    excerpt:
      "If you believe your copyrighted work has been used on Grove in a way that constitutes infringement, please follow these procedures.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 4,
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    description: "Our policy on refunds for paid plans",
    excerpt:
      "Grove offers refunds within 14 days of purchase if you're not satisfied with our service.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 3,
  },
  {
    slug: "data-portability-separation",
    title: "Data Portability & Account Separation Policy",
    description:
      "Your data export rights, domain ownership, and account cancellation terms",
    excerpt:
      "Your content is yours. Your domain is yours. Grove will never hold your data or domain hostage. This document outlines what happens when you cancel your subscription.",
    category: "legal",
    lastUpdated: "2026-01-16",
    readingTime: 7,
  },
];

// Architecture Patterns
export const patterns: Doc[] = [
  // Order: Prism → Loom → Threshold → Firefly → Songbird → Sentinel → Vineyard
  // (matches workshop page - the source of truth for pattern ordering)
  {
    slug: "prism-pattern",
    title: "Prism — Grove Design System",
    description: "Glassmorphism, seasonal theming, and organic UI patterns",
    excerpt:
      "Light enters plain and emerges transformed. Prism defines Grove's visual language: glassmorphism surfaces, seasonal theming, randomized forests, and the warm aesthetic that makes every page feel like a place you want to visit.",
    category: "patterns",
    icon: "triangle",
    lastUpdated: "2026-01-02",
    readingTime: 20,
  },
  {
    slug: "loom-durable-objects-pattern",
    title: "Loom — Real-Time Coordination",
    description:
      "Cloudflare Durable Objects for auth, scaling, and real-time features",
    excerpt:
      "The framework where Grove's threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.",
    category: "patterns",
    icon: "spool",
    lastUpdated: "2026-01-01",
    readingTime: 18,
  },
  {
    slug: "threshold-pattern",
    title: "Threshold — Rate Limiting & Abuse Prevention",
    description:
      "Layered rate limiting with Durable Objects for precise per-user, per-tenant, and per-endpoint limits",
    excerpt:
      "The forest has boundaries. Threshold enforces them with four-layer rate limiting: Cloudflare edge protection, tenant fairness, user abuse detection, and endpoint-specific limits. Uses Durable Objects for precision and graduated response.",
    category: "patterns",
    icon: "gauge",
    lastUpdated: "2026-01-01",
    readingTime: 15,
  },
  {
    slug: "firefly-pattern",
    title: "Firefly — Ephemeral Server Pattern",
    description:
      "On-demand infrastructure that ignites, illuminates, and fades away",
    excerpt:
      "A brief light in the darkness. Firefly defines Grove's pattern for ephemeral infrastructure—servers that spin up on demand, complete their work, and tear down automatically. Near-zero idle cost, sub-minute availability, full VM capabilities.",
    category: "patterns",
    icon: "webhook",
    lastUpdated: "2026-01-01",
    readingTime: 18,
  },
  {
    slug: "songbird-pattern",
    title: "Songbird — Prompt Injection Protection",
    description: "Three-layer defense system against prompt injection attacks",
    excerpt:
      "The Songbird Pattern is a three-layer defense against prompt injection. Canary detects poison early, Kestrel validates semantically, Robin produces safe output. Each layer costs fractions of a cent but protects all Grove AI features.",
    category: "patterns",
    icon: "bird",
    lastUpdated: "2026-01-01",
    readingTime: 12,
  },
  {
    slug: "sentinel-pattern",
    title: "Sentinel — Load Testing & Scale Validation",
    description:
      "Realistic traffic profiles and ramp-up testing for Durable Objects and D1",
    excerpt:
      "The watchful guardian who tests the forest's defenses before the storm. Sentinel doesn't just ask 'can it handle 500 users?'—it asks 'what happens to p95 latency during the ramp-up, and which Durable Object becomes the bottleneck first?'",
    category: "patterns",
    icon: "radar",
    lastUpdated: "2026-01-01",
    readingTime: 20,
  },
  {
    slug: "vineyard-spec",
    title: "Vineyard — Tool Showcase Pattern",
    description: "Consistent documentation and demo pattern for Grove tools",
    excerpt:
      "Vineyard is a documentation pattern every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it's headed. A consistent way to showcase the ecosystem.",
    category: "patterns",
    icon: "grape",
    lastUpdated: "2025-12-30",
    readingTime: 5,
  },
];

// Marketing Documents
export const marketingDocs: Doc[] = [
  {
    slug: "advertising-strategy",
    title: "Advertising & Marketing Strategy",
    description:
      "How Grove markets itself to the world — channels, messaging, and principles",
    excerpt:
      "Word of mouth is the marketing. This document outlines channels, target audiences, messaging framework, and the principles behind how Grove gets the word out.",
    category: "marketing",
    lastUpdated: "2026-01-02",
    readingTime: 8,
  },
  {
    slug: "business-card-spec",
    title: "Business Card Specification",
    description: "Print-ready design spec for Grove business cards",
    excerpt:
      "Two-sided business card with QR codes. Front links to grove.place, back links to grove.place/hello. Minimal, warm, functional.",
    category: "marketing",
    lastUpdated: "2026-01-02",
    readingTime: 5,
  },
  {
    slug: "grove-at-a-glance",
    title: "Grove at a Glance",
    description: "A 30-second overview of what Grove is and why it matters",
    excerpt:
      "A blogging platform that gives you your own corner of the internet. Your words stay yours, no algorithms, no ads.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 1,
  },
  {
    slug: "launch-email-personal",
    title: "Launch Email Template",
    description: "Direct email to waitlist members",
    excerpt:
      "Personal email template for early supporters and waitlist members announcing Grove's launch.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 2,
  },
  {
    slug: "landing-page-hero-text",
    title: "Landing Page Hero Copy",
    description: "Main headline and body copy for grove.place",
    excerpt:
      "The internet used to be a garden. Grove is a quiet corner of the web where your words can grow.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 2,
  },
  {
    slug: "hacker-news-post",
    title: "Hacker News Post",
    description: "Show HN submission draft",
    excerpt:
      "Show HN: I quit my job and built a blogging platform in a month that blocks AI crawlers.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 3,
  },
  {
    slug: "twitter-thread",
    title: "Social Media Thread",
    description: "Bluesky/Twitter/Mastodon thread template",
    excerpt:
      "Punchy, values-first social media thread for sharing Grove's launch on social platforms.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 2,
  },
  {
    slug: "video-concept-shade-demo",
    title: "Shade Demo Video Script",
    description: "Video script for demonstrating AI crawler protection",
    excerpt:
      "Most platforms are desperate for AI traffic. I built one that blocks AI crawlers/agents completely. Let me show you.",
    category: "marketing",
    lastUpdated: "2025-12-30",
    readingTime: 3,
  },
];

// Philosophy Documents
export const philosophyDocs: Doc[] = [
  {
    slug: "why-i-built-the-grove",
    title: "Why I Built the Grove",
    description:
      "The personal story behind Grove—loss, sanctuary, texture, and transformation",
    excerpt:
      "I'm building a grove for people who lost their groves. Before Grove existed, I had a backyard with a hammock and a garden. A front porch where I watched sunrises. Then I lost it all.",
    category: "philosophy",
    lastUpdated: "2026-01-16",
    readingTime: 8,
  },
  {
    slug: "grove-naming",
    title: "The Grove Naming System",
    description:
      "The complete philosophy and naming system for the Grove ecosystem",
    excerpt:
      "A forest of voices. Every user is a tree in the grove. These names aren't just branding—they're the language of an ecosystem. Each one draws from the same soil: forests, growth, shelter, connection.",
    category: "philosophy",
    lastUpdated: "2026-01-13",
    readingTime: 15,
  },
  {
    slug: "walking-through-the-grove",
    title: "Walking Through the Grove",
    description: "A naming ritual for new Grove services and features",
    excerpt:
      "Finding the right name is a walk through the forest. You create a visualization scratchpad, step into the metaphor, and let the concept find where it naturally belongs among the trees.",
    category: "philosophy",
    lastUpdated: "2026-01-12",
    readingTime: 8,
  },
  {
    slug: "grove-voice",
    title: "The Grove Voice",
    description:
      "Writing guidelines for authentic, warm, human-sounding documentation",
    excerpt:
      "Write with the warmth of a midnight tea shop and the clarity of good documentation. Avoid AI patterns, em-dashes, and hollow encouragement. Say what you mean. Earn your poetic closers.",
    category: "philosophy",
    lastUpdated: "2026-01-12",
    readingTime: 12,
  },
  {
    slug: "grove-sustainability",
    title: "Sustainability",
    description: "Grove's approach to environmental and social sustainability",
    excerpt:
      "Technology in service of people, not the other way around. Community ownership over corporate extraction. Solarpunk-aligned infrastructure that respects both users and the planet.",
    category: "philosophy",
    lastUpdated: "2026-01-12",
    readingTime: 6,
  },
  {
    slug: "grove-user-identity",
    title: "Grove User Identity System",
    description:
      "The layered identity system that describes who you are in the grove",
    excerpt:
      "Wanderer, Rooted, Pathfinder, Wayfinder. These aren't membership tiers—they describe who you are in the community. Everyone enters as a wanderer, some take root, a few become pathfinders, one tends the grove.",
    category: "philosophy",
    lastUpdated: "2026-01-15",
    readingTime: 5,
  },
];

// Design Documents
export const designDocs: Doc[] = [
  {
    slug: "grove-ui-patterns",
    title: "Grove UI Patterns",
    description:
      "Glassmorphism, seasonal themes, and the visual language of Grove",
    excerpt:
      "Warm, nature-themed UI with glass surfaces, seasonal color palettes, randomized forests, and accessible design patterns. Every page should feel like a place you want to visit.",
    category: "design",
    lastUpdated: "2026-01-12",
    readingTime: 18,
  },
  {
    slug: "grove-product-standards",
    title: "Product Standards",
    description: "Design principles and product philosophy for Grove",
    excerpt:
      "Grove is intentionally focused. We don't add features for the sake of features. Every addition must serve the core mission: helping people own their words online.",
    category: "design",
    lastUpdated: "2026-01-12",
    readingTime: 10,
  },
  {
    slug: "icon-standards",
    title: "Icon Standards",
    description: "Comprehensive guide to icon usage and composition in Grove",
    excerpt:
      "Icons are visual shorthand. Grove uses Lucide icons with specific conventions for size, color, composition, and meaning. Consistency across the ecosystem.",
    category: "design",
    lastUpdated: "2026-01-12",
    readingTime: 12,
  },
  {
    slug: "COMPONENT-REFERENCE",
    title: "Component Reference",
    description: "Complete catalog of Grove's 185 UI components",
    excerpt:
      "Your field guide to Grove's component library. 185 components across 13 categories—from Glass surfaces to nature elements—each designed to feel warm, organic, and genuinely helpful.",
    category: "design",
    lastUpdated: "2026-01-18",
    readingTime: 18,
  },
  {
    slug: "DARK-MODE-GUIDE",
    title: "Dark Mode Guide",
    description: "Nature at night—dark mode philosophy and implementation",
    excerpt:
      "Dark mode in Grove isn't just inverted colors. It's nature at night: warm bark browns, cream highlights, maintained contrast, and preserved glassmorphism. A forest at twilight.",
    category: "design",
    lastUpdated: "2026-01-18",
    readingTime: 7,
  },
  {
    slug: "COLORS",
    title: "Color System",
    description: "Grove's nature-inspired color palette and semantic tokens",
    excerpt:
      "Colors that evoke a forest clearing: Grove greens for growth, cream neutrals like natural paper, bark browns that avoid harsh blacks. Complete palette with semantic tokens.",
    category: "design",
    lastUpdated: "2026-01-18",
    readingTime: 5,
  },
  {
    slug: "SPACING-SYSTEM",
    title: "Spacing System",
    description: "4px base unit system and component spacing patterns",
    excerpt:
      "Consistent spacing creates visual rhythm. Grove uses a 4px base unit with organic variations for nature elements. Spacing conventions for cards, sections, forms, and responsive layouts.",
    category: "design",
    lastUpdated: "2026-01-18",
    readingTime: 7,
  },
  {
    slug: "ANIMATION-GUIDE",
    title: "Animation Guide",
    description: "Subtle animations that create a living world",
    excerpt:
      "Alive but not distracting. 16+ animations from gentle fades to leaf swaying, all respecting prefers-reduced-motion. Organic timing inspired by nature, never flashy.",
    category: "design",
    lastUpdated: "2026-01-18",
    readingTime: 9,
  },
];

// Developer Documents
export const developerDocs: Doc[] = [
  {
    slug: "multi-tenant-architecture",
    title: "Multi-Tenant Architecture",
    description:
      "How Grove handles multiple blogs on subdomains with shared infrastructure",
    excerpt:
      "Each user gets their own subdomain (username.grove.place) while sharing underlying infrastructure. Tenant isolation, data separation, and efficient resource sharing.",
    category: "developer",
    lastUpdated: "2026-01-12",
    readingTime: 15,
  },
  {
    slug: "ai-gateway-integration",
    title: "AI Gateway Integration",
    description:
      "Cloudflare AI Gateway for per-tenant AI quotas and observability",
    excerpt:
      "Grove uses Cloudflare AI Gateway to manage AI features across tenants. Per-user quotas, request logging, cost tracking, and graceful degradation when limits are reached.",
    category: "developer",
    lastUpdated: "2026-01-12",
    readingTime: 20,
  },
  {
    slug: "cloudflare-infrastructure",
    title: "Cloudflare Infrastructure",
    description: "Complete guide to Grove's Cloudflare-first architecture",
    excerpt:
      "Workers for compute, D1 for databases, KV for caching, R2 for storage. How Grove builds on Cloudflare's edge infrastructure for global performance and cost efficiency.",
    category: "developer",
    lastUpdated: "2026-01-12",
    readingTime: 25,
  },
  {
    slug: "ai-development-process",
    title: "Building with AI: The Grove Development Process",
    description:
      "How Grove was built in 50 days using Claude Code, Kilo Code, and AI-assisted development",
    excerpt:
      "The complete workflow behind building Grove at speed. How to structure context, work across CLI and web interfaces, maintain quality while moving fast, and think alongside AI instead of just prompting it.",
    category: "developer",
    lastUpdated: "2026-01-12",
    readingTime: 0, // Coming soon
  },
];

// Combined export for convenience
export const allDocs = [
  ...specs,
  ...helpArticles,
  ...legalDocs,
  ...marketingDocs,
  ...patterns,
  ...philosophyDocs,
  ...designDocs,
  ...developerDocs,
];
