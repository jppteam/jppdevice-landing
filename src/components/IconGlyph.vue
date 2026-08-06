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
    <!-- tools (wrench + screwdriver) -->
    <template v-else-if="name === 'tools'">
      <!-- Icon from Iconoir by Luca Burgio - https://github.com/iconoir-icons/iconoir/blob/main/LICENSE -->
      <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
        <path d="m10.05 10.607l-7.07 7.07a2 2 0 0 0 0 2.83v0a2 2 0 0 0 2.828 0l7.07-7.072m4.315.365l3.878 3.878a2 2 0 0 1 0 2.828v0a2 2 0 0 1-2.828 0l-6.209-6.208M6.733 5.904L4.61 6.61L2.49 3.075l1.414-1.414L7.44 3.782zm0 0l2.83 2.83"/>
        <path d="M10.05 10.607c-.844-2.153-.679-4.978 1.061-6.718s4.95-2.121 6.717-1.06l-3.04 3.04l-.283 3.111l3.111-.282l3.04-3.041c1.062 1.768.68 4.978-1.06 6.717c-1.74 1.74-4.564 1.905-6.717 1.061"/>
      </g>
    </template>
    <!-- folder -->
    <template v-else-if="name === 'folder'">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </template>
    <!-- file -->
    <template v-else-if="name === 'file'">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
    </template>
    <!-- arrow up -->
    <template v-else-if="name === 'arrow-up'">
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </template>
    <!-- download -->
    <template v-else-if="name === 'download'">
      <path d="M12 3v11" />
      <path d="M7 9l5 5 5-5" />
      <path d="M5 19h14" />
    </template>
    <!-- trash -->
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </template>
    <!-- usb -->
    <template v-else-if="name === 'usb'">
      <!-- Icon from Iconoir by Luca Burgio - https://github.com/iconoir-icons/iconoir/blob/main/LICENSE -->
      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12.5 2v15m0-3l5.5-2V8.5M12.5 16L7 14.5v-3M12.5 22a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m4-16.5v3h3v-3zm-6-1.5l2-2l2 2M7 11a2 2 0 1 0 0-4a2 2 0 0 0 0 4"/>
    </template>
    <!-- tag (version / label) -->
    <template v-else-if="name === 'tag'">
      <path d="M3 11V4a1 1 0 0 1 1-1h7l9 9-8 8-9-9z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </template>
    <!-- user -->
    <template v-else-if="name === 'user'">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </template>
    <!-- id (hardware id / badge) -->
    <template v-else-if="name === 'id'">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9.5" cy="10.5" r="1.6" />
      <path d="M6.5 16c.4-1.6 1.7-2.3 3-2.3s2.6.7 3 2.3" />
      <path d="M14.5 9.5h3M14.5 12.5h3" />
    </template>
    <!-- shield (certificate / verification) -->
    <template v-else-if="name === 'shield'">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </template>
    <!-- shield with a cross (failed verification) -->
    <template v-else-if="name === 'shield-x'">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
    </template>
    <!-- alert triangle (warning / can't verify) -->
    <template v-else-if="name === 'alert'">
      <path d="M12 4l9.5 16h-19z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </template>
    <!-- clock (timestamps / relative time) -->
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
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
