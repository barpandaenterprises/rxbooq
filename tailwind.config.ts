import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "./.storybook/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "2rem",
        lg: "4rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      // ---------- Colour tokens (mapped to CSS variables in tokens.css) ----------
      colors: {
        // Brand
        brand: {
          DEFAULT: "var(--color-brand)",
          dark: "var(--color-link-hover)",
          fg: "var(--color-brand-fg)",
        },
        cta: {
          DEFAULT: "var(--color-cta)",
          fg: "var(--color-cta-fg)",
        },
        // Text
        heading: "var(--color-text-heading)",
        body: "var(--color-text-body)",
        muted: "var(--color-text-muted)",
        link: "var(--color-link)",
        "link-hover": "var(--color-link-hover)",
        // Surfaces
        surface: {
          DEFAULT: "var(--color-bg)",
          muted: "var(--color-bg-muted)",
          warm: "var(--color-bg-warm)",
          brand: "var(--color-bg-brand)",
        },
        // Borders
        border: "var(--color-border)",
        // Status / semantic
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        // shadcn fallbacks (for components that expect them)
        background: "var(--color-bg)",
        foreground: "var(--color-text-body)",
        primary: {
          DEFAULT: "var(--color-brand)",
          foreground: "var(--color-brand-fg)",
        },
        secondary: {
          DEFAULT: "var(--color-bg-muted)",
          foreground: "var(--color-text-heading)",
        },
        destructive: {
          DEFAULT: "var(--color-danger)",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "var(--color-bg-warm)",
          foreground: "var(--color-text-heading)",
        },
        popover: {
          DEFAULT: "var(--color-bg)",
          foreground: "var(--color-text-body)",
        },
        card: {
          DEFAULT: "var(--color-bg)",
          foreground: "var(--color-text-body)",
        },
        input: "var(--color-border)",
        ring: "var(--color-brand)",
      },
      // ---------- Typography tokens ----------
      fontFamily: {
        sans: ["var(--font-sans)"],
        icons: ["var(--font-icons)"],
        brands: ["var(--font-brands)"],
      },
      fontSize: {
        h1:        ["40px", { lineHeight: "48px", fontWeight: "600" }],
        h2:        ["34px", { lineHeight: "41px", fontWeight: "600" }],
        h3:        ["20px", { lineHeight: "24px", fontWeight: "600" }],
        h4:        ["18px", { lineHeight: "26px", fontWeight: "500" }],
        body:      ["15px", { lineHeight: "26px", fontWeight: "400" }],
        paragraph: ["16px", { lineHeight: "27px", fontWeight: "400" }],
        link:      ["15px", { lineHeight: "26px", fontWeight: "400" }],
        small:     ["13px", { lineHeight: "20px", fontWeight: "400" }],
      },
      // ---------- Spacing tokens (4-pt grid extras) ----------
      spacing: {
        "4.5": "18px",
        "13":  "52px",
        "15":  "60px",
        "17":  "68px",
        "18":  "72px",
      },
      // ---------- Radius tokens ----------
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        pill: "9999px",
      },
      // ---------- Elevation tokens ----------
      boxShadow: {
        sm: "0 1px 2px rgba(15, 23, 42, .06)",
        md: "0 4px 12px rgba(15, 23, 42, .08)",
      },
      // ---------- Animation ----------
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
