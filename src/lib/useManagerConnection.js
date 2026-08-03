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
}

// Keep a live console shared globally too.
const logLines = ref([])
function log(text) {
  const time = new Date().toLocaleTimeString([], { hour12: false })
  logLines.value.push({ time, text: String(text) })
  if (logLines.value.length > 500) logLines.value.splice(0, logLines.value.length - 500)
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
    sessionInstance = new SmpSession(state.port.value, log)
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
  sessionInstance = null
  portKept = null
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
    logLines,
    log,
    connect,
    openSession,
    refreshInfo,
    endSession,
    errorMessage,
  }
}
