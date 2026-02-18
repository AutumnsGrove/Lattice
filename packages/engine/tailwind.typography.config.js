// tailwind.typography.config.js
export default {
  DEFAULT: {
    css: {
      // Use CSS variables for colors to support dark mode
      "--tw-prose-body": "hsl(var(--foreground))",
      "--tw-prose-headings": "hsl(var(--primary))",
      "--tw-prose-links": "hsl(var(--primary))",
      "--tw-prose-bold": "hsl(var(--foreground))",
      "--tw-prose-counters": "hsl(var(--muted-foreground))",
      "--tw-prose-bullets": "hsl(var(--muted-foreground))",
      "--tw-prose-hr": "hsl(var(--border))",
      "--tw-prose-quotes": "hsl(var(--muted-foreground))",
      "--tw-prose-quote-borders": "hsl(var(--border))",
      "--tw-prose-code": "hsl(var(--primary))",
      "--tw-prose-pre-code": "hsl(var(--foreground))",
      "--tw-prose-pre-bg": "hsl(var(--muted))",

      // Dark mode colors
      "--tw-prose-invert-body": "hsl(var(--foreground))",
      "--tw-prose-invert-headings": "hsl(var(--primary-foreground))",
      "--tw-prose-invert-links": "hsl(120 40% 60%)", // Lighter green for dark mode
      "--tw-prose-invert-bold": "hsl(var(--foreground))",
      "--tw-prose-invert-counters": "hsl(var(--muted-foreground))",
      "--tw-prose-invert-bullets": "hsl(var(--muted-foreground))",
      "--tw-prose-invert-hr": "hsl(var(--border))",
      "--tw-prose-invert-quotes": "hsl(var(--muted-foreground))",
      "--tw-prose-invert-quote-borders": "hsl(var(--border))",
      "--tw-prose-invert-code": "hsl(120 40% 60%)",

      // Typography settings
      maxWidth: "none", // Allow ContentWithGutter to control width
      fontSize: "1.05rem",
      lineHeight: "1.75",

      // Headings
      h2: {
        fontSize: "1.8rem",
        fontWeight: "600",
        marginTop: "2rem",
        marginBottom: "1rem",
        color: "hsl(var(--primary))",
      },
      h3: {
        fontSize: "1.5rem",
        fontWeight: "600",
        marginTop: "1.75rem",
        marginBottom: "0.75rem",
      },
      h4: {
        fontSize: "1.25rem",
        fontWeight: "600",
        marginTop: "1.5rem",
        marginBottom: "0.5rem",
      },

      // Links
      a: {
        color: "hsl(var(--primary))",
        textDecoration: "underline",
        textDecorationColor: "hsl(var(--primary) / 0.3)",
        fontWeight: "500",
        transition: "all 0.2s",
        "&:hover": {
          textDecorationColor: "hsl(var(--primary))",
        },
      },

      // Code
      code: {
        color: "hsl(var(--primary))",
        fontWeight: "500",
        fontSize: "0.9em",
        "&::before": { content: '"`"' },
        "&::after": { content: '"`"' },
      },

      "code::before": {
        content: '"`"',
      },
      "code::after": {
        content: '"`"',
      },

      // Block quotes
      blockquote: {
        borderLeftColor: "hsl(var(--primary))",
        borderLeftWidth: "4px",
        fontStyle: "italic",
        paddingLeft: "1.5rem",
      },

      // Lists
      ul: {
        listStyleType: "disc",
      },
      ol: {
        listStyleType: "decimal",
      },
    },
  },
};
