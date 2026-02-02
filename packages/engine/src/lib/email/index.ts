/**
 * Grove Email Infrastructure
 *
 * This module provides everything needed to build, render, and send
 * beautiful Grove-branded emails using React Email and Resend.
 *
 * ## Quick Start
 *
 * ```tsx
 * import { GroveEmail, GroveButton } from '@autumnsgrove/groveengine/email/components';
 * import { render } from '@autumnsgrove/groveengine/email/render';
 *
 * const html = await render(<GroveEmail>Hello!</GroveEmail>);
 * ```
 *
 * ## Submodules
 *
 * - `./components` - Grove design system components
 * - `./sequences` - Automated email sequences (Day 0, 1, 7, etc.)
 * - `./updates` - Patch notes and announcements
 * - `./lifecycle` - Subscription lifecycle (renewals, nudges)
 * - `./seasonal` - Seasonal greetings
 * - `./render` - Rendering utilities
 * - `./schedule` - Scheduling with Resend
 *
 * @module email
 */

// Re-export everything from components for convenience
export * from "./components";

// Re-export types
export * from "./types";

// Re-export URL helpers
export * from "./urls";

// Re-export porch templates
export * from "./porch";
