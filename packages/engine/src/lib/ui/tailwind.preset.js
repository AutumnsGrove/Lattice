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
      // All colors reference CSS custom properties for theme consistency
      // ─────────────────────────────────────────────────────────────
      colors: {
        // Primary: Grove Green
        grove: {
          50: "var(--grove-50)",
          100: "var(--grove-100)",
          200: "var(--grove-200)",
          300: "var(--grove-300)",
          400: "var(--grove-400)",
          500: "var(--grove-500)",
          600: "var(--grove-600)",
          700: "var(--grove-700)",
          800: "var(--grove-800)",
          900: "var(--grove-900)",
          950: "var(--grove-950)",
        },
        // Neutrals: Cream
        cream: {
          DEFAULT: "var(--cream-50)",
          50: "var(--cream-50)",
          100: "var(--cream-100)",
          200: "var(--cream-200)",
          300: "var(--cream-300)",
          400: "var(--cream-400)",
          500: "var(--cream-500)",
        },
        // Neutrals: Bark
        bark: {
          DEFAULT: "var(--bark-900)",
          50: "var(--bark-50)",
          100: "var(--bark-100)",
          200: "var(--bark-200)",
          300: "var(--bark-300)",
          400: "var(--bark-400)",
          500: "var(--bark-500)",
          600: "var(--bark-600)",
          700: "var(--bark-700)",
          800: "var(--bark-800)",
          900: "var(--bark-900)",
          950: "var(--bark-950)",
        },
        // Semantic aliases
        primary: {
          DEFAULT: "var(--grove-600)",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "var(--cream-500)",
          foreground: "var(--bark-900)",
        },
        background: "var(--cream-50)",
        foreground: {
          DEFAULT: "var(--bark-900)",
          muted: "var(--bark-700)",
          subtle: "var(--bark-600)",
          faint: "hsl(var(--foreground-faint, 25 15% 62%))",
        },
        muted: {
          DEFAULT: "var(--cream-300)",
          foreground: "var(--bark-700)",
        },
        accent: {
          DEFAULT: "var(--grove-100)",
          foreground: "var(--grove-800)",
          muted: "hsl(var(--accent-muted, 121 37% 32%))",
          subtle: "hsl(var(--accent-subtle, 121 40% 92%))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface, 0 0% 100%))",
          hover: "hsl(var(--surface-hover, 30 10% 96%))",
          elevated: "hsl(var(--surface-elevated, 0 0% 100%))",
          subtle: "hsl(var(--surface-subtle, 30 15% 97%))",
          alt: "hsl(var(--surface-alt, 30 10% 95%))",
        },
        default: "hsl(var(--default, 0 0% 88%))",
        subtle: "hsl(var(--subtle, 0 0% 92%))",
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        border: "var(--cream-200)",
        input: "var(--cream-200)",
        ring: "var(--grove-500)",
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
        "grove-sm": "var(--shadow-grove-sm)",
        grove: "var(--shadow-grove)",
        "grove-md": "var(--shadow-grove-md)",
        "grove-lg": "var(--shadow-grove-lg)",
        "grove-xl": "var(--shadow-grove-xl)",
        "grove-inner": "var(--shadow-grove-inner)",
        "grove-glow": "var(--shadow-grove-glow)",
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
