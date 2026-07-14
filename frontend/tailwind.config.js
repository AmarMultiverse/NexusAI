/** @type {import('tailwindcss').Config} */
export default {
  // Specifies which files Tailwind should scan for class names
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // All JS/JSX files inside the src directory
  ],
  theme: {
    extend: {},
  },
  // Added the Typography plugin
  plugins: [
    require('@tailwindcss/typography'),
  ],
}