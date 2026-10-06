import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#0B1B33", 900: "#10264A", 800: "#17356A", 700: "#1F4488", 600: "#2A58AE", 50: "#EEF3FB" },
        ink: { DEFAULT: "#16202E", soft: "#4A5668", mute: "#6B7686" },
        line: "#E3E7EE",
        surface: "#F6F8FB",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: { page: "72rem" },
    },
  },
  plugins: [],
};

export default config;
