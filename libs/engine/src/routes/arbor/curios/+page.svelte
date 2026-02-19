<script lang="ts">
  import { GlassCard, GlassButton, Badge, Waystone, GroveTerm, GroveSwap, GroveIntro } from "$lib/ui/components/ui";
  import { Calendar, Sparkles, GitBranch, Construction, Image, Warehouse, BookOpen, Hash, Shield, Activity, Link, Music, BarChart3, Globe, Wand2, MousePointer, Circle, Rss, Award, Volume2, BookMarked, Heart, Sticker, Upload } from "lucide-svelte";

  // Available curios with their status
  const curios = [
    {
      id: "guestbook",
      name: "Guestbook",
      description: "Let visitors sign your guestbook — the classic personal web element",
      icon: BookOpen,
      status: "available",
      href: "/arbor/curios/guestbook",
      features: [
        "Visitor signatures",
        "4 display styles",
        "Moderation queue",
        "Emoji support"
      ]
    },
    {
      id: "hitcounter",
      name: "Hit Counter",
      description: "Nostalgic page view counter with grove-ified styles — frosted glass, brass odometer, LCD, or minimal",
      icon: Hash,
      status: "available",
      href: "/arbor/curios/hitcounter",
      features: [
        "4 grove-ified styles",
        "Daily visitor dedup",
        "Label presets + custom",
        "Dark mode + animations"
      ]
    },
    {
      id: "statusbadge",
      name: "Status Badges",
      description: "Small, expressive badges that signal the state of your site",
      icon: Shield,
      status: "available",
      href: "/arbor/curios/statusbadge",
      features: [
        "9 badge types",
        "Auto-detected badges",
        "CSS animations",
        "Configurable position"
      ]
    },
    {
      id: "activitystatus",
      name: "Activity Status",
      description: "A customizable status indicator — let visitors know you're here",
      icon: Activity,
      status: "available",
      href: "/arbor/curios/activitystatus",
      features: [
        "15 quick presets",
        "Custom text + emoji",
        "Auto-expiration",
        "One-line display"
      ]
    },
    {
      id: "linkgarden",
      name: "Link Gardens",
      description: "Curated link collections — blogroll, friends list, cool sites",
      icon: Link,
      status: "available",
      href: "/arbor/curios/linkgarden",
      features: [
        "4 display styles",
        "Auto-favicons",
        "Category grouping",
        "88x31 button wall"
      ]
    },
    {
      id: "nowplaying",
      name: "Now Playing",
      description: "Share what you're listening to — music fills the grove",
      icon: Music,
      status: "available",
      href: "/arbor/curios/nowplaying",
      features: [
        "Manual + Spotify + Last.fm",
        "4 display styles",
        "Album art display",
        "Listening history"
      ]
    },
    {
      id: "polls",
      name: "Polls",
      description: "Run interactive polls on your site — quick votes, live results",
      icon: BarChart3,
      status: "available",
      href: "/arbor/curios/polls",
      features: [
        "Single & multiple choice",
        "Results visibility control",
        "Pin to homepage",
        "Auto-close dates"
      ]
    },
    {
      id: "webring",
      name: "Webring Hub",
      description: "Join webrings and connect your site to the wider indie web",
      icon: Globe,
      status: "available",
      href: "/arbor/curios/webring",
      features: [
        "Multiple ring memberships",
        "4 display styles",
        "Classic navigation bar",
        "Configurable position"
      ]
    },
    {
      id: "artifacts",
      name: "Weird Artifacts",
      description: "Interactive chaos objects — Magic 8-Ball, fortune cookies, dice rollers",
      icon: Wand2,
      status: "available",
      href: "/arbor/curios/artifacts",
      features: [
        "8 artifact types",
        "Daily fortunes & draws",
        "Marquee text",
        "Configurable placement"
      ]
    },
    {
      id: "cursors",
      name: "Custom Cursors",
      description: "Replace the default pointer with something that matches your vibe",
      icon: MousePointer,
      status: "available",
      href: "/arbor/curios/cursors",
      features: [
        "13 cursor presets",
        "Trail effects",
        "Nature & seasonal themes",
        "Reduced motion aware"
      ]
    },
    {
      id: "moodring",
      name: "Mood Ring",
      description: "A visual mood indicator that changes color throughout the day",
      icon: Circle,
      status: "available",
      href: "/arbor/curios/moodring",
      features: [
        "4 color modes",
        "Ring, Gem, Orb styles",
        "Mood logging timeline",
        "Seasonal integration"
      ]
    },
    {
      id: "blogroll",
      name: "Blogroll",
      description: "The blogs you love, the voices you return to — curated recommendations",
      icon: Rss,
      status: "available",
      href: "/arbor/curios/blogroll",
      features: [
        "Auto-favicons",
        "RSS feed tracking",
        "Latest post display",
        "Blog descriptions"
      ]
    },
    {
      id: "badges",
      name: "Badges",
      description: "Collectible achievements celebrating your milestones and journey",
      icon: Award,
      status: "available",
      href: "/arbor/curios/badges",
      features: [
        "12 system badges",
        "Auto-award detection",
        "Showcase display",
        "Custom badges (Oak+)"
      ]
    },
    {
      id: "ambient",
      name: "Ambient Sounds",
      description: "Optional background audio — forest rain, morning birds, or lo-fi vibes",
      icon: Volume2,
      status: "available",
      href: "/arbor/curios/ambient",
      features: [
        "7 curated sound sets",
        "Volume persistence",
        "Seamless looping",
        "Custom uploads (Oak+)"
      ]
    },
    {
      id: "bookmarkshelf",
      name: "Bookmark Shelf",
      description: "A visual bookshelf for your reading list — organized by shelf and category",
      icon: BookMarked,
      status: "available",
      href: "/arbor/curios/bookmarkshelf",
      features: [
        "Multiple shelves",
        "Currently Reading section",
        "Favorites highlighting",
        "Category color-coding"
      ]
    },
    {
      id: "shrines",
      name: "Personal Shrines",
      description: "Sacred spaces for things you love — memories, fandoms, gratitude",
      icon: Heart,
      status: "available",
      href: "/arbor/curios/shrines",
      features: [
        "6 shrine types",
        "6 frame styles",
        "Published/draft states",
        "Positioned content items"
      ]
    },
    {
      id: "clipart",
      name: "Clip Art Library",
      description: "Decorative overlays — borders, critters, sparkles dropped onto any page",
      icon: Sticker,
      status: "available",
      href: "/arbor/curios/clipart",
      features: [
        "5 asset categories",
        "Per-page placements",
        "Scale, rotation, z-index",
        "Reduced motion aware"
      ]
    },
    {
      id: "customuploads",
      name: "Custom Uploads",
      description: "Upload and manage images used across all your curios",
      icon: Upload,
      status: "available",
      href: "/arbor/curios/customuploads",
      features: [
        "Auto-resize & thumbnails",
        "WebP conversion",
        "Quota management",
        "Usage tracking"
      ]
    },
    {
      id: "gallery",
      name: "Gallery",
      description: "Beautiful image galleries with tags, collections, and lightbox viewing",
      icon: Image,
      status: "available",
      href: "/arbor/curios/gallery",
      features: [
        "Amber storage",
        "Tags and collections",
        "Lightbox viewer",
        "Masonry layout"
      ]
    },
    {
      id: "timeline",
      name: "Timeline",
      description: "AI-powered daily summaries of your GitHub activity",
      icon: Calendar,
      status: "greenhouse",
      href: "/arbor/curios/timeline",
      features: [
        "Daily commit summaries",
        "5 voice presets + custom",
        "Activity heatmap",
        "Gutter comments"
      ]
    },
    {
      id: "journey",
      name: "Journey",
      description: "Visualize your repo's growth with line-based metrics and beautiful charts",
      icon: GitBranch,
      status: "greenhouse",
      href: "/arbor/curios/journey",
      features: [
        "Version milestones",
        "Code composition",
        "Growth timeline",
        "AI release notes"
      ]
    },
    {
      id: "pulse",
      name: "Pulse",
      description: "Live development heartbeat — real-time activity from your GitHub repos",
      icon: Activity,
      status: "greenhouse",
      href: "/arbor/curios/pulse",
      features: [
        "Real-time webhooks",
        "Activity heatmap",
        "Event feed with filters",
        "Trend sparklines"
      ]
    }
  ];
