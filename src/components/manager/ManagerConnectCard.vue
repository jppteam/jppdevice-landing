<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useManagerConnection } from '../../lib/useManagerConnection.js'
import IconGlyph from '../IconGlyph.vue'

const { t } = useI18n()
const { openSession, refreshInfo, endSession, errorMessage,
  port, sessionOpen, log } = useManagerConnection()

const busy = ref(false)
const syncing = ref(false)
const status = ref('')

async function onConnect() {
  status.value = ''
  try {
    busy.value = true
    log(t('manager.connectCard.connecting'))
    await openSession(log)
    log(t('manager.connectCard.consent'))
    await refreshInfo(log)
    status.value = t('manager.connectCard.sessionOpen')
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

async function onSyncTime() {
  syncing.value = true
  try {
    const s = await openSession(log)
    await s.setTime(new Date())
    status.value = t('manager.timeSynced')
    log(t('manager.timeSynced'))
  } catch (e) {
    status.value = errorMessage(e, t)
    log(errorMessage(e, t))
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="mg-card" :class="{ 'mg-card--open': sessionOpen }">
    <div class="mg-card__heading">
      <IconGlyph name="usb"/>
      <h3>{{ t('manager.connectCard.title') }}</h3>
    </div>
    <hr class="mg-card__sep">
    <div class="mg-card__row">
      <div class="mg-card__meta">
        <span v-if="!port" class="conn__dots" />
        <span v-else class="conn__dot" :class="{ 'conn__dot--on': sessionOpen }" />
        <div class="mg-card__texts">
          <strong>{{ sessionOpen ? t('manager.connectCard.connected') : t('manager.connectCard.noSession') }}</strong>
        </div>
      </div>

      <div class="mg-card__actions">
        <button
          v-if="!sessionOpen"
          class="btn btn--ink btn--sm"
          :disabled="busy"
          @click="onConnect"
        >
          <span v-if="busy">{{ t('manager.connectCard.connecting') }}</span>
          <span v-else>{{ t('manager.connectCard.connect') }}</span>
        </button>
        <button v-else class="btn btn--on-ink btn--sm" @click="onDisconnect">
          {{ t('manager.connectCard.disconnect') }}
        </button>
      </div>
    </div>

    <p v-if="status" class="mg-card__status">{{ status }}</p>
    <p v-else class="mg-card__hint">{{ t('manager.connectCard.hint') }}</p>

    <div class="mg-card__actions">
      <button v-if="sessionOpen" class="btn btn--ghost btn--sm" :disabled="syncing" @click="onSyncTime">
        {{ t('manager.syncTime') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
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
  background: var(--success);
  box-shadow: 0 0 0 4px var(--success-soft);
}
</style>
