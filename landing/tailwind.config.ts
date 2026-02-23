import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        "ink-soft": "#334155",
        "line-blue": "#D7E7FF",
        glow: "#4BA3FF",
        // Semantic surface hierarchy
        surface: {
          0: "#06080d",
          1: "#0c1018",
          2: "#111827",
          3: "#1e293b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 20px 60px -35px rgba(12, 84, 199, 0.45)",
        glow: "0 0 0 1px rgba(75,163,255,0.24), 0 14px 40px -20px rgba(10,89,220,0.35)",
        "card-sm": "0 1px 3px rgba(0,0,0,0.3), 0 2px 8px -2px rgba(0,0,0,0.15)",
        "card-md": "0 2px 6px rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.2)",
        "inner-glow": "inset 0 1px 0 rgba(255,255,255,0.03)",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-scale": "fade-in-scale 0.25s ease-out",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
