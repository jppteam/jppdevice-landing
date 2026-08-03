// ---------------------------------------------------------------------------
// Validate a JPPDOS app package (manifest.json + entry files) *before* it is
// uploaded to the device. Mirrors docs/manifest.md (schema v2) and the known
// capability table, so an invalid app never hits the wire in the first place.
// ---------------------------------------------------------------------------

export const KNOWN_CAPABILITIES = [
  'http.request',
  'https.request',
  'ble.scan',
  'ble.advertise',
  'background.register',
  'esp_now',
  'files.full',
  'network.bind',
  'network.connect',
  'ble.connect',
  'ble.host',
]

export const RESERVED_APP_IDS = ['launcher', 'settings', 'webdav', 'dialogs', 'files', 'about']

export const APPTYPE = {
  NATIVE: 'native',
  MICROPYTHON: 'micropython',
}

// Build intermediates that must never be uploaded (mirrors jppd_upload.py).
export const SKIP_SUFFIXES = ['.o', '.d', '.map', '.lst']
export const MANIFEST = 'manifest.json'

// MicroPython toolchain block must match exactly (docs/manifest.md).
const REQUIRED_TOOLCHAIN = {
  runtime_version: 'v1.28.0',
  cross_version: '1.28.0',
  bytecode_abi: 6,
}

export const APP_ID_RE = /^[a-z0-9_.]+$/
export const MAX_CAPABILITIES = 16

export class AppValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AppValidationError'
  }
}

function fail(message) {
  throw new AppValidationError(message)
}

function validateAppId(appId) {
  if (typeof appId !== 'string' || !appId.length) fail('manifest.app_id is required')
  if (!APP_ID_RE.test(appId)) fail(`app_id must be lowercase letters, digits, dots or underscores (got "${appId}")`)
  if (RESERVED_APP_IDS.includes(appId)) fail(`app_id "${appId}" is a reserved built-in name`)
}

function validateToolchain(manifest) {
  if (manifest.app_type !== APPTYPE.MICROPYTHON) return
  const tc = manifest.toolchain
  if (!tc || typeof tc !== 'object') fail('MicroPython apps must declare a toolchain block')
  for (const [key, value] of Object.entries(REQUIRED_TOOLCHAIN)) {
    if (tc[key] !== value) {
      fail(`toolchain.${key} must be ${JSON.stringify(value)} (got ${JSON.stringify(tc[key])})`)
    }
  }
}

/**
 * Validate a parsed manifest object. Throws AppValidationError on any problem.
 * @param {object} manifest - parsed manifest.json
 */
export function validateManifest(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    fail('manifest.json must be a JSON object')
  }

  if (manifest.schema_version !== 2) {
    fail(`schema_version must be 2 (got ${JSON.stringify(manifest.schema_version)})`)
  }

  validateAppId(manifest.app_id)

  if (!manifest.name || typeof manifest.name !== 'string') fail('manifest.name is required')
  if (manifest.name.length > 16) fail('manifest.name should be ~16 characters or fewer')

  if (!manifest.version || typeof manifest.version !== 'string') fail('manifest.version is required')

  if (typeof manifest.sdk_min !== 'number' || !Number.isInteger(manifest.sdk_min) || manifest.sdk_min < 1) {
    fail('manifest.sdk_min must be an integer >= 1')
  }

  if (![APPTYPE.NATIVE, APPTYPE.MICROPYTHON].includes(manifest.app_type)) {
    fail(`manifest.app_type must be "native" or "micropython" (got ${JSON.stringify(manifest.app_type)})`)
  }

  if (!manifest.entry || typeof manifest.entry !== 'string' || !manifest.entry.length) {
    fail('manifest.entry is required')
  }

  validateToolchain(manifest)

  if (manifest.capabilities !== undefined) {
    if (!Array.isArray(manifest.capabilities)) fail('manifest.capabilities must be an array')
    if (manifest.capabilities.length > MAX_CAPABILITIES) {
      fail(`manifest.capabilities may declare at most ${MAX_CAPABILITIES} capabilities`)
    }
    for (const cap of manifest.capabilities) {
      if (!KNOWN_CAPABILITIES.includes(cap)) fail(`unknown capability "${cap}"`)
    }
  }

  if (manifest.background !== undefined) {
    if (typeof manifest.background !== 'object' || manifest.background === null) {
      fail('manifest.background must be an object')
    }
    if (manifest.background.enabled === true && !(manifest.capabilities || []).includes('background.register')) {
      fail('background.enabled requires the "background.register" capability')
    }
  }

  return manifest
}

/**
 * Validate a full app package (map of filename -> bytes, or Uint8Array data).
 * The package must contain manifest.json and the entry file the manifest names.
 * Returns { manifest, entryName, files } on success; throws AppValidationError.
 *
 * @param {Map<string, Uint8Array|ArrayBuffer>} filesByPath
 * @param {object} options
 */
export function validateAppPackage(filesByPath, options = {}) {
  const { rootPrefix = '' } = options
  const files = new Map()
  const iterable = filesByPath instanceof Map ? filesByPath.entries() : Object.entries(filesByPath || {})
  for (const [raw, data] of iterable) {
    // Ignore directories and anything that isn't a plain file path.
    if (!raw || raw.endsWith('/')) continue
    let name = raw
    if (rootPrefix && name.startsWith(rootPrefix)) name = name.slice(rootPrefix.length)
    name = name.replace(/^\/+/, '')
    // Only allow top-level files in an app package.
    if (name.includes('/')) continue
    files.set(name, data)
  }

  if (!files.has(MANIFEST)) {
    fail('app package must contain a manifest.json at its root')
  }

  let manifest
  try {
    const raw = toBytes(files.get(MANIFEST))
    manifest = JSON.parse(new TextDecoder().decode(raw))
  } catch (e) {
    fail(`manifest.json is not valid JSON (${e.message})`)
  }

  validateManifest(manifest)

  const entry = manifest.entry
  if (!files.has(entry)) {
    fail(`entry file "${entry}" is missing from the app package`)
  }

  const skipped = []
  const uploadFiles = []
  for (const [name, data] of files.entries()) {
    if (name === MANIFEST) continue
    if (SKIP_SUFFIXES.some((s) => name.endsWith(s))) {
      skipped.push(name)
      continue
    }
    uploadFiles.push({ name, data })
  }

  return { manifest, entryName: entry, files: uploadFiles, skipped }
}

function toBytes(data) {
  if (data instanceof Uint8Array) return new Uint8Array(data)
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  if (data && typeof data.arrayBuffer === 'function') return new Uint8Array(data)
  throw new AppValidationError('unreadable file data')
}

export default validateAppPackage
