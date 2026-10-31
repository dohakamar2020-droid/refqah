import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: "#F9EFF2",
        powder: "#F0DCE3",
        dusty: "#DDB8C5",
        muted: "#B77B91",
        deep: "#995C74",
        ivory: "#FFFAF8",
        ink: "#4A3540",
      },
      fontFamily: {
        sans: ["Tajawal", "system-ui", "sans-serif"],
        display: ["Amiri", "Tajawal", "serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(153, 92, 116, 0.18)",
        card: "0 6px 24px -10px rgba(153, 92, 116, 0.15)",
      },
      borderRadius: {
        card: "1.5rem",
      },
      keyframes: {
        flash: {
          "0%": { backgroundColor: "rgba(221, 184, 197, 0.9)" },
          "100%": { backgroundColor: "rgba(221, 184, 197, 0)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        flash: "flash 1.2s ease-out",
        fadeUp: "fadeUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
