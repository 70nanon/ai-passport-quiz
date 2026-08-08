import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages でも相対パスで動くようにする
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    open: true,
  },
  preview: {
    open: true,
  },
})
