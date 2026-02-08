/**
 * Shared Lucide icon registry for Grove Platform.
 * Single source of truth for commonly used icons across all Grove apps.
 *
 * DO: Import icons from '@autumnsgrove/groveengine/ui/icons'
 * DON'T: Import directly from 'lucide-svelte' in app components
 *
 * @example
 * ```svelte
 * import { stateIcons, navIcons } from '@autumnsgrove/groveengine/ui/icons';
 *
 * <svelte:component this={stateIcons.check} class="w-5 h-5" />
 * ```
 */

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
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ExternalLink,
  LogIn,
  // Features & Content
  Mail,
  HardDrive,
  Palette,
  ShieldCheck,
  ShieldAlert,
  Shield,
  UserX,
  Cloud,
  SearchCode,
  Archive,
  Upload,
  MessagesSquare,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  FileText,
  Tag,
  Rss,
  Eye,
  Github,
  Layers,
  // Nature/Growth (Grove themed)
  Sprout,
  Heart,
  Leaf,
  Flower2,
  TreeDeciduous,
  Crown,
  Ban,
  // States & Feedback
  Check,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Info as InfoIcon,
  Circle,
  Lock,
  // Phases & Special
  Gem,
  Sparkles,
  Star,
  Moon,
  Sun,
  Snowflake,
  // Actions
  Compass,
  Megaphone,
  Lightbulb,
  Download,
  Settings,
  Menu,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  // Metrics
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  ShieldUser,
  BarChart3,
  // Pricing
  Globe,
  CalendarDays,
  LifeBuoy,
  // Authentication & Security
  Fingerprint,
  Key,
  Link2,
  // Profile & Onboarding
  User,
  CreditCard,
  Gift,
  PartyPopper,
  PenTool,
  Camera,
  ChefHat,
  Laptop,
  Plane,
  Briefcase,
} from "lucide-svelte";

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
  arrow: ArrowRight,
  arrowLeft: ArrowLeft,
  chevron: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  external: ExternalLink,
  login: LogIn,
  github: Github,
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
  circle: Circle,
  lock: Lock,
  ban: Ban,
} as const;

// ============================================================================
// PRICING & TIER ICONS
// ============================================================================
/** Icons for pricing tiers and feature comparison */
export const pricingIcons = {
  // Tier icons (growth progression)
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
  globe: Globe,
  searchcode: SearchCode,
  mail: Mail,
  lifebuoy: LifeBuoy,
  calendardays: CalendarDays,
  clock: Clock,
  // Checkmark for feature availability
  check: Check,
} as const;

// ============================================================================
// CONTENT & FEATURE ICONS
// ============================================================================
/** Icons for features, tools, and content types */
export const featureIcons = {
  mail: Mail,
  harddrive: HardDrive,
  palette: Palette,
  shieldcheck: ShieldCheck,
  shieldalert: ShieldAlert,
  shield: Shield,
  userx: UserX,
  cloud: Cloud,
  searchcode: SearchCode,
  archive: Archive,
  upload: Upload,
  messagessquare: MessagesSquare,
  externallink: ExternalLink,
  filetext: FileText,
  tag: Tag,
  rss: Rss,
  eye: Eye,
  download: Download,
  layers: Layers,
  messagesquare: MessageSquare,
  messagesquaretext: MessageSquareText,
} as const;

// ============================================================================
// GROWTH & NATURE ICONS
// ============================================================================
/** Icons representing growth and nature (Grove themed) */
export const growthIcons = {
  sprout: Sprout,
  heart: Heart,
  leaf: Leaf,
  flower2: Flower2,
  trees: Trees,
  treedeciduous: TreeDeciduous,
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
// SEASON ICONS
// ============================================================================
/** Icons for Grove's seasonal theming system */
export const seasonIcons = {
  spring: Flower2,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
  midnight: Moon,
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
  plus: Plus,
  copy: Copy,
  trash: Trash2,
  refresh: RefreshCw,
} as const;

// ============================================================================
// AUTHENTICATION ICONS
// ============================================================================
/** Icons for authentication and account security */
export const authIcons = {
  fingerprint: Fingerprint,
  key: Key,
  link: Link2,
  shield: Shield,
  shieldcheck: ShieldCheck,
  lock: Lock,
  mail: Mail,
  login: LogIn,
} as const;

// ============================================================================
// METRICS ICONS
// ============================================================================
/** Icons for analytics and metrics display */
export const metricsIcons = {
  clock: Clock,
  trending: TrendingUp,
  trenddown: TrendingDown,
  activity: Activity,
  users: Users,
  shield: ShieldUser,
  barchart: BarChart3,
} as const;

// ============================================================================
// UNIFIED EXPORT
// ============================================================================
/** All icons in one map (use specific maps above when possible) */
export const allIcons = {
  ...navIcons,
  ...stateIcons,
  ...featureIcons,
  ...growthIcons,
  ...phaseIcons,
  ...seasonIcons,
  ...actionIcons,
  ...authIcons,
  ...metricsIcons,
} as const;

/** Type for any icon key in the registry */
export type IconKey = keyof typeof allIcons;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get an icon from a specific map by key
 * @example
 * ```ts
 * const icon = getIcon(stateIcons, 'check');
 * ```
 */
export function getIcon<T extends Record<string, any>>(
  map: T,
  key: keyof T | string,
) {
  return (map as Record<string, any>)[key as string];
}

/**
 * Get an icon from the unified map
 * @example
 * ```ts
 * const icon = getIconFromAll('check');
 * ```
 */
export function getIconFromAll(key: string) {
  return (allIcons as Record<string, any>)[key];
}

// ============================================================================
// DIRECT EXPORTS (for convenience)
// ============================================================================
// Re-export commonly used icons directly for simple imports
export {
  // Most commonly used
  Check,
  CheckCircle,
  X,
  ArrowRight,
  ArrowLeft,
  MapPin,
  // Growth icons
  Sprout,
  Trees,
  TreeDeciduous,
  Crown,
  Flower2,
  Leaf,
  Heart,
  // Navigation
  Home,
  Menu,
  Settings,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Github,
  HandCoins,
  FileText,
  // Features
  Mail,
  HardDrive,
  Palette,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserX,
  Download,
  Rss,
  Eye,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Layers,
  Lightbulb,
  BookOpen,
  // States
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lock,
  Ban,
  // Phase/Special & Seasons
  Sparkles,
  Star,
  Moon,
  Sun,
  Snowflake,
  // Metrics
  Clock,
  TrendingUp,
  Users,
  Activity,
  // Actions
  Megaphone,
  Plus,
  Copy,
  Trash2,
  RefreshCw,
  // Authentication
  Fingerprint,
  Key,
  Link2,
  // Profile & Onboarding
  User,
  CreditCard,
  Gift,
  PartyPopper,
  PenTool,
  Camera,
  ChefHat,
  Laptop,
  Plane,
  Briefcase,
};
