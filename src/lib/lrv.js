// ---------------------------------------------------------------------------
// J++Device LRV (Limited Run Verification) — Ed25519 certificate + live
// response checking. Pure functions, no DOM/Vue dependencies, so this same
// module backs both the public /verify page and the Manager page's device
// info badge (JPPDOS firmware handoff spec, "dev only assets/lrv-verify-page-spec.md").
//
// Everything here operates on exact bytes. Ed25519 signatures are exact-byte
// checks — this module never "fixes" or reflows input; callers decide what
// (if any) minimal normalization to apply before handing bytes in.
// ---------------------------------------------------------------------------

import nacl from 'tweetnacl'

// The manufacturer's public verification key — the one trust anchor. This is
// a *public* key (safe to ship client-side), never taken from user input.
export const MFR_PUBKEY_HEX = '78d8ff9fc9a4c9898f02aa3d3ad4342037facbd0144ad8576f7fdc69922f782f'
export const MFR_PUBKEY_BYTES = hexToBytes(MFR_PUBKEY_HEX)

export const EPOCH_PLACEHOLDER = '1970-01-01T00:00:00Z'

const CHALLENGE_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const CERT_RE = /^serial=(\d+)\nrun_size=(\d+)\ndevice_type=(\d+)\nhwid=([0-9A-Fa-f]{2}(?::[0-9A-Fa-f]{2}){5})\ndevice_pubkey=([0-9A-Fa-f]{64})\n$/

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function utf8ToBytes(str) {
  return textEncoder.encode(str)
}

export function bytesToUtf8(bytes) {
  return textDecoder.decode(bytes)
}

// ---- hex / base64url codecs -----------------------------------------------

export function hexToBytes(hex) {
  const clean = String(hex).trim()
  if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9A-Fa-f]+$/.test(clean)) {
    throw new Error('Invalid hex string')
  }
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes) {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

// atob/btoa don't understand '-'/'_'; swap to standard base64 alphabet first.
// Padding is kept on encode (matches the firmware's own encoder) and restored
// on decode if the input arrived without it.
export function b64urlToBytes(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4 !== 0) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function bytesToB64url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_')
}

// Manual-paste signature field: hex (as shown on-device) or base64url (as
// used in the redirect URL), auto-detected. Always 64 raw bytes or null.
export function decodeSignatureInput(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const isHexish = /^[0-9A-Fa-f\s]+$/.test(trimmed)
  if (isHexish) {
    const hex = trimmed.replace(/\s+/g, '')
    if (hex.length === 128) return hexToBytes(hex)
    // Not standard hex length — fall through in case this was actually
    // base64url text that happens to only contain [0-9A-Fa-f] characters.
  }
  try {
    const bytes = b64urlToBytes(trimmed.replace(/\s+/g, ''))
    return bytes.length === 64 ? bytes : null
  } catch {
    return null
  }
}

// ---- certificate text -------------------------------------------------

// Minimal paste-artifact cleanup only: normalize line endings and trim at
// most one leading/trailing blank line. Never touches internal whitespace,
// case, or line order — this is NOT used for flow-2 (query param) bytes,
// which are verified exactly as issued with no canonicalization at all.
export function normalizeCertText(raw) {
  let text = String(raw).replace(/\r\n/g, '\n')
  if (text.startsWith('\n')) text = text.slice(1)
  if (text.endsWith('\n\n')) text = text.slice(0, -1)
  return text
}

// Display-only parse of the 5-line canonical cert format. Returns null for
// anything that doesn't match exactly (extra/missing lines, wrong order,
// missing trailing newline) — verification never depends on this succeeding.
export function parseCertText(text) {
  if (typeof text !== 'string') return null
  const m = CERT_RE.exec(text)
  if (!m) return null
  return {
    serial: m[1],
    runSize: m[2],
    deviceType: Number(m[3]),
    hwid: m[4],
    devicePubkeyHex: m[5].toLowerCase(),
  }
}

// Optional secondary input mode: assemble the canonical cert text from
// individual fields, in the exact required format/order.
export function buildCertText({ serial, runSize, deviceType, hwid, devicePubkey }) {
  return `serial=${serial}\nrun_size=${runSize}\ndevice_type=${deviceType}\nhwid=${hwid}\ndevice_pubkey=${String(devicePubkey).toLowerCase()}\n`
}

