import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--tb-canvas)",
        surface: "var(--tb-surface)",
        elevated: "var(--tb-elevated)",
        well: "var(--tb-well)",
        ink: "var(--tb-ink)",
        body: "var(--tb-body)",
        mute: "var(--tb-mute)",
        "line-soft": "var(--tb-border-soft)",
        "line-strong": "var(--tb-border-structural)",
        ok: "var(--tb-ok)",
        err: "var(--tb-err)",
        warn: "var(--tb-warn)",
      },
      fontFamily: {
        serif: "var(--tb-font-serif)",
        sans: "var(--tb-font-sans)",
        mono: "var(--tb-font-mono)",
      },
      borderRadius: {
        btn: "var(--tb-radius-btn)",
        card: "var(--tb-radius-card)",
      },
    },
  },
  plugins: [],
};

export default config;
