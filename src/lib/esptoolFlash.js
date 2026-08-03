// ---------------------------------------------------------------------------
// Flash JPPDOS firmware to an ESP32-C6 over Web Serial using esptool-js.
//
// The J++Device's only USB port is the native USB-Serial-JTAG, which the Web
// Serial API exposes directly. esptool-js talks to that transport to reset the
// chip into the ROM bootloader, load the flasher stub, and write the merged
// firmware image.
// ---------------------------------------------------------------------------

import { ESPLoader, Transport } from 'esptool-js'

// The firmware ships as a single merged image (see jppdos/build/merged.bin)
// written at offset 0x0, matching the 2 MB partition layout in partitions.csv.
const FLASH_OFFSET = 0x0
const FLASH_MODE = 'dio'
const FLASH_FREQ = '80m'
const FLASH_SIZE = '2MB'

function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export async function flashFirmware(port, firmwareBytes, { onLog, onProgress, onChipInfo, onRebooting }) {
  const log = (msg) => onLog && onLog(msg)

  if (!firmwareBytes || !firmwareBytes.length) {
    throw new Error('No firmware image provided')
  }

  const terminal = {
    clean: () => {},
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

  try {
    log('Connecting to the device…')
    transport.setDeviceLostCallback(() => log('\n⚠ Device disconnected (expected mid-flash).'))
    await transport.connect(115200)

    transport.setDeviceLostCallback(() => log('\n⚠ Device disconnected during kick.'))
    await loader.main()

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
      flashSize: 'detect',
      eraseAll: false,
      compress: true,
      reportProgress: (_fileIndex, written, total) => {
        onProgress && onProgress(written, total)
        log(`${Math.round((written / total) * 100)}%  ·  ${formatBytes(written)} / ${formatBytes(total)}`)
      },
    })

    log('Flashing complete.')
    onRebooting && onRebooting()
    await loader.softReset(false)
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
