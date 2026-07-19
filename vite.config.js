import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Static SPA build → dist/. No backend.
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2020',
    cssCodeSplit: false,
  },
})
