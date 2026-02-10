// GroveUI - Icon Components
//
// This module exports SVG icon components and Lucide icon registries
// used across the Grove platform.
//
// Usage:
//   import { Icons, IconLegend } from '@autumnsgrove/groveengine/ui/icons';
//   import { stateIcons, pricingIcons, Check } from '@autumnsgrove/groveengine/ui/icons';

// Custom SVG components
export { default as Icons } from "./Icons.svelte";
export { default as IconLegend } from "./IconLegend.svelte";

// Lucide icon registries and utilities
export {
  // Icon maps (semantic groupings)
  navIcons,
  stateIcons,
  pricingIcons,
  featureIcons,
  growthIcons,
  phaseIcons,
  seasonIcons,
  actionIcons,
  metricsIcons,
  allIcons,
  // Types
  type IconKey,
  // Utilities
  getIcon,
  getIconFromAll,
  // Direct icon exports (commonly used)
  Check,
  CheckCircle,
  X,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Sprout,
  Footprints,
  Trees,
  TreeDeciduous,
  Crown,
  Flower2,
  Leaf,
  Heart,
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
  Layers,
  Lightbulb,
  BookOpen,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Lock,
  Ban,
  MessageSquare,
  MessageSquareText,
  Sparkles,
  Star,
  Moon,
  Sun,
  Snowflake,
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
  // Also export the authIcons map
  authIcons,
} from "./lucide";

export const ICONS_VERSION = "0.3.0";
