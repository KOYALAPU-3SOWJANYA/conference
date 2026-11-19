/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#082D72", 950: "#041a45", 900: "#06255f", 700: "#0a3a8f" },
        royal: { DEFAULT: "#0757C8", 600: "#0648a8" },
        electric: { DEFAULT: "#00A6FF", 300: "#7fd3ff" },
        plum: { DEFAULT: "#7900A8", 700: "#5e0083", 900: "#2b0a4a", 100: "#f1e3f8" },
        mist: "#F4F8FF",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(8,45,114,.25)",
        glow: "0 0 40px -6px rgba(0,166,255,.55)",
      },
      keyframes: {
        fadeUp: { "0%": { opacity: 0, transform: "translateY(14px)" }, "100%": { opacity: 1, transform: "none" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-14px)" } },
        pop: { "0%": { opacity: 0, transform: "scale(.96)" }, "100%": { opacity: 1, transform: "none" } },
      },
      animation: { fadeUp: "fadeUp .55s ease both", float: "float 7s ease-in-out infinite", pop: "pop .2s ease both" },
    },
  },
  plugins: [],
};
