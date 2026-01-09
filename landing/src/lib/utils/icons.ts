/**
 * Centralized icon registry for Grove landing.
 * Single source of truth for all icon usage.
 *
 * ✅ DO: Import icons from here in components
 * ❌ DON'T: Import directly from 'lucide-svelte'
 *
 * @example
 * ```svelte
 * import { featureIcons, phaseIcons } from '$lib/utils/icons';
 *
 * <svelte:component this={featureIcons.mail} class="w-5 h-5" />
 * ```
 */

// Lab icons - experimental icons from @lucide/lab wrapped as Svelte components
import BeeIcon from '$lib/components/icons/BeeIcon.svelte';

import {
  // Navigation
  Home,
  Info,
  Telescope,
  MapPin,
  HandCoins,
  BookOpen,
  Trees,
  PenLine,
  // Features
  Mail,
  HardDrive,
  Palette,
  ShieldCheck,
  Cloud,
  SearchCode,
  Archive,
  Upload,
  MessagesSquare,
  ExternalLink,
  Github,
  // Content
  FileText,
  Tag,
  Sprout,
  Heart,
  Leaf,
  Flower2,
  // States
  Check,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Info as InfoIcon,
  // Phases & Dreams
  Gem,
  Sparkles,
  Star,
  Moon,
  Sun,
  // Actions
  Compass,
  Megaphone,
  Lightbulb,
  Download,
  Settings,
  Menu,
  // Growth indicators
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  Users,
  ShieldUser,
  BarChart3,
  Circle,
  // Midnight Bloom specific
  Coffee,
  QrCode,
  // Beyond page icons
  Music,
  Newspaper,
  // Pricing page icons
  Globe,
  MessageCircle,
  CalendarDays,
  TreeDeciduous,
  Crown,
  LifeBuoy,
  // Workshop/Tool specific icons
  Pickaxe,
  Codesandbox,
  Webhook,
  Spool,
  CircuitBoard,
  Binoculars,
  LandPlot,
  Projector,
  Mailbox,
  MapPinPlus,
  UserRoundCheck,
  BrickWall,
  LayoutDashboard,
  Wind,
  Grape,
  Gauge,
  Radar,
  Layers,
  PencilRuler,
  SwatchBook,
  Bird,
  Triangle,
  Terminal,
  Signpost,
  Database,
  Zap,
  Store,
  Stamp,
  SplinePointer,
  Waves,
  Waypoints,
  Route,
  Funnel,
  // Subicon additions for workshop features
  LayoutList,
  Origami,
  Feather,
  ToolCase,
  CloudCog,
  Building2,
  House,
  ShieldOff,
  Key,
  Codepen,
  FileCode,
  PaintbrushVertical,
  SlidersHorizontal,
  BookType,
  Component,
  Lock,
  Contact,
  Eye,
  BookOpenCheck,
  Goal,
  // Additional subicon imports (round 2)
  Chrome,
  Wand2,
  Layout,
  Image,
  Reply,
  Bot,
  Bug,
  Cpu,
  Frame,
  Shapes,
  Share2,
  // Additional subicon imports (round 3) - workshop expansion
  ImageUp,
  FlameKindling,
  GlobeLock,
  Trash2,
  Rss,
  SquareAsterisk,
  IdCard,
  BadgeCheck,
  Refrigerator,
  BrickWallFire,
  FileBox,
  ServerCog,
  SolarPanel,
  CloudCog as MonitorCloud,
  ShoppingBasket,
  ScanQrCode,
  SendToBack,
  Regex,
  // Icon additions for workshop TOC and tools
  Pyramid,
  Blinds,
  RockingChair,
  Wrench,
  Dock,
  IdCardLanyard,
} from 'lucide-svelte';

// ============================================================================
// NAVIGATION ICONS
// ============================================================================
/** Icons for main navigation items */
export const navIcons = {
  home: Home,
  about: Info,
  vision: Telescope,
  roadmap: MapPin,
  pricing: HandCoins,
  knowledge: BookOpen,
  forest: Trees,
  blog: PenLine,
} as const;

