import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function for merging Tailwind CSS classes
 *
 * Combines clsx for conditional class logic and tailwind-merge to
 * handle Tailwind class conflicts intelligently.
 *
 * @param inputs - Class values to merge (strings, objects, arrays)
 * @returns Merged class string
 *
 * @example
 * cn('px-2 py-1', className)
 * cn('text-blue-500', { 'text-red-500': isError })
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
