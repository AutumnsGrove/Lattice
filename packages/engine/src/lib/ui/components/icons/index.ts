// GroveUI - Icon Components
//
// This module exports SVG icon components and Lucide icon registries
// used across the Grove platform.
//
// Usage:
//   import { Icons, IconLegend } from '@autumnsgrove/groveengine/ui/icons';
//   import { stateIcons, pricingIcons, Check } from '@autumnsgrove/groveengine/ui/icons';

// Custom SVG components
export { default as Icons } from './Icons.svelte';
export { default as IconLegend } from './IconLegend.svelte';

// Lucide icon registries and utilities
export {
  // Icon maps (semantic groupings)
  navIcons,
  stateIcons,
  pricingIcons,
  featureIcons,
  growthIcons,
  phaseIcons,
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
  Loader2,
  AlertTriangle,
  HelpCircle,
  Clock,
  TrendingUp,
  Users,
  Activity,
} from './lucide';

export const ICONS_VERSION = '0.3.0';
