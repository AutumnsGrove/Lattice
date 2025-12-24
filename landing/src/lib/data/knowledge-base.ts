import type { Doc } from "$lib/types/docs";

// Re-export for convenience
export type { Doc } from "$lib/types/docs";

// Technical Specifications
export const specs: Doc[] = [
  {
    slug: "CONTENT-MODERATION",
    title: "Automated Content Moderation System",
    description:
      "Privacy-first automated content moderation using AI models with zero data retention",
    excerpt:
      "Grove uses automated content moderation to enforce our Acceptable Use Policy while maintaining strict privacy protections. This system is designed with a privacy-first architecture: no human eyes on user data, no retention of content, and fully encrypted processing.",
    category: "specs",
    lastUpdated: "2025-12-11",
    readingTime: 15,
  },
  {
    slug: "analytics-spec",
    title: "Analytics Specification",
    description: "Privacy-respecting analytics system for Grove platform",
    excerpt:
      "Grove Analytics provides insights into blog performance while respecting user privacy. No personal data is collected, and all metrics are aggregated and anonymized.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "comments-spec",
    title: "Comments System Specification",
    description:
      "Dual-mode comment system with private replies and public comments",
    excerpt:
      "Grove implements a custom comment system with two modes: Replies (private messages to authors) and Comments (public, requiring approval).",
    category: "specs",
    lastUpdated: "2025-12-05",
    readingTime: 10,
  },
  {
    slug: "engine-spec",
    title: "GroveEngine Technical Specification",
    description: "Core engine architecture and implementation details",
    excerpt:
      "GroveEngine is the core framework powering the Grove ecosystem. Built on Cloudflare Workers with SvelteKit frontend.",
    category: "specs",
    lastUpdated: "2025-11-15",
    readingTime: 12,
  },
  {
    slug: "help-center-spec",
    title: "Help Center Specification",
    description: "Integrated help system with contextual assistance",
    excerpt:
      "Grove's Help Center is built directly into the platform—no external docs site, no separate logins.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 11,
  },
  {
    slug: "social-spec",
    title: "Social Features Specification",
    description: "Community feed, sharing, voting, and reactions system",
    excerpt:
      "Grove Social enables blogs to share posts to a community feed where users can vote and react with emojis.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 9,
  },
  {
    slug: "tenant-onboarding-spec",
    title: "Tenant Onboarding Specification",
    description: "Multi-step onboarding flow for new Grove users",
    excerpt:
      "Comprehensive onboarding system guiding users through account creation, plan selection, payment, and initial setup.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 7,
  },
  {
    slug: "theme-system-spec",
    title: "Theme System Specification",
    description: "Customizable themes and visual customization options",
    excerpt:
      "Grove offers 10 hand-curated themes with tiered access based on subscription plans.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 8,
  },
  {
    slug: "status-page-spec",
    title: "Status Page Specification",
    description: "Public-facing status page for platform health and incident communication",
    excerpt:
      "The Grove Status page provides transparent, real-time communication about platform health. When something goes wrong—or when maintenance is planned—users can check status.grove.place.",
    category: "specs",
    lastUpdated: "2025-12-24",
    readingTime: 12,
  },
  {
    slug: "admin-panel-spec",
    title: "Admin Panel Specification",
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
    slug: "renovate-spec",
    title: "Renovate Configuration Specification",
    description: "Automated dependency updates for Grove repositories",
    excerpt:
      "Renovate Bot automatically monitors dependencies and opens pull requests when updates are available, ensuring security patches are applied quickly.",
    category: "specs",
    lastUpdated: "2025-11-26",
    readingTime: 5,
  },
  {
    slug: "versioning-spec",
    title: "Versioning Specification",
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
    slug: "foliage-project-spec",
    title: "Foliage — Theme System Project",
    description: "Extracted theme system package specification",
    excerpt:
      "Foliage is Grove's theme system—providing visual customization from simple accent colors to full theme customizers. It enables MySpace-level personalization with modern design sensibilities.",
    category: "specs",
    lastUpdated: "2025-12-01",
    readingTime: 12,
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
];

// Combined export for convenience
export const allDocs = [...specs, ...helpArticles, ...legalDocs];
