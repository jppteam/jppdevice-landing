// ---------------------------------------------------------------------------
// Flash JPPDOS firmware to an ESP32-C6 over Web Serial using esptool-js.
//
// The J++Device's only USB port is the native USB-Serial-JTAG, which the Web
// Serial API exposes directly. esptool-js talks to that transport to reset the
// chip into the ROM bootloader, load the flasher stub, and write the firmware.
//
// Two firmware shapes are supported:
//  - A single merged image (see jppdos/build/merged.bin), written at offset
//    0x0. This overwrites the whole flash — including the NVS partition — so
//    flashMergedImage() backs NVS up beforehand and restores it afterwards.
//  - A .zip of the separate partition images an `idf.py build` produces
//    (bootloader.bin, partition-table.bin, the app image, …) alongside its
//    flasher_args.json manifest. Since that manifest never references NVS,
//    flashing it never touches the partition, so no backup is needed there.
// ---------------------------------------------------------------------------

import { ESPLoader, Transport } from 'esptool-js'
import { unzipSync } from 'fflate'

const FLASH_OFFSET = 0x0
const FLASH_MODE = 'dio'
const FLASH_FREQ = '80m'
const FLASH_SIZE = '2MB'

// Standard ESP-IDF partition table location: one 4 KB flash sector at 0x8000.
const PARTITION_TABLE_OFFSET = 0x8000
const PARTITION_TABLE_SIZE = 0x1000
const PARTITION_ENTRY_SIZE = 32
const PARTITION_TYPE_DATA = 0x01
const PARTITION_SUBTYPE_NVS = 0x02

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readU32le(buf, off) {
  return (buf[off] | (buf[off + 1] << 8) | (buf[off + 2] << 16) | (buf[off + 3] << 24)) >>> 0
}

// ---- ESP-IDF partition table -----------------------------------------------

// Parse the raw bytes of an ESP-IDF partition table (as read from flash at
// PARTITION_TABLE_OFFSET) into a list of { type, subtype, offset, size, label }.
// Stops at the first entry whose magic doesn't match — either the 0xFFFF
// unused-space filler or the 0xEBEB md5-checksum sentinel entry.
function parsePartitionTable(bytes) {
  const partitions = []
  for (let off = 0; off + PARTITION_ENTRY_SIZE <= bytes.length; off += PARTITION_ENTRY_SIZE) {
    // Entries are prefixed with the literal byte sequence 0xAA, 0x50 (see
    // gen_esp32part.py's MAGIC_BYTES = b"\xaa\x50") -- that's a fixed 2-byte
    // string, not a little-endian 16-bit value, so compare the bytes as-is.
    if (bytes[off] !== 0xaa || bytes[off + 1] !== 0x50) break
    const type = bytes[off + 2]
    const subtype = bytes[off + 3]
    const offset = readU32le(bytes, off + 4)
    const size = readU32le(bytes, off + 8)
    const labelBytes = bytes.subarray(off + 12, off + 12 + 16)
    let labelEnd = 0
    while (labelEnd < labelBytes.length && labelBytes[labelEnd] !== 0) labelEnd++
    const label = new TextDecoder().decode(labelBytes.subarray(0, labelEnd))
    partitions.push({ type, subtype, offset, size, label })
  }
  return partitions
}

function findNvsPartition(partitions) {
  return partitions.find((p) => p.type === PARTITION_TYPE_DATA && p.subtype === PARTITION_SUBTYPE_NVS) || null
}

// esptool-js's readFlash() reliably desyncs partway through on larger reads
// (confirmed upstream: https://github.com/espressif/esptool-js/issues/218 —
// "readFlash() fails when trying to read a lot of data", still open). A 4 KB
// read is the size that's been observed to work; a 24 KB NVS partition read
// in one call is not. Read in small windows instead, each its own complete
// readFlash() call, so no single call runs long enough to hit the desync.
const FLASH_READ_CHUNK = 0x1000

