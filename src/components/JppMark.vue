<script setup>
import { computed } from 'vue'
import { logo } from '../assets/logo/logoPaths.js'

const props = defineProps({
  bar: { type: Boolean, default: true },
})

const cap = logo.capHeight
const pad = cap * 0.12
const b = logo.jpp.bbox
const barLeft = logo.jpp.bbox.x1 - 0.7 * cap

const view = computed(() => {
  const left = (props.bar ? barLeft : b.x1) - pad
  const right = b.x2 + pad
  const top = b.y1 - pad
  const bottom = b.y2 + pad
  return { x: left, y: top, w: right - left, h: bottom - top }
})
</script>

<template>
  <span class="jpp" role="img" aria-label="J++">
    <svg
      class="jpp__svg"
      :viewBox="`${view.x} ${view.y} ${view.w} ${view.h}`"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        v-if="bar"
        class="jpp__bar"
        :x="barLeft"
        :y="logo.bar.top"
        :width="logo.bar.right - barLeft"
        :height="logo.bar.bottom - logo.bar.top"
      />
      <path class="jpp__ink" :d="logo.jpp.d" />
    </svg>
  </span>
</template>

<style scoped>
.jpp {
  display: inline-block;
  line-height: 1;
}
.jpp__svg {
  display: block;
  height: 1em;
  width: auto;
  overflow: visible;
}
.jpp__ink {
  fill: var(--wm-ink, currentColor);
}
.jpp__bar {
  fill: var(--wm-bar, var(--yellow, #fdf254));
}
</style>
