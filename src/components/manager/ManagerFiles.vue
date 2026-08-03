<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import IconGlyph from '../IconGlyph.vue'
import ConfirmDialog from '../ConfirmDialog.vue'

const { t } = useI18n()
const { openSession, errorMessage, log, sessionOpen } = useManagerConnection()

const path = ref('/sd')
const entries = ref([])
const loading = ref(false)
const stack = ref([]) // breadcrumb trail
const fileInput = ref(null)
const busy = ref(false)

const deleteDialogOpen = ref(false)
const deleteTarget = ref(null)
const mkdirDialogOpen = ref(false)
const mkdirName = ref('')

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
    log(errorMessage(e, t))
  } finally {
    loading.value = false
  }
}

async function ensureSession() {
  const s = await openSession(log)
  return s
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
      log(`↑ ${f.name} (${(f.size / 1024).toFixed(1)} KB)`)
      await s.uploadFile(await f.arrayBuffer(), remote)
      n++
    }
      log(t('manager.files.uploaded', { n: String(n) }))
      await loadDir()
  } catch (e) {
    log(errorMessage(e, t))
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
    log(`↓ ${e.name}`)
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
    log(ok ? t('manager.files.downloadOk') : t('manager.files.downloadBad'))
  } catch (err) {
    log(errorMessage(err, t))
  } finally {
    busy.value = false
  }
}

function onDelete(e) {
  deleteTarget.value = e
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  const e = deleteTarget.value
  if (!e) return
  busy.value = true
  try {
    const s = await ensureSession()
    await s.remove(path.value + '/' + e.name)
    log(t('manager.files.deleted', { name: e.name }))
    await loadDir()
  } catch (err) {
    log(errorMessage(err, t))
  } finally {
    busy.value = false
  }
}

function onMkdir() {
  mkdirName.value = ''
  mkdirDialogOpen.value = true
}

async function confirmMkdir() {
  const name = mkdirName.value.trim()
  if (!name) return
  busy.value = true
  try {
    const s = await ensureSession()
    await s.mkdir(path.value + '/' + name)
    log(t('manager.files.created', { name }))
    await loadDir()
  } catch (err) {
    log(errorMessage(err, t))
  } finally {
    busy.value = false
  }
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
        <button class="btn btn--ghost btn--sm fs-icon-btn" :aria-label="t('manager.files.up')" :title="t('manager.files.up')" @click="up" :disabled="path === '/sd'">
          <IconGlyph name="arrow-up" />
        </button>
        <button class="btn btn--ghost btn--sm" @click="loadDir()">{{ t('manager.files.refresh') }}</button>
        <button class="btn btn--ghost btn--sm" @click="onMkdir">{{ t('manager.files.mkdir') }}</button>
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
          <span class="fs-item__icon" aria-hidden="true"><IconGlyph :name="e.isDir ? 'folder' : 'file'" /></span>
          {{ e.name }}
        </button>
        <span class="fs-item__meta mono">
          {{ e.isDir ? t('manager.files.dir') : fmtSize(e.sizeOrCount) }}
        </span>
        <span class="fs-item__ops">
          <button class="op" :disabled="busy" :title="t('manager.files.download')" :aria-label="t('manager.files.download')" @click="onDownload(e)"><IconGlyph name="download" /></button>
          <button class="op" :disabled="busy" :title="t('manager.files.delete')" :aria-label="t('manager.files.delete')" @click="onDelete(e)"><IconGlyph name="trash" /></button>
        </span>
      </li>
    </ul>
    <div v-else class="fs-empty">{{ t('manager.files.empty') }}</div>

    <ConfirmDialog
      v-model:open="deleteDialogOpen"
      :title="t('manager.files.delete')"
      :message="deleteTarget ? t('manager.files.deleteConfirm', { name: deleteTarget.name }) : ''"
      :confirm-label="t('manager.files.delete')"
      :cancel-label="t('manager.files.cancel')"
      variant="danger"
      @confirm="confirmDelete"
    />
    <ConfirmDialog
      v-model:open="mkdirDialogOpen"
      v-model:input-value="mkdirName"
      :title="t('manager.files.mkdir')"
      :input-label="t('manager.files.mkdirPrompt')"
      :confirm-label="t('manager.files.mkdir')"
      :cancel-label="t('manager.files.cancel')"
      input-mode
      @confirm="confirmMkdir"
    />
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
  background: var(--paper);
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
.fs-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
.fs-icon-btn { padding-inline: 0.6em; }
.fs-icon-btn :deep(.glyph) { width: 1em; height: 1em; }
.fs-list { list-style: none; padding: 0; margin: 0; border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.fs-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--line);
  transition: background 0.15s;
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
.fs-item__icon { flex-shrink: 0; display: inline-flex; }
.fs-item__icon :deep(.glyph) { width: 1.1em; height: 1.1em; }
.fs-item__meta { font-size: 0.75rem; color: var(--ink-3); flex-shrink: 0; }
.fs-item__ops { display: flex; gap: 0.25rem; flex-shrink: 0; }
.op {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 0.3rem;
  border-radius: 6px;
  opacity: 0.6;
}
.op :deep(.glyph) { width: 1em; height: 1em; }
.op:hover { opacity: 1; background: var(--paper-2); }
.fs-loading, .fs-empty { padding: 1.5rem; text-align: center; color: var(--ink-3); border: 1px dashed var(--line); border-radius: var(--radius); }
.fs-empty { font-size: 0.9rem; }

@media (max-width: 820px) {
  .fs-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
@media (max-width: 560px) {
  .fs-item {
    flex-wrap: wrap;
  }
  .fs-item__name {
    flex-basis: 100%;
    white-space: normal;
  }
  .fs-item__meta {
    margin-left: auto;
  }
}
</style>