// ============================================================================
// FEATURE ICONS
// ============================================================================
/** Icons for features, tools, and services */
export const featureIcons = {
  mail: Mail,
  harddrive: HardDrive,
  palette: Palette,
  shieldcheck: ShieldCheck,
  cloud: Cloud,
  searchcode: SearchCode,
  archive: Archive,
  upload: Upload,
  messagessquare: MessagesSquare,
  externallink: ExternalLink,
  github: Github,
} as const;

// ============================================================================
// CONTENT ICONS
// ============================================================================
/** Icons for content types and growth concepts */
export const contentIcons = {
  filetext: FileText,
  tag: Tag,
  sprout: Sprout,
  heart: Heart,
  leaf: Leaf,
  flower2: Flower2,
  trees: Trees,
  clock: Clock,
  trending: TrendingUp,
  users: Users,
  shield: ShieldUser,
  barchart: BarChart3,
  activity: Activity,
} as const;

// ============================================================================
// STATE & FEEDBACK ICONS
// ============================================================================
/** Icons for states: success, error, loading, etc. */
export const stateIcons = {
  check: Check,
  checkcircle: CheckCircle,
  x: X,
  loader: Loader2,
  warning: AlertTriangle,
  help: HelpCircle,
  info: InfoIcon,
  circle: Circle, // Fallback/default
} as const;

// ============================================================================
// PHASE & DREAM ICONS
// ============================================================================
/** Icons for phases, refinement, and mystical/future content */
export const phaseIcons = {
  gem: Gem,
  sparkles: Sparkles,
  star: Star,
  moon: Moon,
  sun: Sun,
  sprout: Sprout,
} as const;

// ============================================================================
// ACTION ICONS
// ============================================================================
/** Icons for user actions and processes */
export const actionIcons = {
  compass: Compass,
  megaphone: Megaphone,
  lightbulb: Lightbulb,
  download: Download,
  settings: Settings,
  menu: Menu,
  trend: TrendingUp,
  trenddown: TrendingDown,
  arrow: ArrowRight,
} as const;