</script>

<svelte:head>
  <title>Curios - Admin</title>
</svelte:head>

<div class="curios-page">
  <header class="page-header">
    <div class="header-content">
      <div class="title-row">
        <Sparkles class="header-icon" />
        <h1><GroveTerm term="curios">Curios</GroveTerm></h1>
        <Waystone slug="what-are-curios" label="Learn about Curios" />
      </div>
      <GroveIntro term="curios" />
      <p class="subtitle">
        Fun, delightful tools that make your site feel alive.
        Developer <GroveSwap term="curios">curios</GroveSwap> help you showcase your work in unique ways.
      </p>
    </div>
  </header>

  <div class="curios-grid">
    {#each curios as curio}
      <GlassCard class="curio-card {curio.status === 'coming-soon' ? 'coming-soon' : ''}">
        <div class="curio-header">
          <div class="curio-icon">
            <svelte:component this={curio.icon} />
          </div>
          <div class="curio-title-row">
            <h2>{curio.name}</h2>
            {#if curio.status === "coming-soon"}
              <Badge variant="secondary">
                <Construction class="badge-icon" />
                Coming Soon
              </Badge>
            {:else if curio.status === "greenhouse"}
              <Badge variant="default" class="greenhouse-badge">
                <Warehouse class="badge-icon" />
                Greenhouse
              </Badge>
            {:else}
              <Badge variant="default">Available</Badge>
            {/if}
          </div>
        </div>

        <p class="curio-description">{curio.description}</p>

        <ul class="feature-list">
          {#each curio.features as feature}
            <li>{feature}</li>
          {/each}
        </ul>

        <div class="curio-actions">
          {#if curio.href}
            <GlassButton href={curio.href} variant="accent">
              Configure
            </GlassButton>
          {:else}
            <GlassButton disabled variant="ghost">
              Coming Soon
            </GlassButton>
          {/if}
        </div>
      </GlassCard>
    {/each}
  </div>
</div>

<style>
  .curios-page {
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  :global(.header-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 600px;
  }

  .curios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  :global(.curio-card) {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  :global(.curio-card.coming-soon) {
    opacity: 0.7;
  }

  .curio-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .curio-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--grove-overlay-8);
    border-radius: var(--border-radius-standard);
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .curio-icon :global(svg) {
    width: 1.5rem;
    height: 1.5rem;
  }

  .curio-title-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .curio-title-row h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  :global(.badge-icon) {
    width: 0.875rem;
    height: 0.875rem;
    margin-right: 0.25rem;
  }

  :global(.greenhouse-badge) {
    background-color: rgb(209 250 229) !important; /* emerald-100 */
    color: rgb(5 150 105) !important; /* emerald-600 */
  }

  :global(.dark .greenhouse-badge) {
    background-color: rgb(6 78 59 / 0.2) !important; /* emerald-900/20 */
    color: rgb(52 211 153) !important; /* emerald-400 */
  }

  .curio-description {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem 0;
    flex: 1;
  }

  .feature-list li {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
  }

  .feature-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--color-primary);
    font-size: 0.75rem;
  }

  .curio-actions {
    margin-top: auto;
  }

  @media (max-width: 640px) {
    .curios-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
