import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#090D16",
        surface: "#131C2E",
        "surface-card": "#0B0F19",
        "surface-hover": "#1E293B",
        "surface-container": "#1c1f29",
        "surface-container-high": "#262a34",
        "surface-container-highest": "#31353f",
        "surface-container-lowest": "#0a0e17",
        "surface-container-low": "#181b25",
        "border-slate": "#1E293B",
        "border-subtle": "rgba(255, 255, 255, 0.08)",
        "brand-blue": "#3B82F6",
        "gain-emerald": "#10B981",
        "loss-rose": "#F43F5E",
        "warning-amber": "#F59E0B",
        "text-primary": "#F8FAFC",
        "text-secondary": "#94A3B8",
        "text-muted": "#64748B",
        tertiary: "#d0bcff",
        "tertiary-container": "#a078ff",
        secondary: "#7bd0ff",
        "on-surface": "#dfe2ef",
        // Keep backwards-compatibility aliases
        background: "#090D16",
        card: "#0B0F19",
        "card-border": "#1E293B",
        brand: {
          blue: "#3B82F6",
          purple: "#a078ff",
          gold: "#F59E0B",
          green: "#10B981",
          rose: "#F43F5E",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
