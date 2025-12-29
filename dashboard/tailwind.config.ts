/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            animation: {
                'kitt-bar-center': 'kitt-bar-center 0.4s ease-in-out infinite',
                'kitt-bar-outer': 'kitt-bar-outer 0.4s ease-in-out infinite',
                'scan': 'scan 3s linear infinite',
            },
            keyframes: {
                'kitt-bar-center': {
                    '0%, 100%': { height: '15%', opacity: '0.8' },
                    '20%': { height: '100%', opacity: '1' },
                    '40%': { height: '60%', opacity: '0.9' },
                    '60%': { height: '90%', opacity: '1' },
                    '80%': { height: '50%', opacity: '0.9' },
                },
                'kitt-bar-outer': {
                    '0%, 100%': { height: '5%', opacity: '0.6' },
                    '20%': { height: '40%', opacity: '0.9' },
                    '40%': { height: '20%', opacity: '0.7' },
                    '60%': { height: '35%', opacity: '1' },
                    '80%': { height: '20%', opacity: '0.7' },
                },
                'scan': {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(200px)' },
                }
            }
        },
    },
    plugins: [],
}
