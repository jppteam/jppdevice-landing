<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const lines = ref([])
const refEl = ref(null)

defineExpose({ push, clear, focus })

function push(text) {
  const time = new Date().toLocaleTimeString([], { hour12: false })
  lines.value.push({ time, text: String(text) })
  // Keep the log bounded; autoscroll to the newest line.
  if (lines.value.length > 400) lines.value.splice(0, lines.value.length - 400)
  requestAnimationFrame(() => {
    if (refEl.value) refEl.value.scrollTop = refEl.value.scrollHeight
  })
}
function clear() {
  lines.value = []
}
function focus() {
  refEl.value?.focus()
}
</script>

<template>
  <div class="con">
    <div class="con__head">
      <span class="con__title mono">Log</span>
      <button class="con__clear btn btn--ghost btn--sm" @click="clear">{{ t('manager.console.clear') }}</button>
    </div>
    <pre ref="refEl" class="con__body" tabindex="0" aria-live="polite">
      <template v-if="lines.length">
        <div v-for="(l, i) in lines" :key="i" class="con__line">
          <span class="con__time mono">{{ l.time }}</span>
          <span class="con__text">{{ l.text }}</span>
        </div>
      </template>
      <span v-else class="con__empty">{{ t('manager.console.empty') }}</span>
    </pre>
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
  padding: 0.5rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.con__title {
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
  font-weight: 700;
}
.con__clear {
  color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.3);
  padding: 0.2em 0.7em;
  font-size: 0.72rem;
}
.con__clear:hover {
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
