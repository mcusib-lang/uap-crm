/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  safelist: [
    'bg-blue-100', 'text-blue-800',
    'bg-green-100', 'text-green-800',
    'bg-orange-100', 'text-orange-800',
    'bg-gray-100', 'text-gray-700',
    'border-gray-300', 'bg-gray-50',
    'border-blue-300', 'bg-blue-50',
    'border-indigo-300', 'bg-indigo-50',
    'border-purple-300', 'bg-purple-50',
    'border-pink-300', 'bg-pink-50',
    'border-orange-300', 'bg-orange-50',
    'border-green-300', 'bg-green-50',
    'border-yellow-300', 'bg-yellow-50',
    'border-red-200', 'bg-red-50',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4472C4',
        'primary-dark': '#1F3864',
        'primary-medium': '#2E75B6',
        'primary-light': '#D6E4F7',
      },
    },
  },
  plugins: [],
}
