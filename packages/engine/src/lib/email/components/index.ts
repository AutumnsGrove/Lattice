/**
 * Grove Email Design System Components
 *
 * A complete component library for building beautiful,
 * Grove-branded emails with React Email.
 *
 * @example
 * ```tsx
 * import {
 *   GroveEmail,
 *   GroveButton,
 *   GroveHeading,
 *   GroveParagraph,
 * } from '@autumnsgrove/groveengine/email/components';
 *
 * export function WelcomeEmail({ name }: { name: string }) {
 *   return (
 *     <GroveEmail previewText="Welcome to Grove!">
 *       <GroveHeading>Welcome, {name} 🌿</GroveHeading>
 *       <GroveParagraph>
 *         You've just planted something special.
 *       </GroveParagraph>
 *       <GroveButton href="https://grove.place">
 *         Explore Grove
 *       </GroveButton>
 *     </GroveEmail>
 *   );
 * }
 * ```
 */

// Layout
export { GroveEmail, type GroveEmailProps } from "./GroveEmail";

// Interactive
export { GroveButton, type GroveButtonProps } from "./GroveButton";

// Typography
export {
  GroveHeading,
  GroveParagraph,
  GroveLink,
  GroveList,
  type GroveHeadingProps,
  type GroveParagraphProps,
  type GroveLinkProps,
  type GroveListProps,
} from "./GroveText";

// Decorative
export { GroveDivider, type GroveDividerProps } from "./GroveDivider";
export { GroveHighlight, type GroveHighlightProps } from "./GroveHighlight";

// Content blocks
export { GrovePatchNote, type GrovePatchNoteProps } from "./GrovePatchNote";

// Design tokens
export { GROVE_EMAIL_COLORS, TEXT_STYLES } from "./styles";
