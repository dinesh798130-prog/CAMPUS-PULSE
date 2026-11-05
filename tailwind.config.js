/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        campus: {
          navy: "#142B4A",
          dark: "#0F1F38",
          blue: "#2563EB",
          lightBlue: "#3B82F6",
          teal: "#0D9488",
          lightTeal: "#14B8A6",
          bg: "#F5F7FB",
          slate: "#1E293B",
          card: "#FFFFFF",
          border: "#E2E8F0"
        },
        status: {
          available: "#16A34A",
          availableBg: "#DCFCE7",
          occupied: "#DC2626",
          occupiedBg: "#FEE2E2",
          upcoming: "#2563EB",
          upcomingBg: "#DBEAFE",
          unavailable: "#64748B",
          unavailableBg: "#F1F5F9"
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

