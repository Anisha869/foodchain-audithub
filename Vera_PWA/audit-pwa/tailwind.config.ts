import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vera: {
          navy: "#1e3c72",
          royal: "#2a5298",
          dark: "#0f172a",
          card: "#1e293b",
          border: "#334155",
        },
      },
    },
  },
  plugins: [],
};
export default config;
