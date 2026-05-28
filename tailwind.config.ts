import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"] },
      colors: { ink: "#0a0a0a", paper: "#fafaf7", accent: "#ff5a3c" }
    }
  },
  plugins: [require("tailwindcss-animate")]
} satisfies Config;
