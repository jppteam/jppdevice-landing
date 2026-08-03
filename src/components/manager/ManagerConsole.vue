<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import IconGlyph from '../IconGlyph.vue'

const { t } = useI18n()
const { logLines, clearLog } = useManagerConnection()
const refEl = ref(null)

function scrollToBottom() {
  requestAnimationFrame(() => {
    if (refEl.value) refEl.value.scrollTop = refEl.value.scrollHeight
  })
}
watch(() => logLines.value.length, scrollToBottom)

function downloadLog() {
  const text = logLines.value.map((l) => `${l.time}  ${l.text}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jppdevice-manager-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="con">
    <div class="con__head">
      <span class="con__title mono">{{ t('manager.console.title') }}</span>
      <div class="con__head-actions">
        <button class="con__btn btn btn--ghost btn--sm" @click="downloadLog">
          <IconGlyph name="download" />
          {{ t('manager.console.download') }}
        </button>
        <button class="con__btn btn btn--ghost btn--sm" @click="clearLog">{{ t('manager.console.clear') }}</button>
      </div>
    </div>
    <div ref="refEl" class="con__body" tabindex="0" aria-live="polite">
      <template v-if="logLines.length">
        <div v-for="(l, i) in logLines" :key="i" class="con__line">
          <span class="con__time mono">{{ l.time }}</span>
          <span class="con__text">{{ l.text }}</span>
        </div>
      </template>
      <span v-else class="con__empty">{{ t('manager.console.empty') }}</span>
    </div>
  </div>
</template>

<style scoped>
.con {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--ink);
  color: var(--white);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.con__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  flex-wrap: wrap;
}
.con__title {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
  font-weight: 700;
}
.con__head-actions {
  display: flex;
  gap: 0.4rem;
}
.con__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.3);
  padding: 0.2em 0.7em;
  font-size: 0.72rem;
}
.con__btn :deep(.glyph) {
  width: 0.9em;
  height: 0.9em;
}
.con__btn:hover {
  background: var(--yellow);
  color: var(--ink);
}
.con__body {
  height: 220px;
  overflow-y: auto;
  padding: 0.75rem 0.95rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.con__line {
  display: flex;
  gap: 0.6rem;
}
.con__time {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.35);
}
.con__text {
  color: rgba(255, 255, 255, 0.85);
}
.con__empty {
  color: rgba(255, 255, 255, 0.35);
}
</style>
