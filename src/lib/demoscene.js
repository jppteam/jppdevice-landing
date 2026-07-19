// ---------------------------------------------------------------------------
// demoscene.js — a faithful JavaScript port of the J++Device DemoScene
// (dev only assets/demoscene src/demoscene.c). Same 8 scenes, same integer
// math: a 64-step quarter-sine LUT, a 4x4 Bayer ordered-dither matrix, a 3x5
// pixel font, and a sine-wave scrolltext. The FreeRTOS / buzzer / keypad
// plumbing is dropped; this renders into a 128x64 one-bit framebuffer and
// auto-advances scenes, driven by an external ~30fps tick.
//
// Integer semantics are preserved: Math.trunc() for C integer division that can
// go negative, `& 0xff` for uint8_t casts, and `>>`/`^` (which coerce to int32,
// matching 32-bit C) for the bit-twiddling effects.
// ---------------------------------------------------------------------------

export const DW = 128
export const DH = 64

const FRAME_MS = 33
const SCENE_MS = 12000
export const SCENE_FRAMES = Math.round(SCENE_MS / FRAME_MS) // ~364
const OSD_FRAMES = 45

// ---- Integer trig / dither / rng -----------------------------------------

// Quarter sine wave, 64 steps, amplitude 127.
const K_QSIN = [
  0, 3, 6, 9, 12, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46,
  49, 51, 54, 57, 60, 63, 65, 68, 71, 73, 76, 78, 81, 83, 85, 88,
  90, 92, 94, 96, 98, 100, 102, 104, 106, 107, 109, 111, 112, 113, 115, 116,
  117, 118, 120, 121, 122, 122, 123, 124, 125, 125, 126, 126, 126, 127, 127, 127,
]

// sin over a 0-255 circle, returns -127..127.
function sin8(a) {
  a &= 0xff
  const i = a & 63
  switch (a >> 6) {
    case 0: return K_QSIN[i]
    case 1: return K_QSIN[63 - i]
    case 2: return -K_QSIN[i]
    default: return -K_QSIN[63 - i]
  }
}
function cos8(a) { return sin8((a + 64) & 0xff) }

// 4x4 Bayer ordered-dither matrix (thresholds 0-15).
const K_BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

function isqrt32(v) {
  v = v >>> 0
  let r = 0
  let bit = 1 << 30
  while (bit > v) bit >>= 2
  while (bit !== 0) {
    if (v >= r + bit) {
      v -= r + bit
      r = (r >> 1) + bit
    } else {
      r >>= 1
    }
    bit >>= 2
  }
  return r
}

// atan2 over a 0-255 circle (octant approximation).
function iatan2_8(y, x) {
  if (x === 0 && y === 0) return 0
  const ax = x < 0 ? -x : x
  const ay = y < 0 ? -y : y
  let a
  if (ax > ay) a = Math.trunc((ay * 32) / ax)
  else a = 64 - Math.trunc((ax * 32) / ay)
  if (x < 0) a = 128 - a
  if (y < 0) a = 256 - a
  return a & 0xff
}

// ---- 3x5 font (same glyph data as the firmware) --------------------------

const K_FONT_DIGITS = [
  [7, 5, 5, 5, 7], [2, 6, 2, 2, 7], [7, 1, 7, 4, 7], [7, 1, 7, 1, 7], [5, 5, 7, 1, 1],
  [7, 4, 7, 1, 7], [7, 4, 7, 5, 7], [7, 1, 1, 2, 2], [7, 5, 7, 5, 7], [7, 5, 7, 1, 7],
]
const K_FONT_UPPER = [
  [2, 5, 7, 5, 5], [6, 5, 6, 5, 6], [3, 4, 4, 4, 3], [6, 5, 5, 5, 6], [7, 4, 7, 4, 7],
  [7, 4, 7, 4, 4], [3, 4, 5, 5, 3], [5, 5, 7, 5, 5], [7, 2, 2, 2, 7], [1, 1, 1, 5, 2],
  [5, 5, 6, 5, 5], [4, 4, 4, 4, 7], [5, 7, 7, 5, 5], [6, 5, 5, 5, 5], [7, 5, 5, 5, 7],
  [7, 5, 7, 4, 4], [7, 5, 5, 7, 1], [7, 5, 6, 5, 5], [3, 4, 2, 1, 6], [7, 2, 2, 2, 2],
  [5, 5, 5, 5, 7], [5, 5, 5, 5, 2], [5, 5, 7, 7, 5], [5, 5, 2, 5, 5], [5, 5, 2, 2, 2],
  [7, 1, 2, 4, 7],
]
const K_SPACE = [0, 0, 0, 0, 0]
const K_DASH = [0, 0, 7, 0, 0]
const K_DOT = [0, 0, 0, 0, 2]
const K_BANG = [2, 2, 2, 0, 2]
const K_STAR = [5, 2, 7, 2, 5]
const K_PLUS = [0, 2, 7, 2, 0]
const K_COLON = [0, 2, 0, 2, 0]
const K_SLASH = [1, 1, 2, 4, 4]

