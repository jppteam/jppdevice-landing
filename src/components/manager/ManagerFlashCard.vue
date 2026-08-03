<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import { flashFirmware, flashPartitionArchive } from '../../lib/esptoolFlash.js'
import IconGlyph from '../IconGlyph.vue'
import ManagerReleasesModal from './ManagerReleasesModal.vue'

const { t } = useI18n()
const { log, errorMessage, sessionOpen, endSession } = useManagerConnection()

const firmwareName = ref('')
const firmwareBytes = ref(null)
const selected = ref(null)
const flashing = ref(false)
const progress = ref(0)
const status = ref('')
const chipName = ref('')
const flashSize = ref('')
const nvsWarning = ref('')
const releasesOpen = ref(false)

function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  firmwareName.value = f.name
  selected.value = f
  progress.value = 0
  status.value = ''
  chipName.value = ''
  flashSize.value = ''
  nvsWarning.value = ''
}

async function onFlash() {
  if (!selected.value || flashing.value) return
  flashing.value = true
  status.value = ''
  progress.value = 0
  chipName.value = ''
  flashSize.value = ''
  nvsWarning.value = ''
  try {
    // Flashing opens its own raw serial connection to the chip's ROM
    // bootloader; it can't share a port that a JPPD-SMP session already has
    // open, so make sure any active session is closed first.
    if (sessionOpen.value) {
      log(t('manager.flash.endingSession'))
      await endSession()
    }
    firmwareBytes.value = new Uint8Array(await selected.value.arrayBuffer())
    const port = await navigator.serial.requestPort()
    const callbacks = {
      onLog: (text) => log(text),
      onProgress: (written, total) => {
        progress.value = Math.round((written / total) * 100)
      },
      onChipInfo: (chip, size) => {
        chipName.value = chip
        flashSize.value = size
        // onChipInfo only fires once the real write connection is up (after
        // any NVS backup phase has already finished), so this is the right
        // moment to move the status text off "backing up" and onto "flashing".
        status.value = t('manager.flash.flashing')
      },
      onRebooting: () => {
        status.value = t('manager.flash.reboot')
      },
    }
    if (/\.zip$/i.test(selected.value.name)) {
      // A .zip of separate partition images (idf.py build output). Each
      // partition is written at its own offset, and since that never
      // includes NVS, no backup/restore is needed here.
      await flashPartitionArchive(port, firmwareBytes.value, callbacks)
    } else {
      // A single merged image spans the whole flash — including NVS — so
      // flashFirmware backs that partition up first and restores it after.
      await flashFirmware(port, firmwareBytes.value, {
        ...callbacks,
        onNvsStatus: (phase) => {
          if (phase === 'backing-up') status.value = t('manager.flash.backingUpNvs')
          else if (phase === 'restoring') status.value = t('manager.flash.restoringNvs')
          else if (phase === 'restore-failed') nvsWarning.value = t('manager.flash.nvsRestoreFailed')
        },
      })
    }
    status.value = t('manager.flash.done')
    progress.value = 100
  } catch (e) {
    status.value = `${t('manager.flash.fail')}: ${errorMessage(e, t)}`
    log(`${t('manager.flash.fail')}: ${e.message}`)
  } finally {
    flashing.value = false
  }
}
</script>

<template>
  <div class="mg-card" :class="{ 'mg-card--open': flashing }">
    <div class="mg-card__heading">
      <IconGlyph name="flash"/>
      <h3>{{ t('manager.flash.title') }}</h3>
    </div>
    <hr class="mg-card__sep">

    <div class="mg-card__row">
      <div class="mg-card__meta">
        <div class="mg-card__texts" v-if="selected">
          <strong>{{ firmwareName }}</strong>
          <span class="flash__size" v-if="status">
            {{ (selected.size / 1024).toFixed(1) }} KB
            ·
            {{ status }}
          </span>
          <span class="flash__size" v-else>{{ (selected.size / 1024).toFixed(1) }} KB</span>
        </div>
        <p v-else class="mg-card__hint">{{ t('manager.flash.body') }}</p>
      </div>

      <button
        v-if="selected"
        class="btn btn--yellow btn--sm"
        :disabled="flashing"
        @click="onFlash"
      >
        <span v-if="flashing">{{ t('manager.flash.flashing') }}</span>
        <span v-else>{{ t('manager.flash.flash') }}</span>
      </button>
    </div>

    <div v-if="chipName || flashing || progress" class="mg-card__detail-wrap">
      <dl v-if="chipName" class="mg-card__detail">
        <div><dt>{{ t('manager.flash.chip') }}</dt><dd class="mono">{{ chipName }}</dd></div>
        <div><dt>{{ t('manager.flash.flashSize') }}</dt><dd class="mono">{{ flashSize }}</dd></div>
      </dl>
      <div v-if="flashing" class="prog">
        <div
          class="prog__bar"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="t('manager.flash.progress')"
        ><span :style="{ width: progress + '%' }" /></div>
        <span class="prog__label mono">{{ progress }}%</span>
      </div>
      <p v-if="nvsWarning" class="flash__nvs-warning">{{ nvsWarning }}</p>
    </div>

    <div class="mg-card__actions">
      <label class="filebtn btn btn--ghost btn--sm">
        <input type="file" accept=".bin,.zip,application/octet-stream,application/zip" class="visually-hidden" @change="onFile" />
        {{ t('manager.flash.pick') }}
      </label>
      <button class="btn btn--ghost btn--sm" @click="releasesOpen = true">
        {{ t('manager.flash.browseReleases') }}
      </button>
    </div>

    <p v-if="sessionOpen" class="flash__session-hint">{{ t('manager.flash.endsSession') }}</p>
    <ManagerReleasesModal v-model:open="releasesOpen" />
  </div>
</template>

<style scoped>
.filebtn input {
  position: absolute;
  opacity: 0;
}
.filebtn {
  cursor: pointer;
}
.flash__size {
  font-size: 0.8rem;
  color: var(--ink-3);
}
.flash__session-hint {
  font-size: 0.82rem;
  color: var(--ink-3);
  margin-top: 0.6rem;
}
.flash__nvs-warning {
  font-size: 0.82rem;
  color: var(--error-deep);
  margin-top: 0.6rem;
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
</style>