// ---- challenge string (Check 2 message) --------------------------------

// For DISPLAY only — Check 2 always verifies the challenge as one opaque
// byte blob. Split on the *last* '|' (a username could itself contain '|'),
// and only treat the tail as a timestamp if it matches the required shape.
export function splitChallengeForDisplay(challenge) {
  if (typeof challenge !== 'string' || challenge === '') return null
  const idx = challenge.lastIndexOf('|')
  if (idx === -1) return { raw: challenge }
  const username = challenge.slice(0, idx)
  const timestamp = challenge.slice(idx + 1)
  if (!CHALLENGE_TS_RE.test(timestamp)) return { raw: challenge }
  return { username, timestamp }
}

export function parseIso8601Utc(ts) {
  if (typeof ts !== 'string' || !CHALLENGE_TS_RE.test(ts)) return null
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? null : d
}

export function relativeTimeLabel(date, locale, now = new Date()) {
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs || unit === 'second') {
      return rtf.format(Math.round(diffSec / secs), unit)
    }
  }
  return rtf.format(0, 'second')
}

// ---- Ed25519 verification -----------------------------------------------

export function verifyCertBytes(certBytes, certSigBytes, mfrPubkeyBytes = MFR_PUBKEY_BYTES) {
  if (!(certBytes instanceof Uint8Array) || certBytes.length === 0) return false
  if (!(certSigBytes instanceof Uint8Array) || certSigBytes.length !== 64) return false
  if (!(mfrPubkeyBytes instanceof Uint8Array) || mfrPubkeyBytes.length !== 32) return false
  try {
    return nacl.sign.detached.verify(certBytes, certSigBytes, mfrPubkeyBytes)
  } catch {
    return false
  }
}

export function verifyResponseBytes(challengeBytes, respSigBytes, devicePubkeyBytes) {
  if (!(challengeBytes instanceof Uint8Array)) return false
  if (!(respSigBytes instanceof Uint8Array) || respSigBytes.length !== 64) return false
  if (!(devicePubkeyBytes instanceof Uint8Array) || devicePubkeyBytes.length !== 32) return false
  try {
    return nacl.sign.detached.verify(challengeBytes, respSigBytes, devicePubkeyBytes)
  } catch {
    return false
  }
}

// ---- combined verdict -----------------------------------------------------

export const VERDICT = {
  INVALID: 'invalid', // missing/unparseable input — no check could be attempted
  CERT_FAIL: 'certFail', // cert signature doesn't match the manufacturer key
  CERT_ONLY: 'certOnly', // cert genuine, no (complete) live response to check
  RESP_FAIL: 'respFail', // cert genuine, response signature doesn't match
  VERIFIED: 'verified', // cert genuine AND response signature matches
}

export function computeVerdict({ certAttempted, certValid, certParsed, responseAttempted, responseValid }) {
  if (!certAttempted) return VERDICT.INVALID
  if (!certValid) return VERDICT.CERT_FAIL
  // Check 2 requires a trusted device_pubkey extracted from the
  // already-verified cert text — never a bare user-supplied value.
  if (!certParsed || !responseAttempted) return VERDICT.CERT_ONLY
  return responseValid ? VERDICT.VERIFIED : VERDICT.RESP_FAIL
}

// ---- flow-2 query params ----------------------------------------------

// Builds the same query scheme the device's redirect uses (spec §4), from a
// live-read LRV identity: { cert: string, certSig: Uint8Array(64),
// challenge?: string, respSig?: Uint8Array(64) }. Used to deep-link from the
// Manager page into a prefilled, auto-verifying /verify.
export function buildVerifyQuery({ cert, certSig, challenge, respSig }) {
  const query = {}
  const parsed = parseCertText(cert)
  if (parsed) query.serial = parsed.serial
  query.cert = bytesToB64url(utf8ToBytes(cert))
  query.certsig = bytesToB64url(certSig)
  if (challenge) query.challenge = challenge
  if (respSig) query.resp = bytesToB64url(respSig)
  return query
}