function glyphRows(c) {
  if (c >= '0' && c <= '9') return K_FONT_DIGITS[c.charCodeAt(0) - 48]
  if (c >= 'A' && c <= 'Z') return K_FONT_UPPER[c.charCodeAt(0) - 65]
  if (c >= 'a' && c <= 'z') return K_FONT_UPPER[c.charCodeAt(0) - 97]
  switch (c) {
    case '-': return K_DASH
    case '.': return K_DOT
    case '!': return K_BANG
    case '*': return K_STAR
    case '+': return K_PLUS
    case ':': return K_COLON
    case '/': return K_SLASH
    default: return K_SPACE
  }
}

// ---- Scrolltext ----------------------------------------------------------

const K_SCROLL_MSG =
  '* * *   JPPDOS MEGADEMO   * * *   ' +
  'RUNNING ON A 160 MHZ RISC-V WITH 128X64 PIXELS OF PURE OLDSKOOL...   ' +
  'ALL INTEGER MATH - THE BAYER MATRIX IS DOING THE HEAVY LIFTING...   ' +
  'LEFT/RIGHT: CHANGE SCENE   UP: MUSIC   DOWN: AUTOPILOT   ' +
  'HOLD CENTER TO EXIT...   ' +
  'GREETINGS FLY OUT TO EVERY DEVICE STUCK IN DUMMY MODE...   ' +
  'KEEP THE SCENE ALIVE!         '
const SCROLL_CHARS = K_SCROLL_MSG.length
const SCROLL_ADVANCE = 8

const STAR_COUNT = 96

export class Demoscene {
  constructor(seed) {
    // 1-bit framebuffer, one byte (0/1) per pixel.
    this.fb = new Uint8Array(DW * DH)
    this.rngState = (0x2a5c1d3b ^ ((seed || Date.now()) | 1)) >>> 0

    // Scene state.
    this.stars = { x: new Int16Array(STAR_COUNT), y: new Int16Array(STAR_COUNT), z: new Uint16Array(STAR_COUNT) }
    this.tun = { ang: new Uint8Array(32 * 64), dep: new Uint8Array(32 * 64) }
    this.fire = new Uint8Array(34 * 64)

    this.scenes = [
      { name: 'INTRO', init: null, render: (t) => this.sceneIntro(t), scroller: false },
      { name: 'STARFIELD', init: () => this.starfieldInit(), render: (t) => this.sceneStarfield(t), scroller: true },
      { name: 'PLASMA', init: null, render: (t) => this.scenePlasma(t), scroller: true },
      { name: 'ROTOZOOM', init: null, render: (t) => this.sceneRotozoom(t), scroller: true },
      { name: 'TUNNEL', init: () => this.tunnelInit(), render: (t) => this.sceneTunnel(t), scroller: true },
      { name: 'CUBE', init: null, render: (t) => this.sceneCube(t), scroller: true },
      { name: 'FIRE', init: () => this.fireInit(), render: (t) => this.sceneFire(t), scroller: true },
      { name: 'CREDITS', init: null, render: (t) => this.sceneCredits(t), scroller: false },
    ]

    this.scene = 0
    this.sceneT = 0
    this.gt = 0
    this.osdUntil = 0
    if (this.scenes[0].init) this.scenes[0].init()
  }

