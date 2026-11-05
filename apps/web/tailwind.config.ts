import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0E14",
        card: "#141824",
        "card-hover": "#1A2030",
        "card-border": "#273044",
        brand: {
          yellow: "#FFE600",
          yellowHover: "#FFED4A",
          coral: "#FF4757",
          cyan: "#00D2FF",
          mint: "#00E599",
          purple: "#8B5CF6",
        },
        primary: "#FFE600",
        accent: "#00D2FF",
        ink: "#0B0E14"
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-lg": "6px 6px 0px 0px #000000",
        "brutal-xl": "8px 8px 0px 0px #000000",
        "brutal-yellow": "4px 4px 0px 0px #FFE600",
        "brutal-cyan": "4px 4px 0px 0px #00D2FF",
        "brutal-coral": "4px 4px 0px 0px #FF4757",
        "brutal-white": "3px 3px 0px 0px #FFFFFF",
        card: "4px 4px 0px 0px #000000",
      },
      borderRadius: {
        brutal: "14px",
      }
    }
  },
  plugins: []
};

export default config;
