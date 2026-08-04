// ---------------------------------------------------------------------------
// Shared J++Device connection state for the Manager page. One Web Serial port
// and one open JPPD-SMP session is maintained across all tabs. The port must
// be requested once (user gesture); opening/ending the session happens on
// demand.
// ---------------------------------------------------------------------------

import { ref, readonly } from 'vue'
import { SmpSession, SmpError, isWebSerialSupported, STATUS } from '../lib/smp.js'

const state = {
  supported: isWebSerialSupported(),
  port: ref(null),
  session: ref(null), // SmpSession
  sessionOpen: ref(false),
  connecting: ref(false),
  info: ref(null),
  lrv: ref(null),
}

// Keep a live console shared globally too.
const logLines = ref([])
// Raw appender — used for text that's already fully-formed, notably the
// device's own serial noise (SmpSession forwards ESP_LOG output verbatim via
// this, so it must not get the [webmgr] prefix below).
function appendLog(text) {
  const time = new Date().toLocaleTimeString([], { hour12: false })
  logLines.value.push({ time, text: String(text) })
  if (logLines.value.length > 500) logLines.value.splice(0, logLines.value.length - 500)
}
// Prefixed logger for the web manager's own status messages — this is what
// every UI call site (components, this file) should use.
function log(text) {
  appendLog('[webmgr] ' + String(text))
}
function clearLog() {
  logLines.value = []
}

let portKept = null
let sessionInstance = null

async function connect(log) {
  state.connecting.value = true
  try {
    if (!isWebSerialSupported()) throw new Error('Web Serial API not supported')
    if (portKept) {
      // Reuse the already-selected port.
      state.port.value = portKept
    } else {
      const port = await navigator.serial.requestPort()
      portKept = port
      state.port.value = port
    }
    // Tear down any previous session instance on this port.
    if (sessionInstance) {
      try {
        await sessionInstance.close()
      } catch {
        /* ignore */
      }
      sessionInstance = null
    }
    sessionInstance = new SmpSession(state.port.value, appendLog)
    // The device closed the session on its own (cancelled on-device,
    // device-side timeout, etc.) — the port/transport is still fine, so only
    // drop the session-level state. openSession() can re-establish a session
    // over the same still-open port.
    const dropSession = () => {
      state.sessionOpen.value = false
      state.info.value = null
      state.lrv.value = null
    }
    // Learned about it from a failed command (ERR_NO_SESSION) …
    sessionInstance.onSessionLost = dropSession
    // … or, on JPPDOS 1.2+, immediately from the device's own SESSION_ENDED
    // notification — no need to wait for the next command or the timeout.
    sessionInstance.onSessionEnded = dropSession
    await sessionInstance.open()
    state.session.value = sessionInstance
    state.sessionOpen.value = false
    state.info.value = null
    return state.session.value
  } finally {
    state.connecting.value = false
  }
}

// Open (or reuse) a session. Idempotent: only calls SESSION_START when there is
// no open session, so tabs can all call this safely without tripping ERR_BUSY.
async function openSession(log) {
  if (!sessionInstance) await connect(log)
  if (!sessionInstance) throw new Error('No device connected')
  if (!state.sessionOpen.value) {
    await sessionInstance.sessionStart()
    state.sessionOpen.value = true
  }
  return sessionInstance
}

async function refreshInfo(log) {
  const s = state.session.value
  if (!s) return null
  if (!state.sessionOpen.value) await s.sessionStart()
  state.sessionOpen.value = true
  const oldInfo = state.info.value
  try {
    state.info.value = await s.getInfo()
  } catch (e) {
    state.info.value = oldInfo
    throw e
  }
  try {
    state.lrv.value = await s.getLrvData()
  } catch {
    // Transport hiccup on a best-effort read — don't fail the whole connect
    // flow over it, just treat it the same as "no LRV identity".
    state.lrv.value = null
  }
  return state.info.value
}

async function endSession() {
  try {
    if (sessionInstance && state.sessionOpen.value) {
      await sessionInstance.sessionEnd()
    }
    if (sessionInstance) await sessionInstance.close()
  } catch {
    /* ignore */
  }
  state.sessionOpen.value = false
  state.info.value = null
  state.lrv.value = null
  sessionInstance = null
  portKept = null
}

// Best-effort: tell the device the session is over when the tab goes away,
// so it doesn't sit waiting for a host that already left. pagehide (rather
// than beforeunload) also covers bfcache navigations, and doesn't need to
// block navigation the way beforeunload can.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    if (sessionInstance) endSession()
  })
}

function errorMessage(e, t) {
  if (e instanceof SmpError && e.status === STATUS.ERR_DENIED) {
    return t('manager.errors.denied')
  }
  if (e instanceof SmpError && e.status === STATUS.ERR_APP_RUNNING) {
    return t('manager.errors.appRunning')
  }
  if (e instanceof SmpError && e.status === STATUS.ERR_BUSY) {
    return t('manager.errors.busy')
  }
  if (e instanceof SmpError && e.status === STATUS.ERR_NO_SESSION) {
    return t('manager.errors.noSession')
  }
  if (e instanceof SmpError && e.status === STATUS.ERR_IO) {
    return t('manager.errors.io')
  }
  return t('manager.errors.generic', { msg: e?.message || String(e) })
}

export function useManagerConnection() {
  return {
    supported: state.supported,
    port: readonly(state.port),
    session: readonly(state.session),
    sessionOpen: readonly(state.sessionOpen),
    connecting: readonly(state.connecting),
    info: readonly(state.info),
    lrv: readonly(state.lrv),
    logLines,
    log,
    clearLog,
    connect,
    openSession,
    refreshInfo,
    endSession,
    errorMessage,
  }
}
