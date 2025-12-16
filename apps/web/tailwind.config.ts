import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#7c3aed",
        accent: "#22d3ee",
        ink: "#0b1021"
      },
      boxShadow: {
        card: "0 10px 30px rgba(0,0,0,0.15)"
      }
    }
  },
  plugins: []
};

export default config;
