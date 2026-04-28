import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        arabic: ["var(--font-noto-arabic)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#fff5f7",
          100: "#ffe4ec",
          200: "#ffc1d3",
          300: "#ff8fae",
          400: "#ff5d8b",
          500: "#ec3a72",
          600: "#c92561",
          700: "#a01b4f",
          800: "#7a1640",
          900: "#561033",
        },
      },
    },
  },
  plugins: [],
};

export default config;