// ============================================================================
// WORKSHOP & TOOL ICONS (Roadmap workshop page)
// ============================================================================
/** Icons specific to tools and workshop features */
export const toolIcons = {
  mailbox: Mailbox,
  harddrive: HardDrive,
  palette: Palette,
  shieldcheck: ShieldCheck,
  cloud: Cloud,
  searchcode: SearchCode,
  pickaxe: Pickaxe,
  archive: Archive,
  upload: Upload,
  projector: Projector,
  circuitboard: CircuitBoard,
  spool: Spool,
  binoculars: Binoculars,
  bird: Bird,
  dashboard: LayoutDashboard,
  activity: Activity,
  landplot: LandPlot,
  messagessquare: MessagesSquare,
  shielduser: UserRoundCheck,
  barchart: BarChart3,
  grape: Grape,
  codesandbox: Codesandbox,
  users: Users,
  map: MapPin,
  helpcircle: HelpCircle,
  signpost: Signpost,
  triangle: Triangle,
  gauge: Gauge,
  radar: Radar,
  webhook: Webhook,
  terminal: Terminal,
  database: Database,
  mapplus: MapPinPlus,
  layers: Layers,
  pencilruler: PencilRuler,
  swatchbook: SwatchBook,
  brickwallshield: BrickWall,
  wind: Wind,
  // Beyond page icons (standalone tools)
  music: Music,
  book: BookOpen,
  newspaper: Newspaper,
  telescope: Telescope,
  // Commerce
  store: Store,
  // Support
  lifebuoy: LifeBuoy,
  // Press - image processing CLI
  stamp: Stamp,
  // Creative/Composition (Weave)
  splinepointer: SplinePointer,  // Weave - main icon
  'send-to-back': SendToBack,    // Breeze - animation mode
  waves: Waves,                  // (legacy Sway reference)
  waypoints: Waypoints,          // Trace - diagram mode
  route: Route,                  // Thread - connections
  regex: Regex,                  // Patterns - design system
  // Subicons for workshop features
  layoutlist: LayoutList,        // Lattice - Vines
  origami: Origami,              // Songbird - Canary
  feather: Feather,              // Songbird - Kestrel
  toolcase: ToolCase,            // Songbird - Robin
  cloudcog: CloudCog,            // Threshold - Edge
  building2: Building2,          // Threshold - Tenant
  house: House,                  // Threshold - User
  shieldoff: ShieldOff,          // Threshold - Endpoint
  key: Key,                      // Loom - Session
  codepen: Codepen,              // Loom - Tenant
  filecode: FileCode,            // Loom - Post
  paintbrush: PaintbrushVertical, // Foliage - Themes
  sliders: SlidersHorizontal,    // Foliage - Customizer
  booktype: BookType,            // Foliage - Fonts
  component: Component,          // Ivy - Compose
  lock: Lock,                    // Ivy - Encrypt
  contact: Contact,              // Ivy - Contacts
  eye: Eye,                      // Rings - Views
  bookopencheck: BookOpenCheck,  // Rings - Readers
  goal: Goal,                    // Rings - Resonance
  // Additional subicons (round 2)
  chrome: Chrome,                // Heartwood - Google
  github: Github,                // Heartwood - GitHub
  wand2: Wand2,                  // Heartwood - Magic
  penline: PenLine,              // Arbor - Posts
  layout: Layout,                // Arbor - Pages
  image: Image,                  // Arbor - Media
  reply: Reply,                  // Reeds - Replies
  messagecircle: MessageCircle,  // Reeds - Comments
  bot: Bot,                      // Shade - Bot
  bug: Bug,                      // Shade - Scraper
  cpu: Cpu,                      // Vista - Workers
  frame: Frame,                  // Terrarium - Canvas
  shapes: Shapes,                // Terrarium - Assets
  share2: Share2,                // Terrarium - Export
  // Additional subicons (round 3) - workshop expansion
  imageup: ImageUp,              // Terrarium - Export (alternative)
  flamekindling: FlameKindling,  // Wisp - Fireside mode
  globelock: GlobeLock,          // Wisp/Shade/Thorn - Privacy
  shredder: Trash2,              // ZDR - Zero Data Retention
  rss: Rss,                      // Meadow - RSS feeds
  squareasterisk: SquareAsterisk, // Meadow - Opt-in
  idcard: IdCard,                // Heartwood - Identity
  badgecheck: BadgeCheck,        // Nook/Outpost - Private access
  refrigerator: Refrigerator,    // Vista - Storage
  brickwallfire: BrickWallFire,  // Shade - Complete protection
  filebox: FileBox,              // Loom - main icon
  servercog: ServerCog,          // Threshold - Edge
  solarpanel: SolarPanel,        // Firefly - Solarpunk aligned
  monitorcloud: MonitorCloud,    // Outpost - main icon
  // Lab icons (experimental @lucide/lab)
  bee: BeeIcon,                  // Swarm - agentic swarm mode
  // Loam - name protection & validation
  funnel: Funnel,                // Loam - filters valid names
  // Scout & Trove
  'shopping-basket': ShoppingBasket, // Scout - shopping research
  'scan-qr-code': ScanQrCode,    // Trove - book discovery
  // Workshop TOC icons
  pyramid: Pyramid,              // Core Infrastructure TOC
  blinds: Blinds,                // Shade - AI protection
  'rocking-chair': RockingChair, // Porch - front porch conversations
  toolbox: Wrench,               // Standalone Tools TOC
  dock: Dock,                    // Operations TOC
  'id-card-lanyard': IdCardLanyard, // Content & Community TOC
} as const;

// ============================================================================
// ROADMAP FEATURE ICONS (Main roadmap page)
// ============================================================================
/** Icons for features in roadmap phases */
export const roadmapFeatureIcons = {
  // Thaw Phase
  userplus: Users,
  sprout: Sprout,
  globe: Trees,
  penline: PenLine,
  imageplus: Upload,
  rss: FileText,
  shieldcheck: ShieldCheck,
  download: Download,
  lifebuoy: HelpCircle,
  signpost: Signpost,
  terminal: Terminal,          // Bloom - remote coding (was FileText)
  network: CircuitBoard,       // Mycelium - MCP server (was Github)
  database: Database,          // Patina - backups (was HardDrive)
  // First Buds Phase
  ivy: Mailbox,                // Ivy - email (was Mail, Workshop uses mailbox)
  amber: HardDrive,            // Amber - storage
  trails: MapPinPlus,          // Trails - personal roadmaps (was MapPin, Workshop uses mapplus)
  tree: Trees,
  swatchbook: SwatchBook,      // Foliage - theming (was Palette)
  // Full Bloom Phase
  meadow: Users,               // Meadow - social feed (was Flower2, Workshop uses users)
  clock: Clock,
  message: MessagesSquare,
  heart: Heart,
  trending: TrendingUp,
  crown: Star,
  paintbrush: Palette,
  users: Users,
  shield: UserRoundCheck,      // Thorn - moderation (was ShieldUser)
  // Golden Hour Phase
  gem: Gem,
  zap: Zap,                    // Performance (was TrendingUp)
  accessibility: Info,
  smartphone: FileText,
  puzzle: Lightbulb,
  // Midnight Bloom Phase
  coffee: Coffee,              // The Cafe (was Heart)
  qrcode: QrCode,              // Community Boards (was Lightbulb)
  bookopen: BookOpen,
  home: Home,
} as const;

