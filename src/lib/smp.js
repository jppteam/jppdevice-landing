// ---------------------------------------------------------------------------
// JPPD-SMP — a JS port of the J++Device Serial Management Protocol for the
// browser, running over the Web Serial API (navigator.serial).
//
// Port of scripts/jppd_upload.py + the reference in docs/serial-protocol.md.
// The wire format is identical; only the transport differs (Web Serial vs
// pyserial). ESP32-C6 uses USB-Serial-JTAG, so no baud rate is configured.
// ---------------------------------------------------------------------------

export const PROTO_VERSION = 1
export const CHUNK_SIZE = 1024

export const CMD = {
  SESSION_START: 0x00,
  SESSION_END: 0x01,
  GET_INFO: 0x02,
  GET_LRV_DATA: 0x03,
  SET_TIME: 0x04,
  KEEPALIVE: 0x05,
  FS_LIST_DIR: 0x10,
  FS_MKDIR: 0x11,
  FS_REMOVE: 0x12,
  FS_RENAME: 0x13,
  FS_UPLOAD_BEGIN: 0x14,
  FS_UPLOAD_CHUNK: 0x15,
  FS_UPLOAD_END: 0x16,
  FS_DOWNLOAD_BEGIN: 0x17,
  FS_DOWNLOAD_CHUNK: 0x18,
  FS_DOWNLOAD_END: 0x19,
  APPLY_BACKUP: 0x1a,
}

export const STATUS = {
  OK: 0x00,
  ERR_DENIED: 0x01,
  ERR_NOT_FOUND: 0x02,
  ERR_IO: 0x03,
  ERR_EXISTS: 0x04,
  ERR_INVALID: 0x05,
  ERR_BUSY: 0x06,
  ERR_NO_SESSION: 0x07,
  ERR_TRANSFER: 0x08,
  ERR_OVERFLOW: 0x09,
  ERR_APP_RUNNING: 0x0a,
}

export const STATUS_NAMES = {
  0x00: 'OK',
  0x01: 'ERR_DENIED',
  0x02: 'ERR_NOT_FOUND',
  0x03: 'ERR_IO',
  0x04: 'ERR_EXISTS',
  0x05: 'ERR_INVALID',
  0x06: 'ERR_BUSY',
  0x07: 'ERR_NO_SESSION',
  0x08: 'ERR_TRANSFER',
  0x09: 'ERR_OVERFLOW',
  0x0a: 'ERR_APP_RUNNING',
}

// Device-initiated events reuse the response frame shape, with SEQ pinned to
// this reserved value — never a valid response SEQ — so a frame carrying it
// is unambiguously an event rather than a reply to something we sent.
export const EVENT_SEQ = 0xff

export const EVENT = {
  SESSION_ENDED: 0x01,
}

export const EVENT_NAMES = {
  0x01: 'SESSION_ENDED',
}

// How often to ping the device with KEEPALIVE while a session is open but
// otherwise idle (waiting on the user, redrawing the UI). Comfortably under
// the device's 30s session inactivity timeout.
const KEEPALIVE_INTERVAL_MS = 15000

const SOF = new Uint8Array([0x01, 0x4a, 0x50, 0x50])

// Detect whether the browser exposes the Web Serial API we need.
export function isWebSerialSupported() {
  return typeof navigator !== 'undefined' && !!navigator.serial && !!navigator.serial.requestPort
}

// ---- CRC helpers -----------------------------------------------------------

// CRC-16/CCITT-FALSE: poly=0x1021, init=0xFFFF, no reflection, no final XOR.
export function crc16CcittFalse(data) {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc
}

// CRC-32/ISO-HDLC (poly 0xEDB88320 reflected, init/xorout 0xFFFFFFFF) — matches
// Python's zlib.crc32, which the firmware uses for file integrity.
export function crc32(data) {
  const table = crc32.table || (crc32.table = makeCrc32Table())
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}
function makeCrc32Table() {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
}

// ---- Binary helpers --------------------------------------------------------

