import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        "ink-soft": "#334155",
        "line-blue": "#D7E7FF",
        glow: "#4BA3FF"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      boxShadow: {
        panel: "0 20px 60px -35px rgba(12, 84, 199, 0.45)",
        glow: "0 0 0 1px rgba(75,163,255,0.24), 0 14px 40px -20px rgba(10,89,220,0.35)"
      }
    }
  },
  plugins: []
};

export default config;

