<script setup>
// An original SVG of the J++Device, matching the real enclosure outline
// (dev only assets/jppdevice outline.svg): a rounded-square transparent PETG
// shell, a landscape OLED at top-center, a 4-way d-pad on the lower-left and a
// single action button on the right. Internals are intentionally omitted (clean
// transparent shell). A `render` slot is left for future product renders.
import OledScreen from './OledScreen.vue'

defineProps({
  startScene: { type: Number, default: null },
})

// Exact enclosure outline (80×85 space), traced from the CAD outline.
const SHELL =
  'm65 81h-50-1.9l-2.3-0.2-1.9-1.1-2.1-1.2-1.6-2.1-0.7-2.1-0.5-1.5v-1.5-1.3-55-1.9l0.2-2.3 1.1-1.9 1.2-2.1 2.1-1.6 2.1-0.7 1.5-0.5h1.5 1.3 50 1.9l2.3 0.2 1.9 1.1 2.1 1.2 1.6 2.1 0.7 2.1 0.5 1.5v1.5 1.3 55 1.9l-0.2 2.3-1.1 1.9-1.2 2.1-2.1 1.6-2.1 0.7-1.5 0.5h-1.5z'
</script>

<template>
  <div class="device">
    <slot name="render" />

    <svg class="device__svg" viewBox="0 0 80 85" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="dfShell" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color="#fcfcfb" />
          <stop offset="0.5" stop-color="#eef0ec" />
          <stop offset="1" stop-color="#e4e6e1" />
        </linearGradient>
        <linearGradient id="dfKey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff9648" />
          <stop offset="0.55" stop-color="#f26a1b" />
          <stop offset="1" stop-color="#d6540b" />
        </linearGradient>
        <radialGradient id="dfKeyTop" cx="0.5" cy="0.3" r="0.75">
          <stop offset="0" stop-color="#ffbe89" stop-opacity="0.95" />
          <stop offset="1" stop-color="#ffbe89" stop-opacity="0" />
        </radialGradient>
        <clipPath id="dfShellClip"><path :d="SHELL" /></clipPath>
      </defs>

      <!-- soft ground shadow -->
      <path :d="SHELL" transform="translate(0 1.2)" fill="#1a1a1a" opacity="0.10" />

      <!-- transparent PETG shell -->
      <path :d="SHELL" fill="url(#dfShell)" stroke="#d3d5cf" stroke-width="0.4" />

      <g clip-path="url(#dfShellClip)">
        <!-- 3D-print layer lines (subtle print texture) -->
        <g stroke="#c9ccc4" stroke-width="0.12" opacity="0.5">
          <line v-for="n in 108" :key="n" x1="6" :y1="4 + n * 0.72" x2="74" :y2="4 + n * 0.72" />
        </g>
        <!-- corner gloss -->
        <path d="M8 20 Q10 7 26 6 L12 6 Q7 8 7 22 Z" fill="#ffffff" opacity="0.5" />
        <!-- inner rim highlight -->
        <path :d="SHELL" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.55" />
      </g>

      <!-- OLED bezel (glass) -->
      <rect x="26.4" y="19.6" width="27.2" height="15.8" rx="1.4" fill="#0a0c11" stroke="#2b2e35" stroke-width="0.3" />

      <!-- Action button (right) -->
      <g>
        <circle cx="64" cy="57.7" r="4.3" fill="#b6470a" opacity="0.4" />
        <circle cx="64" cy="57.3" r="4.3" fill="url(#dfKey)" stroke="#b6470a" stroke-width="0.2" />
        <circle cx="64" cy="57.3" r="4.3" fill="url(#dfKeyTop)" />
        <text x="64" y="58.9" text-anchor="middle" font-family="Outfit, sans-serif" font-weight="800" font-size="3.6" fill="#7a2e04">A</text>
      </g>

      <!-- D-pad (lower-left): up / down / left / right -->
      <g>
        <!-- up -->
        <circle cx="29.2" cy="50.2" r="4.3" fill="#b6470a" opacity="0.4" />
        <circle cx="29.2" cy="49.8" r="4.3" fill="url(#dfKey)" stroke="#b6470a" stroke-width="0.2" />
        <circle cx="29.2" cy="49.8" r="4.3" fill="url(#dfKeyTop)" />
        <path d="M29.2 47.6 l1.7 2.7 h-3.4 z" fill="#7a2e04" />
        <!-- down -->
        <circle cx="29.2" cy="65.2" r="4.3" fill="#b6470a" opacity="0.4" />
        <circle cx="29.2" cy="64.8" r="4.3" fill="url(#dfKey)" stroke="#b6470a" stroke-width="0.2" />
        <circle cx="29.2" cy="64.8" r="4.3" fill="url(#dfKeyTop)" />
        <path d="M29.2 67 l1.7 -2.7 h-3.4 z" fill="#7a2e04" />
        <!-- left -->
        <circle cx="16" cy="57.7" r="4.3" fill="#b6470a" opacity="0.4" />
        <circle cx="16" cy="57.3" r="4.3" fill="url(#dfKey)" stroke="#b6470a" stroke-width="0.2" />
        <circle cx="16" cy="57.3" r="4.3" fill="url(#dfKeyTop)" />
        <path d="M13.8 57.3 l2.7 -1.7 v3.4 z" fill="#7a2e04" />
        <!-- right -->
        <circle cx="42.5" cy="57.7" r="4.3" fill="#b6470a" opacity="0.4" />
        <circle cx="42.5" cy="57.3" r="4.3" fill="url(#dfKey)" stroke="#b6470a" stroke-width="0.2" />
        <circle cx="42.5" cy="57.3" r="4.3" fill="url(#dfKeyTop)" />
        <path d="M44.7 57.3 l-2.7 -1.7 v3.4 z" fill="#7a2e04" />
      </g>

      <!-- USB-C on the bottom edge -->
      <rect x="36" y="80.5" width="8" height="1.5" rx="0.75" fill="#3a3d44" />
    </svg>

    <!-- Live OLED, positioned over the bezel's active area (kept 2:1). -->
    <div class="device__screen">
      <OledScreen fluid :glow="true" :start-scene="startScene" />
    </div>
  </div>
</template>

<style scoped>
.device {
  position: relative;
  width: 100%;
  max-width: 440px;
  margin-inline: auto;
}
.device__svg {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 24px 48px rgba(26, 26, 26, 0.16));
}
/* Active OLED area within the bezel, as % of the 80×85 viewBox.
   2:1 window: x=27.7 y=21.35 w=24.6 h=12.3 → screen path is 27.7..52.3 / 21..34. */
.device__screen {
  position: absolute;
  left: 34.63%; /* 27.7/80 */
  top: 25.12%; /* 21.35/85 */
  width: 30.75%; /* 24.6/80 */
  height: 14.47%; /* 12.3/85 */
  border-radius: 2px;
  overflow: hidden;
}
</style>
