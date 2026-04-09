/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        smartup: {
          teal: "#27B9B3",
          ocean: "#0C7886",
          orange: "#EE6D46",
          red: "#E92B21",
        },
      },
    },
  },
  plugins: [],
};