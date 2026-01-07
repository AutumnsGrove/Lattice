import type { Doc } from "$lib/types/docs";

// Re-export for convenience
export type { Doc } from "$lib/types/docs";

// Technical Specifications
export const specs: Doc[] = [
  {
    slug: "centennial-spec",
    title: "Centennial — Domain Preservation",
    description: "100-year domain preservation for long-term Grove members",
    excerpt:
      "Some trees outlive the people who planted them. Centennial is Grove's promise that your words can have that same longevity. After 12 months on Sapling tier or above, your grove earns Centennial status—your site stays online for 100 years from the day you planted it.",
    category: "specs",
    lastUpdated: "2026-01-04",
    readingTime: 8,
  },
  {
    slug: "thorn-spec",
    title: "Thorn — Content Moderation",
    description:
      "Privacy-first automated content moderation using AI models with zero data retention, protected by Songbird pattern",
    excerpt:
      "Grove uses automated content moderation to enforce our Acceptable Use Policy while maintaining strict privacy protections. This system is designed with a privacy-first architecture: no human eyes on user data, no retention of content, and fully encrypted processing. Uses the Songbird pattern (Canary → Kestrel → Robin) for prompt injection protection.",
    category: "specs",
    lastUpdated: "2026-01-01",
    readingTime: 18,
  },
  {
    slug: "rings-spec",
    title: "Rings — Private Analytics",
    description: "Privacy-respecting analytics system for Grove platform",
    excerpt:
      "Grove Analytics provides insights into blog performance while respecting user privacy. No personal data is collected, and all metrics are aggregated and anonymized.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "reeds-spec",
    title: "Reeds — Comment System",
    description:
      "Dual-mode comment system with private replies and public comments",
    excerpt:
      "Grove implements a custom comment system with two modes: Replies (private messages to authors) and Comments (public, requiring approval).",
    category: "specs",
    lastUpdated: "2025-12-05",
    readingTime: 10,
  },
  {
    slug: "lattice-spec",
    title: "Lattice — Core Framework",
    description: "Core engine architecture and implementation details",
    excerpt:
      "GroveEngine is the core framework powering the Grove ecosystem. Built on Cloudflare Workers with SvelteKit frontend.",
    category: "specs",
    lastUpdated: "2025-11-15",
    readingTime: 12,
  },
  {
    slug: "waystone-spec",
    title: "Waystone — Help Center",
    description: "Integrated help system with contextual assistance",
    excerpt:
      "Grove's Help Center is built directly into the platform—no external docs site, no separate logins.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 11,
  },
  {
    slug: "meadow-spec",
    title: "Meadow — Social Feed",
    description: "Community feed, sharing, voting, and reactions system",
    excerpt:
      "Grove Social enables blogs to share posts to a community feed where users can vote and react with emojis.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 9,
  },
  {
    slug: "plant-spec",
    title: "Plant — Tenant Onboarding",
    description: "Multi-step onboarding flow for new Grove users",
    excerpt:
      "Comprehensive onboarding system guiding users through account creation, plan selection, payment, and initial setup.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 7,
  },
  {
    slug: "foliage-project-spec",
    title: "Foliage — Theme System",
    description: "Customizable themes and visual customization options",
    excerpt:
      "Grove offers 10 hand-curated themes with tiered access based on subscription plans.",
    category: "specs",
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
    lastUpdated: "2026-01-05",
    readingTime: 15,
  },
  {
    slug: "weave-spec",
    title: "Weave — Visual Composition Studio",
    description:
      "Node-graph editor for animations and diagrams within Terrarium",
    excerpt:
      "Weave your world together. Place elements on a grid, draw threads between them, watch relationships come alive. Create animations where chained vines ripple when shaken. Build diagrams with glass cards and Lucide icons. A lightweight Mermaid alternative with Grove's aesthetic.",
    category: "specs",
    lastUpdated: "2026-01-06",
    readingTime: 12,
  },
  {
    slug: "clearing-spec",
    title: "Clearing — Status Page",
    description:
      "Public-facing status page for platform health and incident communication",
    excerpt:
      "The Grove Status page provides transparent, real-time communication about platform health. When something goes wrong—or when maintenance is planned—users can check status.grove.place.",
    category: "specs",
    lastUpdated: "2025-12-24",
    readingTime: 12,
  },
  {
    slug: "arbor-spec",
    title: "Arbor — Admin Panel",
    description: "Content management and site administration interface",
    excerpt:
      "The Grove Admin Panel is where bloggers manage their content, customize their site, and configure settings. Designed to be simple, focused, and get out of the way.",
    category: "specs",
    lastUpdated: "2025-12-24",
    readingTime: 10,
  },
  {
    slug: "customer-repo-spec",
    title: "Customer Repository Specification",
    description: "Template structure for customer blog repositories",
    excerpt:
      "Each customer has their own repository that imports @groveengine/core as a dependency. This single-tenant model provides isolation, customization, and independence.",
    category: "specs",
    lastUpdated: "2025-11-26",
    readingTime: 6,
  },
  {
    slug: "seasons-spec",
    title: "Seasons — Versioning System",
    description: "Semantic versioning strategy and release workflow",
    excerpt:
      "GroveEngine follows Semantic Versioning 2.0.0 for all releases. This document defines how versions are managed and how updates propagate to customer repositories.",
    category: "specs",
    lastUpdated: "2025-11-26",
    readingTime: 7,
  },
  {
    slug: "website-spec",
    title: "Grove Website Specification",
    description: "Marketing site and client management platform",
    excerpt:
      "Grove Website is the main marketing site and client management platform. It handles marketing, client acquisition, onboarding, billing, and provides a dashboard for clients to manage their blogs.",
    category: "specs",
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
    lastUpdated: "2025-12-01",
    readingTime: 12,
  },
  {
    slug: "shade-spec",
    title: "Shade — AI Content Protection System",
    description: "Layered defense against AI crawlers and scrapers",
    excerpt:
      "Users own their words. Shade is Grove's seven-layer defense system against AI crawlers, scrapers, and automated data harvesting—protection that works in the background so writers can focus on writing.",
    category: "specs",
    lastUpdated: "2025-12-26",
    readingTime: 18,
  },
  {
    slug: "bloom-spec",
    title: "Bloom — Remote Coding Infrastructure",
    description: "Serverless autonomous coding agent on transient VPS",
    excerpt:
      "Bloom is a personal, serverless remote coding agent. Text it and forget it—send a task from your phone, the agent works until done, commits code, and the infrastructure self-destructs.",
    category: "specs",
    lastUpdated: "2025-12-30",
    readingTime: 23,
  },
  {
    slug: "mycelium-spec",
    title: "Mycelium — MCP Server",
    description: "Model Context Protocol server for Grove ecosystem",
    excerpt:
      "Mycelium is Grove's Model Context Protocol (MCP) server—the wood wide web that lets AI agents interact with the entire Grove ecosystem. Claude talks to Grove through Mycelium.",
    category: "specs",
    lastUpdated: "2025-12-30",
    readingTime: 15,
  },
  {
    slug: "patina-spec",
    title: "Patina — Automated Backup System",
    description:
      "Nightly database backups with weekly archives and 12-week retention",
    excerpt:
      "A patina forms on copper over time—not decay, but protection. Patina runs nightly automated backups of every Grove database to cold storage. Weekly archives compress the daily layers, and twelve weeks of history remain quietly preserved. Age as armor.",
    category: "specs",
    lastUpdated: "2025-12-31",
    readingTime: 25,
  },
  {
    slug: "trails-spec",
    title: "Trails — Personal Roadmaps",
    description: "Build in public with beautiful project roadmaps",
    excerpt:
      "Trails lets Grove users create and share personal roadmaps. Build in public, plan content, and track progress with a beautiful way to show the journey.",
    category: "specs",
    lastUpdated: "2025-12-29",
    readingTime: 6,
  },
  {
    slug: "vineyard-spec",
    title: "Vineyard — Tool Showcase Pattern",
    description: "Consistent documentation and demo pattern for Grove tools",
    excerpt:
      "Vineyard is a documentation and demo pattern that every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it's headed.",
    category: "specs",
    lastUpdated: "2025-12-30",
    readingTime: 5,
  },
  {
    slug: "wisp-spec",
    title: "Wisp — Writing Assistant",
    description: "Ethical AI writing tool that polishes without replacing",
    excerpt:
      "Wisp is an ethical AI writing assistant that helps users polish their voice without replacing it. It analyzes content for grammar, tone, and readability—never generates or expands content.",
    category: "specs",
    lastUpdated: "2025-12-30",
    readingTime: 6,
  },
  // Completed Specs (implemented or superseded)
  {
    slug: "amber-spec",
    title: "Amber — Storage Management",
    description: "Unified storage management system for Grove",
    excerpt:
      "Amber is Grove's unified storage management system. Every file you upload—blog images, email attachments, profile pictures—is preserved in Amber, organized and accessible from one place.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 10,
  },
  {
    slug: "fiction-house-publishing-spec",
    title: "Fiction House Publishing",
    description: "Project specification for the first Grove customer site",
    excerpt:
      "Fiction House Publishing is a publishing house portfolio site—the first customer deployment of GroveEngine with custom book catalog features.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "ivy-mail-spec",
    title: "Ivy — Mail Client",
    description: "First-party mail client for @grove.place email addresses",
    excerpt:
      "Ivy is Grove's first-party mail client for @grove.place email addresses. Rather than forcing users to configure IMAP in third-party clients, Ivy provides a focused, privacy-first web interface.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 15,
  },
  {
    slug: "loam-spec",
    title: "Loam — Name Protection",
    description: "Username and domain validation system protecting the grove from harm",
    excerpt:
      "Loam is Grove's username and domain validation system. Every name passes through it before taking root: reserved words, impersonation attempts, harmful content, fraud patterns. Good soil doesn't announce itself. It just quietly ensures that what grows here belongs here.",
    category: "specs",
    lastUpdated: "2026-01-07",
    readingTime: 12,
  },
  {
    slug: "press-spec",
    title: "Press — Image Processing CLI",
    description: "CLI tool for WebP conversion, AI descriptions, and CDN upload",
    excerpt:
      "A press takes something raw and makes it ready. Press is Grove's image processing CLI: convert to WebP, generate AI descriptions for accessibility, deduplicate by content hash, and upload to R2. One command, and your images are ready to publish.",
    category: "specs",
    lastUpdated: "2026-01-06",
    readingTime: 10,
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
    lastUpdated: "2025-12-01",
    readingTime: 3,
  },
  {
    slug: "writing-your-first-post",
    title: "Writing Your First Post",
    description: "Learn how to write and publish your first blog post on Grove",
    excerpt:
      "Welcome! Let's get your first post published. From your admin panel, click New Post in the sidebar.",
    category: "help",
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
    lastUpdated: "2026-01-06",
    readingTime: 6,
  },
  {
    slug: "why-some-usernames-arent-available",
    title: "Why Some Usernames Aren't Available",
    description:
      "How Grove protects the community through username validation",
    excerpt:
      "Every name passes through the same earth before taking root. Grove's username system quietly filters reserved terms, impersonation attempts, and harmful content. If your preferred username isn't available, here's why.",
    category: "help",
    lastUpdated: "2026-01-07",
    readingTime: 4,
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
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "How we collect, use, and protect your data",
    excerpt:
      "Grove is committed to protecting your privacy. We collect minimal data necessary to provide our service.",
    category: "legal",
    lastUpdated: "2025-12-01",
    readingTime: 6,
  },
  {
    slug: "acceptable-use-policy",
    title: "Acceptable Use Policy",
    description: "Rules for what content and behavior is allowed on Grove",
    excerpt:
      "Grove is a platform for personal expression. This policy outlines what content is not allowed.",
    category: "legal",
    lastUpdated: "2025-12-01",
    readingTime: 5,
  },
  {
    slug: "dmca-policy",
    title: "DMCA Policy",
    description: "How to report copyright infringement on Grove",
    excerpt:
      "If you believe your copyrighted work has been used on Grove in a way that constitutes infringement, please follow these procedures.",
    category: "legal",
    lastUpdated: "2025-12-01",
    readingTime: 4,
  },
  {
    slug: "refund-policy",
    title: "Refund Policy",
    description: "Our policy on refunds for paid plans",
    excerpt:
      "Grove offers refunds within 14 days of purchase if you're not satisfied with our service.",
    category: "legal",
    lastUpdated: "2025-12-01",
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
    lastUpdated: "2025-12-01",
    readingTime: 7,
  },
];

