// ---------------------------------------------------------------------------
// One-shot LRV identity read over Web Serial, backing the /verify page's
// "fill from device" button. Unlike the Manager page's long-lived connection
// (useManagerConnection.js) nothing is kept afterwards: the session is opened,
// the identity read, and the port closed again — the public page never holds a
// device open.
//
// i18n-free like useLrvVerify.js — failures come back as codes the caller
// translates.
// ---------------------------------------------------------------------------

import { ref } from 'vue'
import { SmpSession, SmpError, STATUS, isWebSerialSupported } from './smp.js'
import { bytesToHex } from './lrv.js'

const ERROR_BY_STATUS = {
  [STATUS.ERR_DENIED]: 'denied',
  [STATUS.ERR_APP_RUNNING]: 'appRunning',
  [STATUS.ERR_BUSY]: 'busy',
}

// Signatures go into the form as hex — the same form the device shows on its
// own screen, and what the field placeholders document. A short read (a
// truncated frame) is dropped rather than pasted in as a bogus signature.
function sigHex(bytes) {
  return bytes?.length === 64 ? bytesToHex(bytes) : ''
}

export function useLrvDevice() {
  const supported = isWebSerialSupported()
  const busy = ref(false)
  const error = ref(null)

  // Returns the connected device's LRV identity as form-ready strings, or
  // null if nothing was read — `error` then holds the code to show, except
  // when the user simply dismissed the port picker.
  async function read() {
    error.value = null
    let port
    try {
      port = await navigator.serial.requestPort()
    } catch {
      return null // picker dismissed — nothing went wrong, nothing to report
    }

    busy.value = true
    const session = new SmpSession(port)
    try {
      await session.open()
      await session.sessionStart()
      const lrv = await session.getLrvData()
      if (!lrv) {
        error.value = 'noIdentity'
        return null
      }
      return {
        cert: lrv.cert,
        certSig: sigHex(lrv.certSig),
        challenge: lrv.challenge,
        respSig: sigHex(lrv.respSig),
      }
    } catch (e) {
      error.value = (e instanceof SmpError && ERROR_BY_STATUS[e.status]) || 'generic'
      return null
    } finally {
      // Hand the port back either way, so the device (and the next reader)
      // isn't left holding a session this page no longer needs.
      try {
        await session.sessionEnd()
      } catch {
        /* never opened, or already gone */
      }
      try {
        await session.close()
      } catch {
        /* ignore */
      }
      busy.value = false
    }
  }

  return { supported, busy, error, read }
}
