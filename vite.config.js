import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const now = new Date();
const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    // Use relative path for portability between GitHub Pages and Netlify
    base: './',
    define: {
        '__APP_VERSION__': JSON.stringify(formattedDate)
    }
})
