// Generate a self-contained OG SVG (1200×630) with all text traced to paths, so
// it rasterizes to PNG with no font dependency. Run: node scripts/gen-og.mjs
import opentype from 'opentype.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const fontsDir = path.join(root, 'node_modules/@fontsource/outfit/files')
const load = (f) => {
  const b = fs.readFileSync(path.join(fontsDir, f))
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))
}
const black = load('outfit-latin-900-normal.woff')
const regular = load('outfit-latin-400-normal.woff')
const semi = load('outfit-latin-600-normal.woff')
const pd = (p) => p.toPathData(2)

const W = 1200, H = 630

// --- Wordmark (J++ Black + Device Regular) ---
const S = 150
const bx = 150
const baseline = 250
const jppW = black.getAdvanceWidth('J++', S)
const deviceX = bx + jppW + regular.getAdvanceWidth(' ', S)
const jppPath = pd(black.getPath('J++', bx, baseline, S))
const devicePath = pd(regular.getPath('Device', deviceX, baseline, S))
const jb = black.getPath('J', bx, baseline, S).getBoundingBox()
const cap = baseline - jb.y1
const barTop = jb.y1
const barRight = jb.x1 + 0.42 * cap

// --- Tagline + url (traced) ---
const tagline = pd(semi.getPath('A pocket computer you write your own apps for.', bx, 360, 44))
const url = pd(semi.getPath('OPEN HARDWARE & FIRMWARE', bx, 545, 26))
const url2 = pd(regular.getPath('jppdevice.by.m4l3vi.ch', bx, 585, 26))

// --- Device silhouette (from the enclosure outline, scaled) ---
const SHELL =
  'm65 81h-50-1.9l-2.3-0.2-1.9-1.1-2.1-1.2-1.6-2.1-0.7-2.1-0.5-1.5v-1.5-1.3-55-1.9l0.2-2.3 1.1-1.9 1.2-2.1 2.1-1.6 2.1-0.7 1.5-0.5h1.5 1.3 50 1.9l2.3 0.2 1.9 1.1 2.1 1.2 1.6 2.1 0.7 2.1 0.5 1.5v1.5 1.3 55 1.9l-0.2 2.3-1.1 1.9-1.2 2.1-2.1 1.6-2.1 0.7-1.5 0.5h-1.5z'
const dScale = 5.6
const dx = 812
const dy = 60
const keys = [
  [64, 57.3], [29.2, 49.8], [29.2, 64.8], [16, 57.3], [42.5, 57.3],
]

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <!-- device -->
  <g transform="translate(${dx} ${dy}) scale(${dScale})" opacity="0.9">
    <path d="${SHELL}" fill="#f0f1ed" stroke="#dcded8" stroke-width="0.4"/>
    <rect x="26.4" y="19.6" width="27.2" height="15.8" rx="1.4" fill="#0b0e13"/>
    ${[...Array(26)].map(() => {
      const x = 28 + Math.random() * 24
      const y = 21 + Math.random() * 12
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="0.9" height="0.9" fill="#e8eefc" opacity="0.8"/>`
    }).join('')}
    ${keys.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="4.3" fill="#f26a1b"/>`).join('')}
    <circle cx="16" cy="12.5" r="1.15" fill="#39e0a0"/>
  </g>
  <!-- wordmark bar (bleeds off left) -->
  <rect x="0" y="${barTop.toFixed(1)}" width="${barRight.toFixed(1)}" height="${cap.toFixed(1)}" fill="#fdf254"/>
  <path d="${jppPath}" fill="#1a1a1a"/>
  <path d="${devicePath}" fill="#1a1a1a"/>
  <path d="${tagline}" fill="#1a1a1a"/>
  <path d="${url}" fill="#8a7a00"/>
  <path d="${url2}" fill="#6b6b6b"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="#fdf254"/>
</svg>
`
fs.writeFileSync(path.join(root, 'public/og.svg'), svg)
console.log('wrote public/og.svg', svg.length, 'bytes')