async function readFlashChunked(loader, offset, size, log) {
  const out = new Uint8Array(size)
  let pos = 0
  while (pos < size) {
    const len = Math.min(FLASH_READ_CHUNK, size - pos)
    const chunk = await loader.readFlash(offset + pos, len)
    out.set(chunk, pos)
    pos += len
    if (pos < size) await sleep(30)
  }
  return out
}

// Reads the on-device partition table to locate NVS, then reads that region
// out. Returns null only when there's genuinely nothing to back up (no NVS
// partition on this device, e.g. a blank/first flash) — any actual read
// failure propagates so the caller can retry or abort rather than silently
// flash over an NVS partition it failed to save.
async function backupNvsPartition(loader, log, onNvsStatus) {
  // readFlash()'s own timeout defaults to 100s per call; since we now issue
  // several small calls instead of one big one, a much shorter per-call
  // leash still gives every chunk a fair shot while failing fast overall.
  loader.FLASH_READ_TIMEOUT = 5000
  log('Reading partition table to locate NVS…')
  const table = await readFlashChunked(loader, PARTITION_TABLE_OFFSET, PARTITION_TABLE_SIZE, log)
  const nvs = findNvsPartition(parsePartitionTable(table))
  if (!nvs) {
    log('No NVS partition found on device — skipping backup.')
    return null
  }
  onNvsStatus && onNvsStatus('backing-up')
  log(`Backing up NVS partition (${formatBytes(nvs.size)} at 0x${nvs.offset.toString(16)})…`)
  const data = await readFlashChunked(loader, nvs.offset, nvs.size, log)
  return { offset: nvs.offset, data }
}

// esptool-js's readFlash() is flaky on real hardware even in small chunks —
// a single call sometimes desyncs with "Serial data stream stopped" for no
// size-related reason (see readFlashChunked above). The one thing that's
// reliably un-stuck it in testing is a full disconnect/reconnect, so retry
// the whole backup (table + NVS read) from scratch, on a fresh connection,
// a few times before giving up.
const NVS_BACKUP_ATTEMPTS = 3

async function backupNvsPartitionWithRetries(port, log, onNvsStatus) {
  let lastError = null
  for (let attempt = 1; attempt <= NVS_BACKUP_ATTEMPTS; attempt++) {
    const { loader, transport } = await connectLoader(port, log)
    try {
      log(`Chip: ${loader.chip.CHIP_NAME || 'detected'}`)
      return await backupNvsPartition(loader, log, onNvsStatus)
    } catch (e) {
      lastError = e
      log(`NVS backup attempt ${attempt}/${NVS_BACKUP_ATTEMPTS} failed: ${e.message}`)
    } finally {
      try {
        await transport.disconnect()
      } catch {
        /* ignore */
      }
    }
    if (attempt < NVS_BACKUP_ATTEMPTS) await sleep(500)
  }
  throw new Error(`Could not back up the NVS partition after ${NVS_BACKUP_ATTEMPTS} attempts: ${lastError.message}`)
}

// esptool-js's built-in HardReset only *releases* RTS (transport.setRTS(false))
// and never asserts it first — see node_modules/esptool-js/lib/reset.js. That's
// a no-op if RTS is already low from the connect-time reset dance (exactly the
// state we're in after entering the bootloader on a native-USB-JTAG chip), so
// loader.after('hard_reset') silently fails to reboot the device. Do the real
// assert-then-release EN pulse ourselves, matching esptool.py's own
// hard_reset() for chips on their internal USB peripheral (hold 0.2s, release,
// settle 0.2s) — see esp_pylib.serial_reset.hard_reset(uses_usb=True).
async function hardReset(transport) {
  await transport.setRTS(true) // EN=LOW, chip in reset
  await sleep(200)
  await transport.setRTS(false) // EN=HIGH, chip runs
  await sleep(200)
}

// ---- Connection helper ------------------------------------------------------

async function connectLoader(port, log) {
  const terminal = {
    clean: () => { },
    writeLine: (line) => log(line),
    write: (str) => log(str),
  }
  const transport = new Transport(port, false, false)
  const loader = new ESPLoader({
    transport,
    baudrate: 115200,
    terminal,
    debugLogging: false,
  })
  log('Connecting to the device…')
  // loader.main() opens the port itself (via detectChip -> connect), so
  // don't open it here too -- a second open() on an already-open port
  // throws "The port is already open".
  transport.setDeviceLostCallback(() => log('\n⚠ Device disconnected during kick.'))
  await loader.main()
  return { loader, transport }
}

