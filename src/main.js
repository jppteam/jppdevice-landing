import { createApp } from 'vue'
import './assets/styles/tokens.css'
import './assets/styles/base.css'
// Self-hosted Outfit (weights used across the site + wordmark fallback).
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import '@fontsource/outfit/900.css'
// Outfit has no Cyrillic glyphs — Onest (a close geometric match) covers them.
// These are the Cyrillic subsets only, so they load solely for Russian text
// and fall in behind Outfit in the font stack (see tokens.css).
import '@fontsource/onest/cyrillic-400.css'
import '@fontsource/onest/cyrillic-500.css'
import '@fontsource/onest/cyrillic-600.css'
import '@fontsource/onest/cyrillic-700.css'
import '@fontsource/onest/cyrillic-800.css'
import '@fontsource/onest/cyrillic-900.css'
import App from './App.vue'
import { i18n } from './i18n/index.js'

createApp(App).use(i18n).mount('#app')
