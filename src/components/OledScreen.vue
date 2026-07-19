<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { Demoscene, DW, DH } from '../lib/demoscene.js'

const { t } = useI18n()

const props = defineProps({
  // CSS pixel size per OLED pixel (the canvas is DW*scale × DH*scale).
  scale: { type: Number, default: 5 },
  // Start on a specific scene index (0 = INTRO); null = natural sequence.
  startScene: { type: Number, default: null },
  autoAdvance: { type: Boolean, default: true },
  glow: { type: Boolean, default: true },
  // When true, canvas fills its parent (aspect preserved by 2:1 backing store).
  fluid: { type: Boolean, default: false },
})

const canvas = ref(null)
const root = ref(null)
let demo, ctx, imageData, buf32, raf, io
let visible = true
let acc = 0
let last = 0
const FRAME_MS = 33

// OLED phosphor: pale blue-white pixels on near-black, like the real SSD1306.
const ON = 0xfff2ecdf // ABGR little-endian → #dfecf2-ish, alpha ff
const OFF = 0xff0b0e12

function paint() {
  demo.tick()
  const fb = demo.fb
  for (let i = 0; i < fb.length; i++) buf32[i] = fb[i] ? ON : OFF
  ctx.putImageData(imageData, 0, 0)
}

function loop(now) {
  raf = requestAnimationFrame(loop)
  if (!visible) { last = now; return }
  if (!last) last = now
  acc += now - last
  last = now
  if (acc >= FRAME_MS) {
    // Advance at most a few frames if the tab was throttled.
    let steps = Math.min(4, Math.floor(acc / FRAME_MS))
    acc -= steps * FRAME_MS
    while (steps-- > 1) demo.tick()
    paint()
  }
}

onMounted(() => {
  const c = canvas.value
  // Backing store is native OLED resolution; CSS scales it up crisply.
  c.width = DW
  c.height = DH
  ctx = c.getContext('2d')
  imageData = ctx.createImageData(DW, DH)
  buf32 = new Uint32Array(imageData.data.buffer)

  demo = new Demoscene()
  if (props.startScene != null) {
    demo.scene = props.startScene
    demo.sceneT = 0
    if (demo.scenes[demo.scene].init) demo.scenes[demo.scene].init()
  }
  if (!props.autoAdvance) {
    // Freeze on the chosen scene by keeping sceneT below the advance threshold.
    demo.advance = () => {}
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // Render a few frames for a settled still, then stop.
    for (let i = 0; i < 30; i++) demo.tick()
    paint()
    return
  }

  io = new IntersectionObserver(
    (entries) => { visible = entries[0].isIntersecting },
    { threshold: 0.05 }
  )
  io.observe(root.value)

  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  if (io) io.disconnect()
})
</script>

<template>
  <div ref="root" class="oled" :class="{ 'oled--glow': glow, 'oled--fluid': fluid }">
    <canvas
      ref="canvas"
      class="oled__canvas"
      :style="fluid ? { width: '100%', height: '100%' } : { width: DW * scale + 'px', height: DH * scale + 'px' }"
      role="img"
      :aria-label="t('oled.ariaLabel')"
    />
    <div class="oled__scanlines" aria-hidden="true" />
  </div>
</template>

<style scoped>
.oled {
  position: relative;
  display: inline-block;
  background: #0b0e12;
  line-height: 0;
}

.oled--fluid {
  display: block;
  width: 100%;
  height: 100%;
}

.oled__canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
}

.oled--glow .oled__canvas {
  filter: drop-shadow(0 0 3px rgba(199, 224, 255, 0.35));
}

/* Faint scanline + vignette to sell the physical panel. */
.oled__scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0,
      rgba(0, 0, 0, 0) 2px,
      rgba(0, 0, 0, 0.16) 3px
    ),
    radial-gradient(120% 120% at 50% 50%, rgba(0, 0, 0, 0) 60%, rgba(0, 0, 0, 0.35) 100%);
  mix-blend-mode: multiply;
}

@media (prefers-reduced-motion: reduce) {
  .oled--glow .oled__canvas {
    filter: none;
  }
}
</style>
