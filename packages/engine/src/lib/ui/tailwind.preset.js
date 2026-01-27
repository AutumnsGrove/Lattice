/**
 * Grove Design System - Tailwind CSS Preset
 *
 * A calm, organic design system for the Grove blogging platform.
 * "a place to Be"
 */

/** @satisfies {Partial<import('tailwindcss').Config>} */
export default {
  content: [], // Presets don't provide content paths - consumers configure this
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────
      // COLOR PALETTE
      // ─────────────────────────────────────────────────────────────
      colors: {
        // Primary: Grove Green
        grove: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a", // PRIMARY
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // Neutrals
        cream: {
          DEFAULT: "#fefdfb",
          50: "#fefdfb",
          100: "#fdfcf8",
          200: "#faf8f3",
          300: "#f5f2ea",
          400: "#ede9de",
          500: "#e2ddd0",
        },
        bark: {
          DEFAULT: "#3d2914",
          50: "#f9f6f3",
          100: "#f0e9e1",
          200: "#e0d2c2",
          300: "#ccb59c",
          400: "#b69575",
          500: "#a57c5a",
          600: "#8a6347",
          700: "#6f4d39",
          800: "#5a3f30",
          900: "#3d2914", // PRIMARY
          950: "#2a1b0d",
        },
        // Semantic aliases
        primary: {
          DEFAULT: "#16a34a",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#e2ddd0",
          foreground: "#3d2914",
        },
        background: "#fefdfb",
        foreground: {
          DEFAULT: "#3d2914",
          muted: "#6f4d39",
          subtle: "#8a6347",
        },
        muted: {
          DEFAULT: "#f5f2ea",
          foreground: "#6f4d39",
        },
        accent: {
          DEFAULT: "#dcfce7",
          foreground: "#166534",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        border: "#e0d2c2",
        input: "#e0d2c2",
        ring: "#16a34a",
      },

      // ─────────────────────────────────────────────────────────────
      // TYPOGRAPHY
      // ─────────────────────────────────────────────────────────────
      fontFamily: {
        serif: ["Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      fontSize: {
        // Custom scale for better readability
        "display-lg": [
          "3.5rem",
          { lineHeight: "1.1", letterSpacing: "-0.02em" },
        ],
        display: ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "display-sm": [
          "2rem",
          { lineHeight: "1.25", letterSpacing: "-0.01em" },
        ],
        "heading-lg": ["1.5rem", { lineHeight: "1.35" }],
        heading: ["1.25rem", { lineHeight: "1.4" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.45" }],
        "body-lg": ["1.125rem", { lineHeight: "1.75" }],
        body: ["1rem", { lineHeight: "1.75" }],
        "body-sm": ["0.875rem", { lineHeight: "1.65" }],
        caption: ["0.75rem", { lineHeight: "1.5" }],
      },

      // ─────────────────────────────────────────────────────────────
      // SPACING & SIZING
      // ─────────────────────────────────────────────────────────────
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
        30: "7.5rem",
      },
      maxWidth: {
        prose: "65ch",
        "prose-wide": "75ch",
        "prose-narrow": "55ch",
      },

      // ─────────────────────────────────────────────────────────────
      // BORDERS & SHADOWS
      // ─────────────────────────────────────────────────────────────
      borderRadius: {
        grove: "0.75rem",
        "grove-lg": "1rem",
        "grove-xl": "1.5rem",
        "grove-full": "9999px",
      },
      boxShadow: {
        "grove-sm": "0 1px 2px 0 rgb(61 41 20 / 0.05)",
        grove:
          "0 2px 8px -2px rgb(61 41 20 / 0.08), 0 1px 2px -1px rgb(61 41 20 / 0.04)",
        "grove-md":
          "0 4px 12px -4px rgb(61 41 20 / 0.1), 0 2px 4px -2px rgb(61 41 20 / 0.05)",
        "grove-lg":
          "0 8px 24px -8px rgb(61 41 20 / 0.12), 0 4px 8px -4px rgb(61 41 20 / 0.06)",
        "grove-xl":
          "0 16px 48px -16px rgb(61 41 20 / 0.15), 0 8px 16px -8px rgb(61 41 20 / 0.08)",
        "grove-inner": "inset 0 1px 2px 0 rgb(61 41 20 / 0.05)",
        "grove-glow": "0 0 0 3px rgb(22 163 74 / 0.15)",
      },

      // ─────────────────────────────────────────────────────────────
      // ANIMATIONS
      // ─────────────────────────────────────────────────────────────
      animation: {
        // Fade animations
        "fade-in": "grove-fade-in 0.3s ease-out",
        "fade-out": "grove-fade-out 0.2s ease-in",
        "fade-in-up": "grove-fade-in-up 0.4s ease-out",
        "fade-in-down": "grove-fade-in-down 0.4s ease-out",

        // Growth animations (organic feel)
        grow: "grove-grow 0.4s ease-out",
        "grow-slow": "grove-grow 0.6s ease-out",
        shrink: "grove-shrink 0.3s ease-in",

        // Bloom animation (for buttons, etc)
        bloom: "grove-bloom 0.5s ease-out",
        "pulse-soft": "grove-pulse-soft 2s ease-in-out infinite",

        // Leaf animations
        "leaf-fall": "grove-leaf-fall 3s ease-in-out infinite",
        "leaf-sway": "grove-leaf-sway 4s ease-in-out infinite",

        // Spinner
        "spin-slow": "spin 2s linear infinite",
        "spin-organic": "grove-spin-organic 1.5s ease-in-out infinite",

        // Slide animations
        "slide-in-right": "grove-slide-in-right 0.3s ease-out",
        "slide-in-left": "grove-slide-in-left 0.3s ease-out",
        "slide-in-up": "grove-slide-in-up 0.3s ease-out",
        "slide-in-down": "grove-slide-in-down 0.3s ease-out",
      },
      keyframes: {
        "grove-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "grove-fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "grove-fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "grove-fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "grove-grow": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "grove-shrink": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        "grove-bloom": {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "grove-pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "grove-leaf-fall": {
          "0%": { transform: "translateY(-10px) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": {
            transform: "translateY(100px) rotate(45deg)",
            opacity: "0",
          },
        },
        "grove-leaf-sway": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "grove-spin-organic": {
          "0%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(100deg)" },
          "50%": { transform: "rotate(180deg)" },
          "75%": { transform: "rotate(260deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "grove-slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "grove-slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "grove-slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "grove-slide-in-down": {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },

      // ─────────────────────────────────────────────────────────────
      // TRANSITIONS
      // ─────────────────────────────────────────────────────────────
      transitionDuration: {
        "grove-fast": "150ms",
        grove: "200ms",
        "grove-slow": "300ms",
        "grove-slower": "500ms",
      },
      transitionTimingFunction: {
        grove: "cubic-bezier(0.4, 0, 0.2, 1)",
        "grove-bounce": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "grove-soft": "cubic-bezier(0.25, 0.1, 0.25, 1)",
      },

      // ─────────────────────────────────────────────────────────────
      // BACKDROP BLUR
      // ─────────────────────────────────────────────────────────────
      backdropBlur: {
        grove: "8px",
        "grove-lg": "16px",
      },

      // ─────────────────────────────────────────────────────────────
      // Z-INDEX SCALE
      // ─────────────────────────────────────────────────────────────
      // A semantic z-index system for consistent UI layering.
      //
      // Usage: z-grove-sticky, z-grove-modal, z-grove-mobile-menu, etc.
      //
      // Hierarchy (lowest to highest):
      //   base (0)      → Default elements
      //   raised (10)   → Elevated cards, hover states
      //   sticky (20)   → Sticky headers, navbars
      //   dropdown (30) → Dropdowns, popovers, select menus
      //   fab (40)      → Floating action buttons, mobile TOC
      //   overlay (50)  → Overlays, backdrops, dimmed backgrounds
      //   modal (60)    → Modals, dialogs, sheets
      //   toast (70)    → Toast notifications, snackbars
      //   tooltip (80)  → Tooltips (highest normal UI)
      //   mobile-menu (9990/9999) → Mobile navigation (always on top)
      //   entrance (100000) → First-paint loading overlay (absolute top)
      //
      // Note: Mobile menu uses high values (9990+) to ensure it
      // appears above glass elements with backdrop-filter, which
      // create new stacking contexts.
      //
      // Note: Entrance overlay uses 100000 to guarantee it covers
      // ALL UI during initial page load, including any dynamically
      // rendered elements that might use high z-index values.
      // ─────────────────────────────────────────────────────────────
      zIndex: {
        "grove-base": "0",
        "grove-raised": "10",
        "grove-sticky": "20",
        "grove-dropdown": "30",
        "grove-fab": "40",
        "grove-overlay": "50",
        "grove-modal": "60",
        "grove-toast": "70",
        "grove-tooltip": "80",
        "grove-mobile-menu-backdrop": "9990",
        "grove-mobile-menu": "9999",
        "grove-entrance": "100000",
      },
    },
  },
  plugins: [
    // Custom plugin for Grove utilities
    /** @param {import('tailwindcss/types/config').PluginAPI} api */
    function ({ addUtilities, addComponents, theme }) {
      // ─────────────────────────────────────────────────────────────
      // UTILITY CLASSES
      // ─────────────────────────────────────────────────────────────
      addUtilities({
        // Text utilities
        ".text-balance": {
          "text-wrap": "balance",
        },
        ".text-pretty": {
          "text-wrap": "pretty",
        },

        // Focus utilities
        ".focus-grove": {
          "&:focus": {
            outline: "none",
            boxShadow: `0 0 0 2px ${theme("colors.cream.DEFAULT")}, 0 0 0 4px ${theme("colors.grove.500")}`,
          },
        },
        ".focus-grove-inset": {
          "&:focus": {
            outline: "none",
            boxShadow: `inset 0 0 0 2px ${theme("colors.grove.500")}`,
          },
        },

        // Scrollbar hiding
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },

        // Smooth scrolling
        ".scroll-smooth": {
          "scroll-behavior": "smooth",
        },
      });

      // ─────────────────────────────────────────────────────────────
      // COMPONENT CLASSES
      // ─────────────────────────────────────────────────────────────
      addComponents({
        // Base prose styling
        ".grove-prose": {
          color: theme("colors.bark.DEFAULT"),
          fontSize: /** @type {[string, {lineHeight: string}]} */ (
            theme("fontSize.body")
          )[0],
          lineHeight: /** @type {[string, {lineHeight: string}]} */ (
            theme("fontSize.body")
          )[1].lineHeight,
          "& h1, & h2, & h3, & h4, & h5, & h6": {
            fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
            fontWeight: "400",
            color: theme("colors.bark.DEFAULT"),
          },
          "& h1": {
            fontSize: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.display")
            )[0],
            lineHeight: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.display")
            )[1].lineHeight,
            marginBottom: "1.5rem",
          },
          "& h2": {
            fontSize: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.display-sm")
            )[0],
            lineHeight: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.display-sm")
            )[1].lineHeight,
            marginTop: "2.5rem",
            marginBottom: "1rem",
          },
          "& h3": {
            fontSize: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.heading-lg")
            )[0],
            lineHeight: /** @type {[string, {lineHeight: string}]} */ (
              theme("fontSize.heading-lg")
            )[1].lineHeight,
            marginTop: "2rem",
            marginBottom: "0.75rem",
          },
          "& p": {
            marginBottom: "1.25rem",
          },
          "& a": {
            color: theme("colors.grove.600"),
            textDecoration: "underline",
            textDecorationColor: theme("colors.grove.300"),
            textUnderlineOffset: "2px",
            transition: "all 200ms",
            "&:hover": {
              color: theme("colors.grove.700"),
              textDecorationColor: theme("colors.grove.500"),
            },
          },
          "& blockquote": {
            borderLeftWidth: "3px",
            borderLeftColor: theme("colors.grove.300"),
            paddingLeft: "1.25rem",
            fontStyle: "italic",
            color: theme("colors.bark.700"),
          },
          "& code": {
            backgroundColor: theme("colors.cream.300"),
            padding: "0.125rem 0.375rem",
            borderRadius: "0.25rem",
            fontSize: "0.875em",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          },
          "& pre": {
            backgroundColor: theme("colors.bark.900"),
            color: theme("colors.cream.100"),
            padding: "1rem 1.25rem",
            borderRadius: theme("borderRadius.grove"),
            overflow: "auto",
            "& code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
              color: "inherit",
            },
          },
          "& ul, & ol": {
            paddingLeft: "1.5rem",
            marginBottom: "1.25rem",
          },
          "& li": {
            marginBottom: "0.5rem",
          },
          "& ul > li": {
            listStyleType: "disc",
          },
          "& ol > li": {
            listStyleType: "decimal",
          },
          "& hr": {
            borderColor: theme("colors.cream.400"),
            marginTop: "2rem",
            marginBottom: "2rem",
          },
          "& img": {
            borderRadius: theme("borderRadius.grove"),
          },
          "& table": {
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "1.25rem",
          },
          "& th, & td": {
            padding: "0.75rem 1rem",
            borderBottomWidth: "1px",
            borderBottomColor: theme("colors.cream.400"),
            textAlign: "left",
          },
          "& th": {
            fontWeight: "600",
            backgroundColor: theme("colors.cream.200"),
          },
        },
      });
    },
  ],
};
