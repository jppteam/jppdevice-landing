<script setup>
import { computed } from 'vue'
import { logo } from '../assets/logo/logoPaths.js'

const props = defineProps({
  bar: { type: Boolean, default: true }, // yellow highlight behind the J
  bleed: { type: Number, default: 1.35 }, // bar left-extension, in cap-heights
  bleedOut: { type: Boolean, default: false }, // bar runs off the left viewport edge
  subtitle: { type: String, default: '' }, // e.g. "Operating System"
  title: { type: String, default: 'J++ Device' }, // accessible name
})

const cap = logo.capHeight
const padY = cap * 0.14
const padX = cap * 0.1

// The wordmark viewBox holds only the glyphs; the bar is a CSS layer so it can
// bleed out of the viewport (matching banner.webp) without distorting the type.
const view = computed(() => {
  const left = logo.full.x1 - padX
  const right = logo.full.x2 + padX
  const top = logo.full.y1 - padY
  const bottom = logo.full.y2 + padY
  return { x: left, y: top, w: right - left, h: bottom - top }
})
const aspect = computed(() => view.value.w / view.value.h) // svg width in em (height = 1em)

// Bar band, expressed against the svg box.
const barStyle = computed(() => {
  const v = view.value
  const topPct = ((logo.bar.top - v.y) / v.h) * 100
  const hPct = ((logo.bar.bottom - logo.bar.top) / v.h) * 100
  const rightEm = ((logo.bar.right - v.x) / v.w) * aspect.value
  const barLeftUnits = logo.jpp.bbox.x1 - props.bleed * cap
  const leftEm = ((barLeftUnits - v.x) / v.w) * aspect.value
  return {
    top: topPct + '%',
    height: hPct + '%',
    right: `calc(100% - ${rightEm.toFixed(3)}em)`,
    left: props.bleedOut ? '-100vw' : `${leftEm.toFixed(3)}em`,
  }
})
</script>

<template>
  <span class="wm" role="img" :aria-label="title">
    <span class="wm__logo" :style="{ width: aspect + 'em' }">
      <span v-if="bar" class="wm__bar" :style="barStyle" />
      <svg
        class="wm__svg"
        :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path class="wm__ink" :d="logo.jpp.d" />
        <path class="wm__ink" :d="logo.device.d" />
      </svg>
    </span>
    <span v-if="subtitle" class="wm__subtitle">{{ subtitle }}</span>
  </span>
</template>

<style scoped>
/* Sizes like type: set font-size on the host to scale the whole lockup. */
.wm {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1;
}
.wm__logo {
  position: relative;
  display: block;
  height: 1em;
}
.wm__svg {
  position: relative;
  z-index: 1;
  display: block;
  height: 1em;
  width: auto;
  overflow: visible;
}
.wm__ink {
  fill: var(--wm-ink, currentColor);
}
.wm__bar {
  position: absolute;
  z-index: 0;
  background: var(--wm-bar, var(--yellow, #fdf254));
}
.wm__subtitle {
  margin-top: 0.24em;
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 0.36em;
  letter-spacing: 0.02em;
  color: var(--wm-subtitle-ink, var(--ink-3));
}
</style>