// Architecture Patterns
export const patterns: Doc[] = [
  {
    slug: "prism-pattern",
    title: "Prism — Grove Design System",
    description: "Glassmorphism, seasonal theming, and organic UI patterns",
    excerpt:
      "Light enters plain and emerges transformed. Prism defines Grove's visual language: glassmorphism surfaces, seasonal theming, randomized forests, and the warm aesthetic that makes every page feel like a place you want to visit.",
    category: "patterns",
    lastUpdated: "2026-01-02",
    readingTime: 20,
  },
  {
    slug: "songbird-pattern",
    title: "Songbird — Prompt Injection Protection",
    description: "Three-layer defense system against prompt injection attacks",
    excerpt:
      "The Songbird Pattern is a three-layer defense against prompt injection. Canary detects poison early, Kestrel validates semantically, Robin produces safe output. Each layer costs fractions of a cent but protects all Grove AI features.",
    category: "patterns",
    lastUpdated: "2026-01-01",
    readingTime: 12,
  },
  {
    slug: "loom-durable-objects-pattern",
    title: "Loom — Real-Time Coordination",
    description:
      "Cloudflare Durable Objects for auth, scaling, and real-time features",
    excerpt:
      "The framework where Grove's threads come together. Loom coordinates auth, state, and real-time features using Cloudflare Durable Objects—the invisible structure that makes everything feel seamless.",
    category: "patterns",
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
    lastUpdated: "2026-01-01",
    readingTime: 15,
  },
  {
    slug: "vineyard-spec",
    title: "Vineyard — Tool Showcase Pattern",
    description: "Consistent documentation and demo pattern for Grove tools",
    excerpt:
      "Vineyard is a documentation pattern every Grove tool implements. Visit toolname.grove.place/vineyard to explore what each tool does, how it works, and where it's headed. A consistent way to showcase the ecosystem.",
    category: "patterns",
    lastUpdated: "2025-12-30",
    readingTime: 5,
  },
  {
    slug: "sentinel-pattern",
    title: "Sentinel — Load Testing & Scale Validation",
    description:
      "Realistic traffic profiles and ramp-up testing for Durable Objects and D1",
    excerpt:
      "The watchful guardian who tests the forest's defenses before the storm. Sentinel doesn't just ask 'can it handle 500 users?'—it asks 'what happens to p95 latency during the ramp-up, and which Durable Object becomes the bottleneck first?'",
    category: "patterns",
    lastUpdated: "2026-01-01",
    readingTime: 20,
  },
  {
    slug: "firefly-pattern",
    title: "Firefly — Ephemeral Server Pattern",
    description:
      "On-demand infrastructure that ignites, illuminates, and fades away",
    excerpt:
      "A brief light in the darkness. Firefly defines Grove's pattern for ephemeral infrastructure—servers that spin up on demand, complete their work, and tear down automatically. Near-zero idle cost, sub-minute availability, full VM capabilities.",
    category: "patterns",
    lastUpdated: "2026-01-01",
    readingTime: 18,
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

// Combined export for convenience
export const allDocs = [
  ...specs,
  ...helpArticles,
  ...legalDocs,
  ...marketingDocs,
  ...patterns,
];
