import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e4e4e7",
        "ink-soft": "#a1a1aa",
        surface: {
          0: "#09090b",
          1: "#0f0f13",
          2: "#16161d",
          3: "#1e1e28",
        },
        accent: "#6366f1",
        "accent-light": "#818cf8",
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
        "card-sm": "0 1px 2px rgb(0 0 0 / 0.2)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)",
        glow: "0 0 20px rgba(99, 102, 241, 0.3)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.4)",
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "fade-in-scale": "fade-in-scale 0.25s ease-out",
        shimmer: "shimmer 1.8s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
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
