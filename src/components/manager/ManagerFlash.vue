<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import { flashFirmware } from '../../lib/esptoolFlash.js'
import ManagerConsole from './ManagerConsole.vue'

const { t } = useI18n()
const { log, errorMessage } = useManagerConnection()

const firmwareName = ref('')
const firmwareBytes = ref(null)
const selected = ref(null)
const flashing = ref(false)
const progress = ref(0)
const status = ref('')
const consoleRef = ref(null)

function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  firmwareName.value = f.name
  selected.value = f
  progress.value = 0
  status.value = ''
}

function push(text) {
  consoleRef.value?.push(text)
  log(text)
}

async function onFlash() {
  if (!selected.value || flashing.value) return
  flashing.value = true
  status.value = ''
  progress.value = 0
  try {
    firmwareBytes.value = new Uint8Array(await selected.value.arrayBuffer())
    const port = await navigator.serial.requestPort()
    await flashFirmware(port, firmwareBytes.value, {
      onLog: push,
      onProgress: (_written, total) => {
        progress.value = Math.round((_written / total) * 100)
      },
    })
    status.value = t('manager.flash.done')
    progress.value = 100
  } catch (e) {
    status.value = `${t('manager.flash.fail')}: ${errorMessage(e, t)}`
    push(`${t('manager.flash.fail')}: ${e.message}`)
  } finally {
    flashing.value = false
  }
}
</script>

<template>
  <div class="panel">
    <div class="panel__head">
      <h3 class="panel__title">{{ t('manager.flash.title') }}</h3>
      <p class="panel__body">{{ t('manager.flash.body') }}</p>
    </div>

    <div class="flush">
      <label class="filebtn btn btn--ghost">
        <input type="file" accept=".bin,application/octet-stream" class="visually-hidden" @change="onFile" />
        {{ t('manager.flash.pick') }}
      </label>

      <p v-if="selected" class="file-meta mono">
        {{ firmwareName }} · {{ t('manager.flash.size') }}: {{ (selected.size / 1024).toFixed(1) }} KB
      </p>
      <p v-else class="file-meta hint">{{ t('manager.flash.writeHint') }}</p>

      <button
        class="btn btn--yellow"
        :disabled="!selected || flashing"
        @click="onFlash"
      >
        <span v-if="flashing">{{ t('manager.flash.flashing') }}</span>
        <span v-else>{{ t('manager.flash.flash') }}</span>
      </button>
    </div>

    <div v-if="flashing || progress" class="prog">
      <div class="prog__bar"><span :style="{ width: progress + '%' }" /></div>
      <span class="prog__label mono">{{ progress }}%</span>
    </div>

    <p v-if="status" class="status" :class="{ 'status--err': status.startsWith(t('manager.flash.fail')) }">{{ status }}</p>

    <ManagerConsole ref="consoleRef" class="panel__console" />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.panel__head {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.panel__title {
  font-size: var(--fs-h3);
}
.panel__body {
  color: var(--ink-2);
  max-width: 52rem;
}
.flush {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}
.filebtn input {
  position: absolute;
  opacity: 0;
}
.filebtn {
  cursor: pointer;
}
.file-meta {
  font-size: 0.85rem;
  color: var(--ink-2);
}
.file-meta.hint {
  color: var(--ink-3);
}
.prog {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.prog__bar {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: var(--line);
  overflow: hidden;
}
.prog__bar span {
  display: block;
  height: 100%;
  background: var(--yellow-deep);
  transition: width 0.15s;
}
.prog__label {
  font-size: 0.8rem;
  color: var(--ink-2);
  width: 3.2rem;
}
.status {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink-2);
}
.status--err {
  color: var(--orange-deep);
}
</style>
