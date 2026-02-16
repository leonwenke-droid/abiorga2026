import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#050816",
        foreground: "#e5f7ff",
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2"
        },
        card: "#0b1120"
      },
      boxShadow: {
        glow: "0 0 30px rgba(34,211,238,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
