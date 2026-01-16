import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Use root path for Netlify, /SpeachToText/ for GitHub Pages
    base: process.env.NETLIFY ? '/' : '/SpeachToText/',
})
