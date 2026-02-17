// GroveUI - Class Name Utility
//
// Re-exports cn from the canonical location at $lib/utils/cn.ts
// This maintains backward compatibility for imports from '@lattice/ui/utils'
//
// Usage:
//   import { cn } from '@autumnsgrove/lattice/ui/utils';
//   <div class={cn('p-4 bg-white', isActive && 'bg-grove-100', className)} />

export { cn } from "$lib/utils/cn.js";