// ============================================================================
// PRICING PAGE ICONS
// ============================================================================
/** Icons for pricing page features and tiers */
export const pricingIcons = {
  // Tier icons
  sprout: Sprout,
  treedeciduous: TreeDeciduous,
  trees: Trees,
  crown: Crown,
  // Feature row icons
  penline: PenLine,
  filetext: FileText,
  harddrive: HardDrive,
  palette: Palette,
  flower2: Flower2,
  messagecircle: MessageCircle,
  globe: Globe,              // Legacy - prefer searchcode for domains (Forage)
  searchcode: SearchCode,    // Forage - domain discovery
  mail: Mail,
  lifebuoy: LifeBuoy,
  calendardays: CalendarDays,
  clock: Clock,
  // Checkmark
  check: Check,
} as const;

// ============================================================================
// UNIFIED EXPORT
// ============================================================================
/** All icons in one map (use specific maps above when possible) */
export const allIcons = {
  ...navIcons,
  ...featureIcons,
  ...contentIcons,
  ...stateIcons,
  ...phaseIcons,
  ...actionIcons,
} as const;

/** Type for any icon key in the registry */
export type IconKey = keyof typeof allIcons;

/** Type for roadmap feature icon keys */
export type RoadmapFeatureIconKey = keyof typeof roadmapFeatureIcons;

/** Type for tool icon keys */
export type ToolIconKey = keyof typeof toolIcons;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get an icon from a specific map by key
 * @example
 * ```ts
 * const icon = getIcon(featureIcons, 'mail');
 * ```
 */
export function getIcon<T extends Record<string, any>>(
  map: T,
  key: keyof T | string
) {
  return (map as Record<string, any>)[key as string];
}

/**
 * Get an icon from the unified map
 * @example
 * ```ts
 * const icon = getIconFromAll('mail');
 * ```
 */
export function getIconFromAll(key: string) {
  return (allIcons as Record<string, any>)[key];
}

// ============================================================================
// COLOR MAPS (Seasonal/Status)
// ============================================================================

/**
 * Seasonal icon colors for roadmap phases
 */
export const seasonalIconColors = {
  'first-frost': 'text-blue-500',
  'thaw': 'text-teal-500',
  'first-buds': 'text-pink-500',
  'full-bloom': 'text-green-500',
  'golden-hour': 'text-amber-500',
  'midnight-bloom': 'text-purple-300',
} as const;

/**
 * Status-based icon colors
 */
export const statusIconColors = {
  live: 'text-green-500',
  complete: 'text-green-500',
  integrated: 'text-blue-500',
  implemented: 'text-blue-500',
  building: 'text-amber-500',
  planned: 'text-slate-400',
  past: 'text-green-500',
  current: 'text-accent',
  future: 'text-slate-400',
} as const;

/**
 * Get color for a phase
 * @example
 * ```ts
 * const color = getPhaseColor('golden-hour'); // 'text-amber-500'
 * ```
 */
export function getPhaseColor(phase: keyof typeof seasonalIconColors) {
  return seasonalIconColors[phase];
}

/**
 * Get color for a status
 * @example
 * ```ts
 * const color = getStatusColor('building'); // 'text-amber-500'
 * ```
 */
export function getStatusColor(status: keyof typeof statusIconColors) {
  return statusIconColors[status];
}
