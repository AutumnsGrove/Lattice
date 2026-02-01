/**
 * Grove Email Sequences
 *
 * Automated email sequences for different audience types:
 * - Waitlist: Curious visitors who signed up on landing
 * - Trial: Users who signed up via Plant but haven't subscribed
 * - Rooted: Active subscribers
 *
 * Each audience gets a tailored sequence of emails over time.
 *
 * @example
 * ```tsx
 * import { WelcomeEmail, Day7Email } from '@autumnsgrove/groveengine/email/sequences';
 * import { render } from '@autumnsgrove/groveengine/email/render';
 *
 * const html = await render(
 *   <WelcomeEmail audienceType="waitlist" name="Wanderer" />
 * );
 * ```
 */

// Day 0 - Welcome
export { WelcomeEmail, type WelcomeEmailProps } from "./WelcomeEmail";

// Day 1 - First follow-up (trial + rooted only)
export { Day1Email, type Day1EmailProps } from "./Day1Email";

// Day 7 - One week check-in
export { Day7Email, type Day7EmailProps } from "./Day7Email";

// Day 14 - Two week follow-up (waitlist + trial only)
export { Day14Email, type Day14EmailProps } from "./Day14Email";

// Day 30 - One month check-in (waitlist + trial only)
export { Day30Email, type Day30EmailProps } from "./Day30Email";