// ---- Merged-image flashing ---------------------------------------------------

export async function flashFirmware(port, firmwareBytes, { onLog, onProgress, onChipInfo, onRebooting, onNvsStatus }) {
  const log = (msg) => onLog && onLog(msg)

  if (!firmwareBytes || !firmwareBytes.length) {
    throw new Error('No firmware image provided')
  }

  // The merged image spans the whole flash from 0x0, including the NVS
  // region, so flashing it would otherwise wipe the user's WiFi credentials
  // and settings. Snapshot NVS first, in its own short-lived connection(s) —
  // if every attempt fails, abort here rather than flash over an NVS
  // partition we couldn't save a copy of.
  //
  // This deliberately reconnects from scratch before the write below rather
  // than reusing the same session: on real hardware, reading flash and then
  // immediately writing flash in the same session has been observed to leave
  // the transport out of sync (the write's first command times out with
  // "Serial data stream stopped"), aborting the whole flash. A full
  // disconnect/reconnect between the two gives the device a clean slate.
  const nvsBackup = await backupNvsPartitionWithRetries(port, log, onNvsStatus)
  await sleep(300)

  const { loader, transport } = await connectLoader(port, log)

  try {
    const chipName = loader.chip.CHIP_NAME || 'detected'
    log(`Chip: ${chipName}`)
    const flashSize = await loader.detectFlashSize()
    log(`Flash size: ${flashSize}  ·  firmware: ${formatBytes(firmwareBytes.length)}`)
    onChipInfo && onChipInfo(chipName, flashSize)

    const fileArray = [{ data: new Uint8Array(firmwareBytes), address: FLASH_OFFSET }]

    await loader.writeFlash({
      fileArray,
      flashMode: FLASH_MODE,
      flashFreq: FLASH_FREQ,
      // writeFlash's own size-fit check only understands a concrete "NMB"/"NKB"
      // string, unlike updateImageFlashParams() elsewhere which accepts
      // 'detect' -- passing 'detect' here makes it treat the flash as 0
      // bytes and reject every file. Reuse the size we already detected above.
      flashSize,
      eraseAll: false,
      compress: true,
      reportProgress: (_fileIndex, written, total) => {
        onProgress && onProgress(written, total)
        log(`${Math.round((written / total) * 100)}%  ·  ${formatBytes(written)} / ${formatBytes(total)}`)
      },
    })

    if (nvsBackup) {
      onNvsStatus && onNvsStatus('restoring')
      log(`Restoring NVS partition (${formatBytes(nvsBackup.data.length)} at 0x${nvsBackup.offset.toString(16)})…`)
      try {
        await loader.writeFlash({
          fileArray: [{ data: nvsBackup.data, address: nvsBackup.offset }],
          flashMode: FLASH_MODE,
          flashFreq: FLASH_FREQ,
          flashSize,
          eraseAll: false,
          compress: true,
        })
        log('NVS partition restored.')
        onNvsStatus && onNvsStatus('restored')
      } catch (e) {
        log(`⚠ Failed to restore NVS partition: ${e.message}`)
        onNvsStatus && onNvsStatus('restore-failed')
      }
    }

    log('Flashing complete.')
    onRebooting && onRebooting()
    await hardReset(transport)
    log('Device rebooted.')
  } finally {
    try {
      await transport.disconnect()
    } catch {
      /* ignore */
    }
  }
}

// ---- Partition-archive (.zip) flashing ---------------------------------------

