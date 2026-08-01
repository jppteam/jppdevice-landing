<script setup>
// Minimal stroked line icons, keyword-selected. 24x24 viewBox, currentColor.
defineProps({ name: { type: String, required: true } })
</script>

<template>
  <svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- SD card -->
    <template v-if="name === 'sd'">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M10 3v3M13 3v3" />
      <path d="M9 12h6M9 15h6" />
    </template>
    <!-- code -->
    <template v-else-if="name === 'code'">
      <path d="M8 8l-4 4 4 4" />
      <path d="M16 8l4 4-4 4" />
      <path d="M13 5l-2 14" />
    </template>
    <!-- open (unlocked / open padlock) -->
    <template v-else-if="name === 'open'">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-1.9" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </template>
    <!-- bluetooth -->
    <template v-else-if="name === 'bluetooth'">
      <path d="M7 8l10 8-5 4V4l5 4L7 16" />
    </template>
    <!-- wifi -->
    <template v-else-if="name === 'wifi'">
      <path d="M3 9a15 15 0 0 1 18 0" />
      <path d="M6 12.5a10 10 0 0 1 12 0" />
      <path d="M9 16a5 5 0 0 1 6 0" />
      <circle cx="12" cy="19" r="0.6" fill="currentColor" stroke="none" />
    </template>
    <!-- radio -->
    <template v-else-if="name === 'radio'">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10" />
      <path d="M4 4a11 11 0 0 0 0 16M20 4a11 11 0 0 1 0 16" />
    </template>
    <!-- flash / bolt -->
    <template v-else-if="name === 'flash'">
      <path d="M13 3L5 13h6l-1 8 8-10h-6z" />
    </template>
    <!-- browser -->
    <template v-else-if="name === 'browser'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M6.5 6.5h.01M9 6.5h.01" />
    </template>
    <!-- chip -->
    <template v-else-if="name === 'chip'">
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <path d="M10 3v2M14 3v2M10 19v2M14 19v2M3 10h2M3 14h2M19 10h2M19 14h2" />
    </template>
    <!-- game (gamepad) -->
    <template v-else-if="name === 'game'">
      <rect x="2" y="7" width="20" height="10" rx="5" />
      <path d="M7 10v4M5 12h4" />
      <circle cx="16" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </template>
    <!-- demoscene (sparkle) -->
    <template v-else-if="name === 'demo'">
      <path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15l-1.8-4.2L5.5 9l4.7-1.3z" />
      <path d="M18 15l.7 1.8L20.5 17l-1.8.7L18 19.5l-.7-1.8L15.5 17l1.8-.5z" />
    </template>
  </svg>
</template>

<style scoped>
.glyph {
  width: 1em;
  height: 1em;
  display: block;
}
</style>
