/**
 * Grove Design System - Animation Tokens
 *
 * Durations, easings, and animation definitions.
 */

export const duration = {
  fast: "150ms",
  DEFAULT: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const easing = {
  DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  soft: "cubic-bezier(0.25, 0.1, 0.25, 1)",
} as const;

export const animations = {
  // Fade animations
  "fade-in": {
    duration: "300ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  },
  "fade-out": {
    duration: "200ms",
    easing: easing.in,
    keyframes: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
  },
  "fade-in-up": {
    duration: "400ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateY(8px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  },
  "fade-in-down": {
    duration: "400ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateY(-8px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  },

  // Growth animations (organic)
  grow: {
    duration: "400ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "scale(0.95)" },
      to: { opacity: 1, transform: "scale(1)" },
    },
  },
  shrink: {
    duration: "300ms",
    easing: easing.in,
    keyframes: {
      from: { opacity: 1, transform: "scale(1)" },
      to: { opacity: 0, transform: "scale(0.95)" },
    },
  },
  bloom: {
    duration: "500ms",
    easing: easing.out,
    keyframes: {
      "0%": { opacity: 0, transform: "scale(0.8)" },
      "50%": { transform: "scale(1.02)" },
      "100%": { opacity: 1, transform: "scale(1)" },
    },
  },

  // Leaf animations
  "leaf-fall": {
    duration: "3000ms",
    easing: easing["in-out"],
    iteration: "infinite",
    keyframes: {
      "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: 0 },
      "10%": { opacity: 1 },
      "90%": { opacity: 1 },
      "100%": { transform: "translateY(100px) rotate(45deg)", opacity: 0 },
    },
  },
  "leaf-sway": {
    duration: "4000ms",
    easing: easing["in-out"],
    iteration: "infinite",
    keyframes: {
      "0%, 100%": { transform: "rotate(-3deg)" },
      "50%": { transform: "rotate(3deg)" },
    },
  },

  // Slide animations
  "slide-in-right": {
    duration: "300ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateX(16px)" },
      to: { opacity: 1, transform: "translateX(0)" },
    },
  },
  "slide-in-left": {
    duration: "300ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateX(-16px)" },
      to: { opacity: 1, transform: "translateX(0)" },
    },
  },
  "slide-in-up": {
    duration: "300ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateY(16px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  },
  "slide-in-down": {
    duration: "300ms",
    easing: easing.out,
    keyframes: {
      from: { opacity: 0, transform: "translateY(-16px)" },
      to: { opacity: 1, transform: "translateY(0)" },
    },
  },
} as const;

export const animation = {
  duration,
  easing,
  animations,
} as const;

export type Duration = typeof duration;
export type Easing = typeof easing;
export type Animations = typeof animations;
export type Animation = typeof animation;
