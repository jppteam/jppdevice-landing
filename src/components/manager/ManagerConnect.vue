<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'

const { t } = useI18n()
const { openSession, refreshInfo, endSession, errorMessage,
  supported, port, sessionOpen, log } = useManagerConnection()

const busy = ref(false)
const status = ref('')

function fmt(n) {
  if (n === 0n || n === 0) return '0 B'
  const mb = Number(n) / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

async function onConnect() {
  status.value = ''
  try {
    busy.value = true
    log(t('manager.connecting'))
    await openSession(log)
    log(t('manager.consent'))
    await refreshInfo(log)
    status.value = t('manager.sessionOpen')
  } catch (e) {
    status.value = errorMessage(e, t)
    log(errorMessage(e, t))
  } finally {
    busy.value = false
  }
}

async function onDisconnect() {
  // If a session is open and not explicitly closed by a tab, just release the
  // port object reference; tabs manage their own sessions.
  if (sessionOpen.value) {
    try {
      await endSession()
    } catch {
      /* ignore */
    }
  }
}
</script>

<template>
  <div class="conn" :class="{ 'conn--open': sessionOpen }">
    <div class="conn__row">
      <div class="conn__meta">
        <span v-if="!port" class="conn__dots" />
        <span v-else class="conn__dot" :class="{ 'conn__dot--on': sessionOpen }" />
        <div class="conn__texts">
          <strong>{{ sessionOpen ? t('manager.connected') : t('manager.noSession') }}</strong>
          <span v-if="info" class="mono conn__info">
            {{ info.fwVersion }} · {{ info.hwid }} · {{ info.sdLabel || t('manager.info.noLabel') }}
            <template v-if="info.sdTotal > 0n"> · {{ fmt(info.sdFree) }} {{ t('manager.info.free') }} / {{ fmt(info.sdTotal) }}</template>
          </span>
        </div>
      </div>

      <div class="conn__actions">
        <button
          v-if="!sessionOpen"
          class="btn btn--ink btn--sm"
          :disabled="busy || !supported"
          @click="onConnect"
        >
          <span v-if="busy">{{ t('manager.connecting') }}</span>
          <span v-else>{{ t('manager.connect') }}</span>
        </button>
        <button v-else class="btn btn--on-ink btn--sm" @click="onDisconnect">
          {{ t('manager.disconnect') }}
        </button>
      </div>
    </div>

    <p v-if="!supported" class="conn__warn">{{ t('manager.unsupported') }}</p>
    <p v-else-if="status" class="conn__status">{{ status }}</p>
    <p v-else class="conn__hint">{{ t('manager.connectHint') }}</p>
  </div>
</template>

<style scoped>
.conn {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--white);
  padding: 1.1rem 1.25rem;
  transition: border-color 0.2s;
}
.conn--open {
  border-color: var(--ink);
}
.conn__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.conn__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.conn__dots,
.conn__dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.conn__dots {
  background: var(--ink-3);
}
.conn__dot {
  background: var(--ink-3);
}
.conn__dot--on {
  background: var(--orange);
  box-shadow: 0 0 0 4px var(--orange-soft);
}
.conn__texts {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.conn__info {
  font-size: 0.75rem;
  color: var(--ink-3);
}
.conn__actions {
  flex-shrink: 0;
}
.conn__warn,
.conn__hint,
.conn__status {
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: var(--ink-3);
}
.conn__warn {
  color: var(--orange-deep);
  font-weight: 600;
}
.conn__status {
  color: var(--ink-2);
}
</style>
