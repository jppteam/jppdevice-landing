<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import ManagerConsole from './ManagerConsole.vue'

const { t } = useI18n()
const { openSession, errorMessage, log, sessionOpen } = useManagerConnection()

const path = ref('/sd')
const entries = ref([])
const loading = ref(false)
const stack = ref([]) // breadcrumb trail
const consoleRef = ref(null)
const fileInput = ref(null)
const busy = ref(false)

function push(text) {
  consoleRef.value?.push(text)
  log(text)
}

function displayPath(p) {
  return p === '/sd' ? t('manager.files.root') : p.replace(/^\/sd\//, '')
}

async function loadDir(dir = path.value) {
  loading.value = true
  try {
    const s = await ensureSession()
    entries.value = await s.listDir(dir)
    // Ensure breadcrumbs match.
    if (dir === '/sd') {
      stack.value = ['/sd']
    } else {
      const parts = dir.replace(/^\/sd\/?/, '').split('/')
      const crumbs = ['/sd']
      parts.forEach((p, i) => crumbs.push('/sd/' + parts.slice(0, i + 1).join('/')))
      stack.value = crumbs
    }
    path.value = dir
  } catch (e) {
    push(errorMessage(e, t))
  } finally {
    loading.value = false
  }
}

async function ensureSession() {
  const s = await openSession(push)
  return s
}

function navigate(dir) {
  loadDir(dir)
}
function openEntry(e) {
  if (!e.isDir) return
  loadDir(path.value + '/' + e.name)
}
function goTo(crumb) {
  loadDir(crumb)
}
function up() {
  if (path.value === '/sd') return
  const parts = path.value.replace(/^\/sd\/?/, '').split('/')
  parts.pop()
  loadDir('/sd' + (parts.length ? '/' + parts.join('/') : ''))
}

async function onUpload(evt) {
  const files = Array.from(evt.target.files || [])
  if (!files.length) return
  busy.value = true
  try {
    const s = await ensureSession()
    let n = 0
    for (const f of files) {
      const remote = (path.value.endsWith('/') ? path.value : path.value + '/') + f.name
      push(`↑ ${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
      await s.uploadFile(await f.arrayBuffer(), remote)
      n++
    }
      push(t('manager.files.uploaded', { n: String(n) }))
      await loadDir()
  } catch (e) {
    push(errorMessage(e, t))
  } finally {
    busy.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function onDownload(e) {
  busy.value = true
  try {
    const s = await ensureSession()
    const remote = path.value + '/' + e.name
    push(`↓ ${e.name}`)
    const { data, ok } = await s.downloadFile(remote)
    // Save via a blob link (works everywhere; showSaveFilePicker optional).
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = e.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    push(ok ? t('manager.files.downloadOk') : t('manager.files.downloadBad'))
  } catch (err) {
    push(errorMessage(err, t))
  } finally {
    busy.value = false
  }
}

async function onDelete(e) {
  if (!confirm(t('manager.files.deleteConfirm', { name: e.name }))) return
  busy.value = true
  try {
    const s = await ensureSession()
    await s.remove(path.value + '/' + e.name)
    push(t('manager.files.deleted', { name: e.name }))
    await loadDir()
  } catch (err) {
    push(errorMessage(err, t))
  } finally {
    busy.value = false
  }
}

async function onMkdir() {
  const name = prompt(t('manager.files.mkdirPrompt'))
  if (!name) return
  busy.value = true
  try {
    const s = await ensureSession()
    await s.mkdir(path.value + '/' + name)
    push(t('manager.files.created', { name }))
    await loadDir()
  } catch (err) {
    push(errorMessage(err, t))
  } finally {
    busy.value = false
  }
}

function onSyncTime() {
  ;(async () => {
    busy.value = true
    try {
      const s = await ensureSession()
      await s.setTime(new Date())
      push(t('manager.files.timeSynced'))
    } catch (err) {
      push(errorMessage(err, t))
    } finally {
      busy.value = false
    }
  })()
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

onMounted(() => {
  // Load lazily: only list the directory once a session is actually open, so
  // we never trigger a device prompt just by opening the tab.
  if (sessionOpen.value) loadDir().catch(() => {})
})
watch(sessionOpen, (open) => {
  if (open) loadDir().catch(() => {})
})
</script>

<template>
  <div class="panel">
    <div class="panel__head">
      <h3 class="panel__title">{{ t('manager.files.title') }}</h3>
      <p class="panel__body">{{ t('manager.files.body') }}</p>
    </div>

    <div class="fs-toolbar">
      <nav class="crumbs" aria-label="breadcrumb">
        <button class="crumb crumb--root" @click="goTo('/sd')">{{ t('manager.files.root') }}</button>
        <template v-for="(c, i) in stack.slice(1)" :key="c">
          <span class="crumb-sep" aria-hidden="true">/</span>
          <button class="crumb" @click="goTo(c)">{{ displayPath(c) }}</button>
        </template>
      </nav>
      <div class="fs-actions">
        <button class="btn btn--ghost btn--sm" @click="up" :disabled="path === '/sd'">↑</button>
        <button class="btn btn--ghost btn--sm" @click="loadDir()">{{ t('manager.files.refresh') }}</button>
        <button class="btn btn--ghost btn--sm" @click="onMkdir">{{ t('manager.files.mkdir') }}</button>
        <button class="btn btn--ghost btn--sm" @click="onSyncTime">{{ t('manager.files.syncTime') }}</button>
        <label class="btn btn--yellow btn--sm">
          {{ t('manager.files.upload') }}
          <input ref="fileInput" type="file" multiple class="visually-hidden" @change="onUpload" />
        </label>
      </div>
    </div>

    <div v-if="loading" class="fs-loading">{{ t('manager.files.loading') }}</div>
    <ul v-else-if="entries.length" class="fs-list">
      <li v-for="e in entries" :key="e.name" class="fs-item">
        <button class="fs-item__name" :class="{ 'fs-item__dir': e.isDir }" @click="openEntry(e)">
          <span class="fs-item__icon" aria-hidden="true">{{ e.isDir ? '▸' : '·' }}</span>
          {{ e.name }}
        </button>
        <span class="fs-item__meta mono">
          {{ e.isDir ? t('manager.files.dir') : fmtSize(e.sizeOrCount) }}
        </span>
        <span class="fs-item__ops">
          <button class="op" :disabled="busy" :title="t('manager.files.download')" @click="onDownload(e)">DL</button>
          <button class="op" :disabled="busy" :title="t('manager.files.delete')" @click="onDelete(e)">DEL</button>
        </span>
      </li>
    </ul>
    <div v-else class="fs-empty">{{ t('manager.files.empty') }}</div>

    <ManagerConsole ref="consoleRef" class="panel__console" />
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 1.25rem; }
.panel__head { display: flex; flex-direction: column; gap: 0.3rem; }
.panel__title { font-size: var(--fs-h3); }
.panel__body { color: var(--ink-2); max-width: 52rem; }
.fs-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.75rem 1rem;
}
.crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem; }
.crumb {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--ink-2);
  padding: 0.1rem 0.3rem;
  border-radius: 6px;
}
.crumb:hover { background: var(--paper-2); color: var(--ink); }
.crumb--root { font-weight: 700; color: var(--ink); }
.crumb-sep { color: var(--ink-3); }
.fs-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.fs-list { list-style: none; padding: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.fs-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--line);
}
.fs-item:last-child { border-bottom: none; }
.fs-item:hover { background: var(--paper); }
.fs-item__name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  text-align: left;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fs-item__dir { font-weight: 700; }
.fs-item__icon { flex-shrink: 0; }
.fs-item__meta { font-size: 0.75rem; color: var(--ink-3); flex-shrink: 0; }
.fs-item__ops { display: flex; gap: 0.25rem; flex-shrink: 0; }
.op {
  font-size: 0.9rem;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  opacity: 0.6;
}
.op:hover { opacity: 1; background: var(--paper-2); }
.fs-loading, .fs-empty { padding: 1.5rem; text-align: center; color: var(--ink-3); border: 1px dashed var(--line); border-radius: var(--radius); }
.fs-empty { font-size: 0.9rem; }
</style>