function u16le(v) {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff])
}
function u32le(v) {
  return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff])
}
function u64le(v) {
  const big = BigInt(v)
  const out = new Uint8Array(8)
  for (let i = 0; i < 8; i++) out[i] = Number((big >> BigInt(i * 8)) & 0xffn)
  return out
}
function readU32le(buf, off) {
  return buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)
}
function readU16le(buf, off) {
  return buf[off] | (buf[off + 1] << 8)
}
function readU64le(buf, off) {
  let v = 0n
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(buf[off + i])
  return v
}
function cstr(buf, off) {
  let end = off
  while (end < buf.length && buf[end] !== 0) end++
  const s = new TextDecoder().decode(buf.subarray(off, end))
  return { str: s, next: Math.min(end + 1, buf.length) }
}
function toCstr(s) {
  const bytes = new TextEncoder().encode(s)
  const out = new Uint8Array(bytes.length + 1)
  out.set(bytes)
  return out
}
function toHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---- Session class ---------------------------------------------------------

export class SmpError extends Error {
  constructor(status, context) {
    super(`${context}: ${STATUS_NAMES[status] || `0x${status.toString(16)}`}`)
    this.status = status
    this.context = context
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function _decodeNoise(bytes) {
  const s = new TextDecoder().decode(bytes).trim()
  return s
}

function _concat(a, b) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

export class SmpSession {
  constructor(port, log) {
    this.port = port
    this.log = log || (() => {})
    this.seq = 0
    this.reader = null
    this._buf = new Uint8Array(0)
    this._reading = false
    this._closed = false
    this._readPromise = null
    // Single background frame pump (see _pumpLoop) — the only reader of
    // _buf's framed contents. cmd() registers a pending waiter here keyed by
    // SEQ instead of reading frames itself, so a device-initiated event can
    // be dispatched the instant it arrives, even with no command in flight.
    this._pending = new Map()
    this._pumpRunning = false
    this._pumpPromise = null
    this._keepaliveTimer = null
    this._lastActivityAt = 0
    // Fired when a command response comes back ERR_NO_SESSION — the device's
    // authoritative signal that it has closed the session on its own (e.g.
    // cancelled on the OLED, or a device-side timeout), independent of
    // anything the host did.
    this.onSessionLost = null
    // Fired when the device proactively announces the session ended (the
    // user held OK) via the SESSION_ENDED event, rather than us finding out
    // from a failed command or the 30s timeout.
    this.onSessionEnded = null
  }

  // ---- transport primitives ----

  async open() {
    this._closed = false
    await this.port.open({ baudRate: 115200 })
    // Give the device a beat to settle the line, then start the continuous
    // background reader that drains the serial stream into this._buf.
    await sleep(60)
  }

  async close() {
    this._closed = true
    this._stopKeepalive()
    this._reading = false
    const readPromise = this._readPromise
    const pumpPromise = this._pumpPromise
    try {
      if (this.reader) {
        await this.reader.cancel()
      }
    } catch {
      /* already closed */
    }
    // Wait for the background read loop to actually exit — it's the one that
    // releases the lock on port.readable (in its own finally, the only safe
    // place to do so). Closing the port before that lock is released throws
    // "Cannot cancel a locked stream", which callers swallow below, leaving
    // the port silently stuck "opened" for the next open() call.
    try {
      if (readPromise) await readPromise
    } catch {
      /* ignore */
    }
    // Also wait for the frame pump to notice _closed and stop touching _buf.
    try {
      if (pumpPromise) await pumpPromise
    } catch {
      /* ignore */
    }
    this.reader = null
    try {
      await this.port.close()
    } catch {
      /* ignore */
    }
  }

  async _startReader() {
    if (this._reading || this._closed) return
    if (!this.port.readable) throw new SmpError(0xff, 'port has no readable stream')
    this._reading = true
    this.reader = this.port.readable.getReader()
    this._readPromise = (async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await this.reader.read()
          if (done) break
          if (!value || value.length === 0) continue
          // Append to our receive buffer.
          const merged = new Uint8Array(this._buf.length + value.length)
          merged.set(this._buf)
          merged.set(value, this._buf.length)
          this._buf = merged
        }
      } catch (e) {
        /* stream closed / read error */
      } finally {
        this._reading = false
        // Safe to release here (and only here): no read() call is in flight,
        // since we've just exited the loop that owned the only one.
        try {
          this.reader.releaseLock()
        } catch {
          /* already released */
        }
        this.reader = null
      }
    })()
  }

  // Block until the buffer holds at least *count* bytes (or timeout), then
  // return and remove those bytes from the buffer.
  async _take(count, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (this._buf.length < count) {
      if (!this._reading) await this._startReader()
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new SmpError(0xff, 'read timeout')
      await sleep(Math.min(remaining, 20))
      if (this._closed) throw new SmpError(0xff, 'port closed')
    }
    const out = this._buf.slice(0, count)
    this._buf = this._buf.slice(count)
    return out
  }

  _indexOfSof() {
    // Search this._buf for the 4-byte SOF magic [0x01 0x4a 0x50 0x50].
    // Interleaved ESP_LOG text (which never contains the magic) is skipped
    // naturally: any bytes before the match are log noise.
    for (let i = 0; i + SOF.length <= this._buf.length; i++) {
      let match = true
      for (let k = 0; k < SOF.length; k++) {
        if (this._buf[i + k] !== SOF[k]) { match = false; break }
      }
      if (match) return i
    }
    return -1
  }

  // Scan for the next frame's SOF, discarding leading non-frame noise (logging
  // it), then parse the full response frame from the stream.
  async _readFrame(timeoutMs) {
    if (!this._reading) await this._startReader()

    // 1) Wait for and skip SOF (+ any preceding log noise). The consent dialog
    // on SESSION_START can take a while, so give SOF the full timeout.
    const sofDeadline = Date.now() + timeoutMs
    while (true) {
      const idx = this._indexOfSof()
      if (idx >= 0) {
        if (idx > 0) this.log(_decodeNoise(this._buf.slice(0, idx)))
        this._take(idx + SOF.length, 0) // drop noise + SOF
        break
      }
      if (Date.now() > sofDeadline) throw new SmpError(0xff, 'timeout waiting for response SOF')
      await sleep(10)
    }

    // 2) LEN (2 bytes LE).
    const lenBytes = await this._take(2, Math.max(timeoutMs, 2000))
    const plen = lenBytes[0] | (lenBytes[1] << 8)
    if (plen < 2) throw new SmpError(0xff, `invalid payload length ${plen}`)

    // 3) PAYLOAD.
    const payload = await this._take(plen, Math.max(timeoutMs, 2000))

    // 4) CRC (2 bytes).
    const crcBytes = await this._take(2, Math.max(timeoutMs, 2000))
    const calc = crc16CcittFalse(_concat(lenBytes, payload))
    const recv = crcBytes[0] | (crcBytes[1] << 8)
    if (calc !== recv) {
      throw new SmpError(0xff, `CRC mismatch: calc 0x${calc.toString(16).padStart(4, '0')}`)
    }
    return payload
  }

  // ---- background frame pump ----
  //
  // A single continuous loop owns all frame parsing. cmd() sends and then
  // registers a pending waiter keyed by SEQ instead of reading frames itself,
  // so:
  //  - only one reader ever touches _buf's framed contents (concurrent cmd()
  //    calls no longer race each other for it), and
  //  - a device-initiated event (SEQ 0xff) is dispatched the moment it
  //    arrives, whether or not a command happens to be in flight.

  _ensurePump() {
    if (this._pumpRunning || this._closed) return
    this._pumpRunning = true
    this._pumpPromise = this._pumpLoop()
  }

  async _pumpLoop() {
    try {
      // eslint-disable-next-line no-constant-condition
      while (!this._closed) {
        let frame
        try {
          // Short-ish timeout just to keep re-checking _closed; a real
          // response/event wakes this up as soon as its SOF lands.
          frame = await this._readFrame(1000)
        } catch (e) {
          continue
        }
        if (frame.length < 2) continue
        const rseq = frame[0]
        if (rseq === EVENT_SEQ) {
          this._handleEvent(frame[1], frame.slice(2))
          continue
        }
        const waiter = this._pending.get(rseq)
        if (waiter) {
          this._pending.delete(rseq)
          waiter.resolve(frame)
        }
        // else: reply to an earlier, already-abandoned attempt — drop it.
      }
    } finally {
      this._pumpRunning = false
      const closedErr = new SmpError(0xff, 'connection closed')
      for (const waiter of this._pending.values()) waiter.reject(closedErr)
      this._pending.clear()
    }
  }

  _awaitResponse(seq, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(seq)
        reject(new SmpError(0xff, `timeout waiting for cmd response (seq ${seq})`))
      }, timeoutMs)
      this._pending.set(seq, {
        resolve: (frame) => {
          clearTimeout(timer)
          resolve(frame)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })
    })
  }

  _handleEvent(eventCode, body) {
    if (eventCode === EVENT.SESSION_ENDED) {
      this._stopKeepalive()
      this.log('[event] session ended on device (held OK)')
      this.onSessionEnded?.()
      return
    }
    this.log(`[event] unknown event 0x${eventCode.toString(16).padStart(2, '0')}`)
  }

  // ---- session keepalive ----
  //
  // While a session is open, ping the device with the no-op KEEPALIVE
  // command whenever nothing else has reset its inactivity timer recently,
  // so the UI can sit idle (browsing files, waiting on the user) without the
  // device dropping the session after 30s.

  _noteActivity() {
    this._lastActivityAt = Date.now()
  }

  _startKeepalive() {
    this._stopKeepalive()
    this._keepaliveTimer = setInterval(() => {
      if (this._closed) return
      if (Date.now() - this._lastActivityAt < KEEPALIVE_INTERVAL_MS) return
      this.keepalive().catch(() => {
        // Best-effort. A real failure here (session already gone, transport
        // hiccup) surfaces through onSessionLost/onSessionEnded instead.
      })
    }, KEEPALIVE_INTERVAL_MS)
  }

  _stopKeepalive() {
    if (this._keepaliveTimer) {
      clearInterval(this._keepaliveTimer)
      this._keepaliveTimer = null
    }
  }

  // Send a command, wait for the matching response. *retries* applies only to
  // idempotent commands (chunk upload), mirroring jppd_upload.py.
  async cmd(command, body = new Uint8Array(0), timeout = 10000, retries = 0) {
    this._noteActivity()
    this._ensurePump()

    let lastError = null
    for (let attempt = 0; attempt <= retries; attempt++) {
      const seq = this.seq
      this.seq = (this.seq + 1) & 0xff

      const payload = new Uint8Array(3 + body.length)
      payload[0] = seq
      payload[1] = command
      payload[2] = 0x00
      payload.set(body, 3)
      const lenBytes = u16le(payload.length)
      const frame = new Uint8Array(8 + payload.length)
      frame.set(SOF, 0)
      frame.set(lenBytes, 4)
      frame.set(payload, 6)
      const crc = crc16CcittFalse(new Uint8Array([...lenBytes, ...payload]))
      frame.set(u16le(crc), 6 + payload.length)

      const writer = this.port.writable.getWriter()
      await writer.write(frame).catch(() => {})
      writer.releaseLock()

      try {
        const resp = await this._awaitResponse(seq, timeout)
        const status = resp[1]
        if (status === STATUS.ERR_NO_SESSION) this.onSessionLost?.()
        return { status, body: resp.slice(2) }
      } catch (e) {
        lastError = e
        // Retry with a fresh SEQ on the next iteration, if any remain.
      }
    }
    throw lastError || new SmpError(0xff, `timeout waiting for cmd 0x${command.toString(16)}`)
  }

  _requireOk(status, context, alsoOk = []) {
    if (status !== STATUS.OK && !alsoOk.includes(status)) {
      throw new SmpError(status, context)
    }
  }

  // ---- public commands ----

  async sessionStart(protoVer = PROTO_VERSION) {
    const { status, body } = await this.cmd(CMD.SESSION_START, new Uint8Array([protoVer]), 60000)
    if (status !== STATUS.OK) {
      if (status === STATUS.ERR_DENIED) throw new SmpError(status, 'SESSION_START (user denied)')
      if (status === STATUS.ERR_APP_RUNNING) throw new SmpError(status, 'SESSION_START (app running)')
      throw new SmpError(status, 'SESSION_START')
    }
    this._startKeepalive()
    return body[0]
  }

  async sessionEnd() {
    this._stopKeepalive()
    const { status } = await this.cmd(CMD.SESSION_END, new Uint8Array(0), 5000)
    this._requireOk(status, 'SESSION_END')
  }

  // No-op that resets the device's session inactivity timer. Send it during
  // a stretch where there's nothing else to say — a host that's idling on
  // its own keepalive timer will call this automatically (see
  // _startKeepalive); it's also exposed here for callers that want to ping
  // explicitly.
  async keepalive() {
    const { status } = await this.cmd(CMD.KEEPALIVE, new Uint8Array(0), 5000)
    this._requireOk(status, 'KEEPALIVE')
  }

  async getInfo() {
    const { status, body } = await this.cmd(CMD.GET_INFO)
    this._requireOk(status, 'GET_INFO')
    const fw = cstr(body, 0)
    const user = cstr(body, fw.next)
    const hwid = cstr(body, user.next)
    let off = hwid.next
    const sdTotal = readU64le(body, off)
    off += 8
    const sdUsed = readU64le(body, off)
    off += 8
    const sdFree = readU64le(body, off)
    off += 8
    const label = cstr(body, off)
    return {
      fwVersion: fw.str,
      username: user.str,
      hwid: hwid.str,
      sdTotal,
      sdUsed,
      sdFree,
      sdLabel: label.str,
    }
  }

  // Returns null when the device carries no LRV identity (ERR_NOT_FOUND is
  // the expected response for a non-provisioned unit, not a real failure).
  async getLrvData() {
    const { status, body } = await this.cmd(CMD.GET_LRV_DATA)
    if (status === STATUS.ERR_NOT_FOUND) return null
    this._requireOk(status, 'GET_LRV_DATA')
    const cert = cstr(body, 0)
    let off = cert.next
    const certSig = body.slice(off, off + 64)
    off += 64
    const devicePubkey = body.slice(off, off + 32)
    off += 32
    const challenge = cstr(body, off)
    off = challenge.next
    const respSig = body.slice(off, off + 64)
    return {
      cert: cert.str,
      certSig,
      devicePubkey,
      pubkeyFingerprint: toHex(devicePubkey.subarray(0, 4)).toUpperCase(),
      challenge: challenge.str,
      respSig,
    }
  }

  async setTime(date = new Date()) {
    // Mirror jppd_upload.py: python weekday() gives Mon=0..Sun=6, then
    // (weekday+1)%7 maps to C tm_wday (Sun=0). JS getDay() is Sun=0..Sat=6.
    const pyWeekday = (date.getDay() + 6) % 7 // Mon=0..Sun=6
    const tmWday = (pyWeekday + 1) % 7
    const year = u16le(date.getFullYear())
    const body = new Uint8Array([
      year[0], year[1],
      date.getMonth() + 1,
      date.getDate(),
      tmWday,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ])
    const { status } = await this.cmd(CMD.SET_TIME, body)
    this._requireOk(status, 'SET_TIME')
  }

  async listDir(path) {
    const { status, body } = await this.cmd(CMD.FS_LIST_DIR, toCstr(path))
    this._requireOk(status, `FS_LIST_DIR ${path}`)
    const count = readU16le(body, 0)
    const entries = []
    let off = 2
    for (let i = 0; i < count; i++) {
      const flags = body[off]
      const sizeOrCount = readU32le(body, off + 1)
      const name = cstr(body, off + 5)
      off = name.next
      entries.push({ isDir: !!(flags & 1), sizeOrCount, name: name.str })
    }
    return entries
  }

  async mkdir(path) {
    const { status } = await this.cmd(CMD.FS_MKDIR, toCstr(path))
    this._requireOk(status, `FS_MKDIR ${path}`, [STATUS.ERR_EXISTS])
  }

  async remove(path) {
    const { status } = await this.cmd(CMD.FS_REMOVE, toCstr(path))
    this._requireOk(status, `FS_REMOVE ${path}`)
  }

  async rename(src, dst) {
    const body = new Uint8Array([...toCstr(src), ...toCstr(dst)])
    const { status } = await this.cmd(CMD.FS_RENAME, body)
    this._requireOk(status, `FS_RENAME ${src}`)
  }

  // ---- file upload ----

  async uploadFile(data, remotePath, onChunk) {
    data = data instanceof Uint8Array ? data : new Uint8Array(await data.arrayBuffer())
    const fileSize = data.length
    const fileCrc32 = crc32(data)
    const nChunks = fileSize ? Math.ceil(fileSize / CHUNK_SIZE) : 0

    const beginBody = new Uint8Array([...u32le(fileSize), ...toCstr(remotePath)])
    const { status, body: beginResp } = await this.cmd(CMD.FS_UPLOAD_BEGIN, beginBody)
    this._requireOk(status, `UPLOAD_BEGIN ${remotePath}`)
    const xferId = beginResp[0] || 0

    for (let idx = 0; idx < nChunks; idx++) {
      const chunk = data.subarray(idx * CHUNK_SIZE, (idx + 1) * CHUNK_SIZE)
      const chunkBody = new Uint8Array([xferId, ...u16le(idx), ...chunk])
      const r = await this.cmd(CMD.FS_UPLOAD_CHUNK, chunkBody, 10000, 4)
      this._requireOk(r.status, `UPLOAD_CHUNK ${idx}`)
      if (onChunk) onChunk(idx + 1, nChunks)
    }

    const endBody = new Uint8Array([xferId, ...u32le(fileCrc32)])
    const endResp = await this.cmd(CMD.FS_UPLOAD_END, endBody)
    this._requireOk(endResp.status, `UPLOAD_END ${remotePath}`)
  }

  // ---- file download ----

  async downloadFile(remotePath, onChunk) {
    const { status, body } = await this.cmd(CMD.FS_DOWNLOAD_BEGIN, toCstr(remotePath))
    this._requireOk(status, `DOWNLOAD_BEGIN ${remotePath}`)
    const xferId = body[0]
    const fileSize = readU32le(body, 1)
    const chunkCount = readU16le(body, 5)
    const fileCrc32 = readU32le(body, 7)

    const chunks = []
    for (let idx = 0; idx < chunkCount; idx++) {
      const reqBody = new Uint8Array([xferId, ...u16le(idx)])
      const r = await this.cmd(CMD.FS_DOWNLOAD_CHUNK, reqBody, 10000, 3)
      this._requireOk(r.status, `DOWNLOAD_CHUNK ${idx}`)
      const data = r.body.slice(3)
      chunks.push(data)
      if (onChunk) onChunk(idx + 1, chunkCount)
    }
    await this.cmd(CMD.FS_DOWNLOAD_END, new Uint8Array([xferId]), 5000)

    let result = new Uint8Array(fileSize)
    let off = 0
    for (const c of chunks) {
      result.set(c, off)
      off += c.length
    }
    const gotCrc = crc32(result)
    return { data: result, expectedCrc: fileCrc32, actualCrc: gotCrc, ok: gotCrc === fileCrc32 }
  }
}

export default SmpSession
