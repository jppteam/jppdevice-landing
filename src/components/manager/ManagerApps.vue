<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import { validateAppPackage } from '../../lib/validateApp.js'
import { unzipSync } from 'fflate'
import ManagerConsole from './ManagerConsole.vue'

const { t } = useI18n()
const { openSession, errorMessage, log } = useManagerConnection()

const validated = ref(null) // { manifest, entryName, files, skipped }
const invalid = ref('')
const validating = ref(false)
const installing = ref(false)
const sourceLabel = ref('')
const consoleRef = ref(null)
const folderInput = ref(null)
const zipInput = ref(null)

function push(text) {
  consoleRef.value?.push(text)
  log(text)
}

async function applyPackage(filesByPath, label) {
  validating.value = true
  invalid.value = ''
  validated.value = null
  sourceLabel.value = label
  try {
    const result = validateAppPackage(filesByPath)
    validated.value = result
    push(`validated ${result.manifest.app_id} (${result.files.length} files)`)
  } catch (e) {
    invalid.value = e.message
    push(`${t('manager.apps.error')}: ${e.message}`)
  } finally {
    validating.value = false
  }
}

async function onFolder(e) {
  const input = e.target
  const files = Array.from(input.files || [])
  if (!files.length) {
    validated.value = null
    return
  }
  // webkitRelativePath gives "AppDir/<file>"; we want the root of the package
  // to be the folder itself, so map each file to its basename within it.
  const map = {}
  for (const f of files) {
    if (!f.webkitRelativePath) continue
    const rel = f.webkitRelativePath.split('/')
    rel.shift() // drop the folder name -> package root
    const name = rel.join('/')
    if (!name) continue
    map[name] = await f.arrayBuffer()
  }
  const folderName = files[0]?.webkitRelativePath.split('/')[0] || t('manager.apps.pickFolder')
  await applyPackage(map, folderName)
  e.target.value = ''
}

async function onZip(e) {
  const f = e.target.files?.[0]
  if (!f) {
    validated.value = null
    return
  }
  const data = new Uint8Array(await f.arrayBuffer())
  const out = unzipSync(data)
  // If every entry shares a single top-level folder, strip it so the zip's
  // root behaves like the folder the user picked.
  const names = Object.keys(out).filter((n) => !n.endsWith('/'))
  let prefix = ''
  if (names.length) {
    const roots = new Set(names.map((n) => n.split('/')[0]))
    if (roots.size === 1) prefix = `${[...roots][0]}/`
  }
  const map = {}
  for (const [name, bytes] of Object.entries(out)) {
    if (name.endsWith('/')) continue
    map[name.startsWith(prefix) ? name.slice(prefix.length) : name] = bytes
  }
  await applyPackage(map, f.name)
  e.target.value = ''
}

async function onInstall() {
  if (!validated.value || installing.value) return
  installing.value = true
  try {
    const s = await openSession(push)
    const { manifest, files } = validated.value
    const appId = manifest.app_id
    const remoteDir = `/sd/apps/${appId}`
    push(`mkdir ${remoteDir}`)
    await s.mkdir(remoteDir)
    for (const file of files) {
      push(`↑ ${file.name} (${(file.data.byteLength / 1024).toFixed(1)} KB)`)
      await s.uploadFile(file.data, `${remoteDir}/${file.name}`)
    }
    push(t('manager.apps.installDone', { app_id: appId }))
  } catch (e) {
    push(errorMessage(e, t))
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <div class="panel">
    <div class="panel__head">
      <h3 class="panel__title">{{ t('manager.apps.title') }}</h3>
      <p class="panel__body">{{ t('manager.apps.body') }}</p>
    </div>

    <div class="apps-input">
      <label class="btn btn--ghost">
        {{ t('manager.apps.pickFolder') }}
        <input ref="folderInput" type="file" webkitdirectory multiple class="visually-hidden" @change="onFolder" />
      </label>
      <label class="btn btn--ghost">
        {{ t('manager.apps.pickZip') }}
        <input ref="zipInput" type="file" accept=".zip,application/zip" class="visually-hidden" @change="onZip" />
      </label>
      <p class="apps-hint">{{ t('manager.apps.folderHint') }}</p>
    </div>

    <div v-if="validating" class="apps-status">{{ t('manager.apps.validate') }}</div>
    <div v-else-if="invalid" class="apps-err">
      <strong>{{ t('manager.apps.error') }}:</strong>
      <span class="mono">{{ invalid }}</span>
    </div>
    <div v-else-if="validated" class="apps-ok">
      <p class="apps-valid">
        <span class="dot" aria-hidden="true" />
        {{ t('manager.apps.valid') }} — <span class="mono">source: {{ sourceLabel }}</span>
      </p>
      <dl class="apps-detail">
        <div><dt>{{ t('manager.apps.manifest') }}</dt><dd class="mono">{{ validated.manifest.app_id }} · {{ validated.manifest.version }}</dd></div>
        <div><dt>{{ t('manager.apps.entry') }}</dt><dd class="mono">{{ validated.entryName }}</dd></div>
        <div><dt>{{ t('manager.apps.type') }}</dt><dd class="mono">{{ validated.manifest.app_type }}</dd></div>
        <div>
          <dt>{{ t('manager.apps.caps') }}</dt>
          <dd class="mono">{{ validated.manifest.capabilities?.length ? validated.manifest.capabilities.join(', ') : t('manager.apps.none') }}</dd>
        </div>
        <div v-if="validated.skipped.length">
          <dt>{{ t('manager.apps.skipped') }}</dt><dd class="mono">{{ validated.skipped.join(', ') }}</dd>
        </div>
      </dl>
      <button class="btn btn--yellow" :disabled="installing" @click="onInstall">
        <span v-if="installing">{{ t('manager.apps.installing') }}</span>
        <span v-else>{{ t('manager.apps.install') }}</span>
      </button>
    </div>
    <div v-else class="apps-status">{{ t('manager.apps.noFiles') }}</div>

    <ManagerConsole ref="consoleRef" class="panel__console" />
  </div>
</template>

<style scoped>
.panel { display: flex; flex-direction: column; gap: 1.25rem; }
.panel__head { display: flex; flex-direction: column; gap: 0.3rem; }
.panel__title { font-size: var(--fs-h3); }
.panel__body { color: var(--ink-2); max-width: 52rem; }
.apps-input { display: flex; align-items: center; flex-wrap: wrap; gap: 0.75rem; }
.apps-input label { cursor: pointer; }
.apps-input input { position: absolute; opacity: 0; }
.apps-hint { width: 100%; font-size: 0.82rem; color: var(--ink-3); }
.apps-status { padding: 1.25rem; text-align: center; color: var(--ink-3); border: 1px dashed var(--line); border-radius: var(--radius); }
.apps-err {
  border: 1px solid var(--orange);
  background: var(--orange-soft);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.9rem;
}
.apps-err strong { color: var(--orange-deep); }
.apps-err .mono { font-size: 0.85rem; color: var(--ink-2); }
.apps-ok { border: 1px solid var(--ink); border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.apps-valid { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.apps-valid .mono { font-weight: 400; color: var(--ink-2); font-size: 0.85rem; }
.dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--yellow-deep); }
.apps-detail { margin: 0; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.9rem; }
.apps-detail div { display: flex; gap: 0.5rem; }
.apps-detail dt { color: var(--ink-3); min-width: 8.5rem; }
.apps-detail dd { margin: 0; }
.apps-ok .btn { align-self: flex-start; }
</style>
