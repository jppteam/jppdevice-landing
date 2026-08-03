<script setup>
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionHeading from '../components/SectionHeading.vue'
import Badge from '../components/Badge.vue'
import IconGlyph from '../components/IconGlyph.vue'
import ManagerConnectCard from '../components/manager/ManagerConnectCard.vue'
import ManagerFlashCard from '../components/manager/ManagerFlashCard.vue'
import ManagerDeviceInfo from '../components/manager/ManagerDeviceInfo.vue'
import ManagerFiles from '../components/manager/ManagerFiles.vue'
import ManagerApps from '../components/manager/ManagerApps.vue'
import ManagerLogModal from '../components/manager/ManagerLogModal.vue'
import { useManagerConnection } from '../lib/useManagerConnection.js'

const { t } = useI18n()
const { sessionOpen, supported } = useManagerConnection()

// Files and Apps talk over a JPPD-SMP session, so their tabs only exist once
// one is open. Connect and Flash are their own standalone cards above.
const tabs = [
  { id: 'files', icon: 'sd' },
  { id: 'apps', icon: 'game' },
]

const active = ref('files')
const tablistRef = ref(null)
const logOpen = ref(false)

watch(sessionOpen, (open) => {
  if (!open) logOpen.value = false
})

function onKeydown(e) {
  const ids = tabs.map((tab) => tab.id)
  const idx = ids.indexOf(active.value)
  if (idx === -1) return
  let next
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % ids.length
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + ids.length) % ids.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = ids.length - 1
  else return
  e.preventDefault()
  active.value = ids[next]
  nextTick(() => {
    tablistRef.value?.querySelectorAll('.mg-tab')[next]?.focus()
  })
}
</script>

<template>
  <div class="mpage">
    <div class="container">
      <div class="mpage__hero">
        <SectionHeading>
          <template #title>
            <span style="display: flex; align-items: center; gap: 8px">
              {{ t('manager.title') }}
              <Badge tone="soon"><span style="text-transform: lowercase;">β</span></Badge>
            </span>
          </template>
          {{ t('manager.lead') }}
        </SectionHeading>

        <div class="mpage__logbar">
          <button class="btn btn--ghost btn--sm" @click="logOpen = true">
            <IconGlyph name="code" />
            {{ t('manager.log.show') }}
          </button>
        </div>

        <div v-if="!supported" class="mg-card mpage__unsupported">
          <div class="mg-card__heading">
            <IconGlyph name="browser"/>
            <h3>{{ t('manager.unsupportedTitle') }}</h3>
          </div>
          <hr class="mg-card__sep">
          <p class="mg-card__warn">{{ t('manager.unsupported') }}</p>
        </div>
        <ul v-else class="mpage__opts">
          <li><ManagerConnectCard /></li>
          <li><ManagerFlashCard /></li>
        </ul>

        <ManagerDeviceInfo />

        <template v-if="sessionOpen">
          <nav ref="tablistRef" class="mg-tabs" role="tablist" aria-label="Manager tools" @keydown="onKeydown">
            <button
              v-for="tab in tabs"
              :id="'mg-tab-' + tab.id"
              :key="tab.id"
              class="mg-tab"
              :class="{ 'mg-tab--on': active === tab.id }"
              role="tab"
              :aria-selected="active === tab.id"
              :aria-controls="'mg-panel-' + tab.id"
              :tabindex="active === tab.id ? 0 : -1"
              @click="active = tab.id"
            >
              <IconGlyph :name="tab.icon" />
              {{ t(`manager.tabs.${tab.id}`) }}
            </button>
          </nav>

          <div class="mpage__body">
            <div v-show="active === 'files'" id="mg-panel-files" role="tabpanel" aria-labelledby="mg-tab-files">
              <ManagerFiles />
            </div>
            <div v-show="active === 'apps'" id="mg-panel-apps" role="tabpanel" aria-labelledby="mg-tab-apps">
              <ManagerApps />
            </div>
          </div>
        </template>
      </div>
    </div>

    <ManagerLogModal v-model:open="logOpen" />
  </div>
</template>

<style scoped>
.mpage {
  padding-block: clamp(2.5rem, 1.5rem + 4vw, 4.5rem) var(--section-y);
  background: var(--paper);
  min-height: 60vh;
}
.mpage__logbar {
  display: flex;
  margin-top: clamp(1rem, 0.6rem + 1.5vw, 1.5rem);
}
.mpage__opts {
  all: unset;
  display: flex;
  gap: 16px;
  margin: clamp(1rem, 0.6rem + 1.5vw, 1.5rem) 0 clamp(1.5rem, 1rem + 2vw, 2.5rem);
}
.mpage__unsupported {
  margin: clamp(1rem, 0.6rem + 1.5vw, 1.5rem) 0 clamp(1.5rem, 1rem + 2vw, 2.5rem);
}
.mpage__opts li {
  all: unset;
  flex: 1 1 50%;
}
.mg-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.mg-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45em;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.7rem 1.1rem;
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.mg-tab :deep(.glyph) {
  width: 1.05em;
  height: 1.05em;
}
.mg-tab:hover { color: var(--ink); }
.mg-tab--on {
  color: var(--ink);
  border-bottom-color: var(--yellow);
}
.mpage__body {
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: clamp(1.25rem, 1rem + 2vw, 2.5rem);
}

@media (max-width: 860px) {
  .mg-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .mg-tab {
    flex-shrink: 0;
  }
  .mpage__opts {
    flex-direction: column;
  }
}
</style>