// Parse an idf.py-build-style archive: a flasher_args.json manifest plus the
// partition files it references (bootloader.bin, partition-table.bin, the
// app image, …), each mapped to its own flash offset. The manifest may sit
// either at the zip root or inside a wrapping folder (e.g. a zipped "build/").
function parsePartitionArchive(zipBytes) {
  let entries
  try {
    entries = unzipSync(new Uint8Array(zipBytes))
  } catch (e) {
    throw new Error(`Could not read .zip archive: ${e.message}`)
  }
  const names = Object.keys(entries)

  const manifestName = names.find((n) => /(^|\/)flasher_args\.json$/i.test(n))
  if (!manifestName) {
    throw new Error('flasher_args.json not found in archive — expected an ESP-IDF build output (idf.py build) zipped up')
  }
  const manifestDir = manifestName.includes('/') ? manifestName.slice(0, manifestName.lastIndexOf('/') + 1) : ''

  let manifest
  try {
    manifest = JSON.parse(new TextDecoder().decode(entries[manifestName]))
  } catch (e) {
    throw new Error(`Could not parse flasher_args.json: ${e.message}`)
  }

  const flashFiles = manifest.flash_files
  if (!flashFiles || typeof flashFiles !== 'object' || !Object.keys(flashFiles).length) {
    throw new Error('flasher_args.json has no flash_files section')
  }

  function resolveEntry(relPath) {
    const cleanPath = relPath.replace(/^\.\//, '')
    const direct = entries[manifestDir + cleanPath] || entries[cleanPath]
    if (direct) return direct
    const base = cleanPath.split('/').pop()
    const match = names.find((n) => n.split('/').pop() === base)
    return match ? entries[match] : null
  }

  const files = Object.entries(flashFiles).map(([offsetStr, relPath]) => {
    const data = resolveEntry(relPath)
    if (!data) throw new Error(`Archive is missing "${relPath}" (referenced by flasher_args.json)`)
    const offset = parseInt(offsetStr, 16)
    if (Number.isNaN(offset)) throw new Error(`Invalid offset "${offsetStr}" in flasher_args.json`)
    return { offset, data, path: relPath }
  })
  files.sort((a, b) => a.offset - b.offset)

  const settings = manifest.flash_settings || {}
  return {
    files,
    flashMode: settings.flash_mode,
    flashFreq: settings.flash_freq,
    flashSize: settings.flash_size,
  }
}

export async function flashPartitionArchive(port, zipBytes, { onLog, onProgress, onChipInfo, onRebooting }) {
  const log = (msg) => onLog && onLog(msg)

  if (!zipBytes || !zipBytes.length) {
    throw new Error('No firmware archive provided')
  }

  // Parse before connecting so a malformed archive fails fast, without
  // kicking the device into the bootloader for nothing.
  const manifest = parsePartitionArchive(zipBytes)

  const { loader, transport } = await connectLoader(port, log)

  try {
    const chipName = loader.chip.CHIP_NAME || 'detected'
    log(`Chip: ${chipName}`)
    const detectedFlashSize = await loader.detectFlashSize()
    const totalSize = manifest.files.reduce((sum, f) => sum + f.data.length, 0)
    log(`Flash size: ${detectedFlashSize}  ·  ${manifest.files.length} partition file(s), ${formatBytes(totalSize)} total`)
    onChipInfo && onChipInfo(chipName, detectedFlashSize)

    const flashSize = manifest.flashSize && manifest.flashSize !== 'keep' ? manifest.flashSize : detectedFlashSize

    await loader.writeFlash({
      fileArray: manifest.files.map((f) => ({ data: f.data, address: f.offset })),
      flashMode: manifest.flashMode || FLASH_MODE,
      flashFreq: manifest.flashFreq || FLASH_FREQ,
      flashSize,
      eraseAll: false,
      compress: true,
      reportProgress: (_fileIndex, written, total) => {
        onProgress && onProgress(written, total)
        log(`${Math.round((written / total) * 100)}%  ·  ${formatBytes(written)} / ${formatBytes(total)}`)
      },
    })

    log('Flashing complete.')
    onRebooting && onRebooting()
    await hardReset(transport)
    log('Device rebooted.')
  } finally {
    try {
      await transport.disconnect()
    } catch {
      /* ignore */
    }
  }
}

export { formatBytes }
export const FIRMWARE_FLASH_OFFSET = FLASH_OFFSET
export const FIRMWARE_EXPECTED_SIZE = FLASH_SIZE
