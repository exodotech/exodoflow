import type { Config } from 'tailwindcss'

const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Breakpoints mobile-first: base = 360px (mobile)
      screens: {
        // Base: 360px (iPhone SE, 5S, etc)
        'sm': '390px',    // iPhone 12/13 Pro
        'md': '640px',    // Tablet pequeno (iPad mini)
        'lg': '1024px',   // Tablet grande (iPad)
        'xl': '1280px',   // Desktop
        '2xl': '1536px',  // Desktop grande
      },
      spacing: {
        // Respeitar safe-area no iPhone X+
        'safe': 'max(1rem, env(safe-area-inset-bottom))',
      },
      // Altura mínima para botões (44px = Apple HIG)
      minHeight: {
        'touch': '44px',
        'touch-lg': '48px',
      },
      // Width mínima para inputs
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [],
} satisfies Config

export default config
