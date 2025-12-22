// Static data for knowledge base - pre-processed from markdown files
export interface Doc {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category: "specs" | "help" | "legal";
  lastUpdated?: string;
  readingTime: number;
}

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