  rng() {
    let x = this.rngState
    x ^= (x << 13); x >>>= 0
    x ^= (x >>> 17)
    x ^= (x << 5); x >>>= 0
    this.rngState = x >>> 0
    return this.rngState
  }

  // ---- framebuffer primitives -------------------------------------------

  px(x, y, on) {
    if (x >>> 0 >= DW || y >>> 0 >= DH) return
    this.fb[y * DW + x] = on ? 1 : 0
  }

  fbClear() { this.fb.fill(0) }

  line(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1
    let dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    for (;;) {
      this.px(x0, y0, true)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) { err += dy; x0 += sx }
      if (e2 <= dx) { err += dx; y0 += sy }
    }
  }

  // 2x2 ordered-dithered block at block coords, intensity 0-255.
  block2(bx, by, v) {
    const x = bx * 2, y = by * 2
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const thr = K_BAYER[(y + dy) & 3][(x + dx) & 3] * 16 + 8
        this.px(x + dx, y + dy, v > thr)
      }
    }
  }

  text(x, y, s, scale) {
    for (let k = 0; k < s.length; k++) {
      const rows = glyphRows(s[k])
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 3; c++) {
          if (rows[r] & (4 >> c)) {
            for (let j = 0; j < scale; j++) {
              for (let i = 0; i < scale; i++) {
                this.px(x + c * scale + i, y + r * scale + j, true)
              }
            }
          }
        }
      }
      x += 4 * scale
    }
  }

  // Text with a 1px cleared halo so it stays readable over a busy effect.
  textHalo(x, y, s, scale) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        let cx = x + dx
        for (let k = 0; k < s.length; k++) {
          const rows = glyphRows(s[k])
          for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 3; c++) {
              if (rows[r] & (4 >> c)) {
                for (let j = 0; j < scale; j++) {
                  for (let i = 0; i < scale; i++) {
                    this.px(cx + c * scale + i, y + dy + r * scale + j, false)
                  }
                }
              }
            }
          }
          cx += 4 * scale
        }
      }
    }
    this.text(x, y, s, scale)
  }

  // ---- scenes -----------------------------------------------------------

  sceneIntro(t) {
    this.fbClear()
    for (let i = 0; i < 40; i++) {
      const h = (i * 2654435761) >>> 0
      const sx = h % DW
      const sy = (h >>> 8) % DH
      if (((t >> 3) + i) % 7 !== 0) this.px(sx, sy, true)
    }
    this.textHalo((DW - textW('FABLE 5 PRESENTS', 1)) >> 1, 6, 'FABLE 5 PRESENTS', 1)
    this.textHalo((DW - textW('JPPDOS', 3)) >> 1, 18, 'JPPDOS', 3)
    this.textHalo((DW - textW('MEGADEMO', 2)) >> 1, 38, 'MEGADEMO', 2)
    switch ((t >> 4) & 3) {
      case 0:
        this.textHalo((DW - textW('PRESS OK TO PROCEED', 1)) >> 1, 56, 'PRESS OK TO PROCEED', 1)
        break
      case 2:
        this.textHalo((DW - textW('1 BIT - NO FPU - NO FEAR', 1)) >> 1, 56, '1 BIT - NO FPU - NO FEAR', 1)
        break
      default:
        break
    }
  }

  starfieldInit() {
    for (let i = 0; i < STAR_COUNT; i++) {
      this.stars.x[i] = (this.rng() & 0x7fff) - 16384
      this.stars.y[i] = (this.rng() & 0x7fff) - 16384
      this.stars.z[i] = 64 + (this.rng() % 4032)
    }
  }

  sceneStarfield(t) {
    this.fbClear()
    const speed = 48 + ((sin8(Math.trunc(t / 2)) + 127) >> 2)
    for (let i = 0; i < STAR_COUNT; i++) {
      let z = this.stars.z[i] - speed
      if (z < 32) {
        this.stars.x[i] = (this.rng() & 0x7fff) - 16384
        this.stars.y[i] = (this.rng() & 0x7fff) - 16384
        z = 4095
      }
      this.stars.z[i] = z
      const sx = 64 + Math.trunc(this.stars.x[i] / z) * 2
      const sy = 32 + Math.trunc(this.stars.y[i] / z) * 2
      if (sx >>> 0 >= DW || sy >>> 0 >= DH) continue
      this.px(sx, sy, true)
      if (z < 1024) {
        this.px(sx + 1, sy, true)
        if (z < 400) {
          this.px(sx, sy + 1, true)
          this.px(sx + 1, sy + 1, true)
        }
      }
    }
  }

  scenePlasma(t) {
    const t2 = (t * 2) & 0xff, t3 = (t * 3) & 0xff, t4 = (t * 4) & 0xff
    const cx = 32 + (sin8((t * 2) & 0xff) >> 3)
    const cy = 16 + Math.trunc(cos8((t * 3) & 0xff) / 12)
    for (let by = 0; by < 32; by++) {
      const dy = by - cy
      for (let bx = 0; bx < 64; bx++) {
        const dx = bx - cx
        const d = isqrt32(dx * dx + dy * dy)
        const v =
          sin8((bx * 6 + t2) & 0xff) +
          sin8((by * 9 - t3) & 0xff) +
          sin8(((bx + by) * 4 + t4) & 0xff) +
          sin8((d * 9 - t3) & 0xff)
        this.block2(bx, by, (v + 512) >> 2)
      }
    }
  }

  sceneRotozoom(t) {
    const zoom = 300 + Math.trunc((sin8((t * 2) & 0xff) * 3) / 2)
    const c = Math.trunc((cos8(t & 0xff) * zoom) / 128)
    const s = Math.trunc((sin8(t & 0xff) * zoom) / 128)
    const ox = (t * 97) | 0
    const oy = (t * 31) | 0
    for (let y = 0; y < DH; y++) {
      let u = ox + -64 * c - (y - 32) * s
      let v = oy + -64 * s + (y - 32) * c
      for (let x = 0; x < DW; x++) {
        this.px(x, y, (((u >> 11) ^ (v >> 11)) & 1) !== 0)
        u += c
        v += s
      }
    }
  }

  tunnelInit() {
    for (let by = 0; by < 32; by++) {
      const dy = by * 2 - 31
      for (let bx = 0; bx < 64; bx++) {
        const dx = bx * 2 - 63
        let r = isqrt32(dx * dx + dy * dy)
        if (r === 0) r = 1
        const d = Math.trunc(2048 / r)
        this.tun.ang[by * 64 + bx] = iatan2_8(dy, dx)
        this.tun.dep[by * 64 + bx] = d > 255 ? 255 : d
      }
    }
  }

  sceneTunnel(t) {
    const rot = (t * 2 + (sin8(t & 0xff) >> 2)) & 0xff
    const fly = (t * 6) & 0xff
    for (let by = 0; by < 32; by++) {
      for (let bx = 0; bx < 64; bx++) {
        const idx = by * 64 + bx
        const dep = this.tun.dep[idx]
        const on =
          ((((this.tun.ang[idx] + rot) & 0xff) >> 5) ^ (((dep + fly) & 0xff) >> 5)) & 1
        const bright = 255 - (dep > 220 ? 220 : dep)
        this.block2(bx, by, on ? bright : 0)
      }
    }
  }

  sceneCube(t) {
    this.fbClear()
    const size = 52 + (sin8((t * 4) & 0xff) >> 3)
    const sx1 = sin8((t * 2) & 0xff), cx1 = cos8((t * 2) & 0xff)
    const sy1 = sin8((t * 3) & 0xff), cy1 = cos8((t * 3) & 0xff)
    const sz1 = sin8(t & 0xff), cz1 = cos8(t & 0xff)
    const V = K_CUBE_V
    const pxs = new Array(8), pys = new Array(8)
    for (let i = 0; i < 8; i++) {
      const x = V[i][0] * size
      const y = V[i][1] * size
      const z = V[i][2] * size
      const y1 = (y * cx1 - z * sx1) >> 7
      const z1 = (y * sx1 + z * cx1) >> 7
      const x2 = (x * cy1 + z1 * sy1) >> 7
      const z2 = (-x * sy1 + z1 * cy1) >> 7
      const x3 = (x2 * cz1 - y1 * sz1) >> 7
      const y3 = (x2 * sz1 + y1 * cz1) >> 7
      const d = z2 + 260
      pxs[i] = 64 + Math.trunc((x3 * 70) / d)
      pys[i] = 32 + Math.trunc((y3 * 70) / d)
    }
    for (let i = 0; i < 12; i++) {
      const e = K_CUBE_E[i]
      this.line(pxs[e[0]], pys[e[0]], pxs[e[1]], pys[e[1]])
    }
  }

  fireInit() { this.fire.fill(0) }

  sceneFire() {
    for (let x = 0; x < 64; x++) {
      const v = (this.rng() & 7) > 1 ? 255 : 0
      this.fire[32 * 64 + x] = v
      this.fire[33 * 64 + x] = v
    }
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        const xl = x > 0 ? x - 1 : 0
        const xr = x < 63 ? x + 1 : 63
        let v =
          (this.fire[(y + 1) * 64 + xl] +
            this.fire[(y + 1) * 64 + x] +
            this.fire[(y + 1) * 64 + xr] +
            this.fire[(y + 2) * 64 + x]) >> 2
        v -= this.rng() & 15
        this.fire[y * 64 + x] = v < 0 ? 0 : v
        this.block2(x, y, this.fire[y * 64 + x])
      }
    }
  }

  sceneCredits(t) {
    this.fbClear()
    for (let k = 0; k < 3; k++) {
      const yc = 32 + Math.trunc(sin8((t * 3 + k * 85) & 0xff) / 3)
      for (let dy = -5; dy <= 5; dy++) {
        const y = yc + dy
        if (y >>> 0 >= DH) continue
        const v = 200 - Math.abs(dy) * 36
        for (let x = 0; x < DW; x++) {
          const thr = K_BAYER[y & 3][x & 3] * 16 + 8
          if (v > thr) this.px(x, y, true)
        }
      }
    }
    this.textHalo((DW - textW('CODE + GFX + MUSIC', 1)) >> 1, 8, 'CODE + GFX + MUSIC', 1)
    this.textHalo((DW - textW('FABLE 5', 2)) >> 1, 17, 'FABLE 5', 2)
    this.textHalo((DW - textW('GREETZ:', 1)) >> 1, 34, 'GREETZ:', 1)
    this.textHalo((DW - textW('M4L3VICH * J++ CHAT', 1)) >> 1, 42, 'M4L3VICH * J++ CHAT', 1)
    this.textHalo((DW - textW('LOOPS FOREVER...', 1)) >> 1, 54, 'LOOPS FOREVER...', 1)
  }

  drawScroller(gt) {
    const span = SCROLL_CHARS * SCROLL_ADVANCE + DW
    const head = DW - ((gt * 2) % span)
    for (let i = 0; i < SCROLL_CHARS; i++) {
      const cx = head + i * SCROLL_ADVANCE
      if (cx <= -SCROLL_ADVANCE || cx >= DW) continue
      const ch = K_SCROLL_MSG[i]
      if (ch === ' ') continue
      const y = 48 + Math.trunc((sin8((cx * 2 + gt * 5) & 0xff) * 5) / 127)
      this.textHalo(cx, y, ch, 2)
    }
  }

  // ---- driver -----------------------------------------------------------

  advance(step) {
    let next = (this.scene + step) % this.scenes.length
    if (next < 0) next += this.scenes.length
    this.scene = next
    this.sceneT = 0
    this.osdUntil = this.gt + OSD_FRAMES
    if (this.scenes[this.scene].init) this.scenes[this.scene].init()
  }

  // Render one frame into this.fb. Auto-advances scenes on a timer.
  tick() {
    if (this.sceneT >= SCENE_FRAMES) this.advance(1)
    const sc = this.scenes[this.scene]
    sc.render(this.sceneT)
    if (sc.scroller) this.drawScroller(this.gt)
    if (this.gt < this.osdUntil) this.textHalo(2, 2, sc.name, 1)
    this.gt++
    this.sceneT++
  }
}

function textW(s, scale) {
  const n = s.length
  return n > 0 ? n * 4 * scale - scale : 0
}

const K_CUBE_V = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
]
const K_CUBE_E = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
]

export default Demoscene
