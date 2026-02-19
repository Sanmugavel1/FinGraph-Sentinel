/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F172A",
        accent: "#22C55E",
        danger: "#EF4444"
      }
    },
  },
  plugins: [],
}
