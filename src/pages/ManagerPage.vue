<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import SectionHeading from '../components/SectionHeading.vue'
import Badge from '../components/Badge.vue'
import ManagerConnect from '../components/manager/ManagerConnect.vue'
import ManagerFlash from '../components/manager/ManagerFlash.vue'
import ManagerFiles from '../components/manager/ManagerFiles.vue'
import ManagerApps from '../components/manager/ManagerApps.vue'

const { t } = useI18n()

const tabs = [
  { id: 'flash', label: t('manager.tabs.flash') },
  { id: 'files', label: t('manager.tabs.files') },
  { id: 'apps', label: t('manager.tabs.apps') },
]
const active = ref('flash')
</script>

<template>
  <div class="mpage">
    <div class="container">
      <div class="mpage__hero">
        <SectionHeading :eyebrow="t('manager.eyebrow')">
          <template #title>
            {{ t('manager.title') }} <Badge tone="soon">{{ t('manager.beta') }}</Badge>
          </template>
          {{ t('manager.lead') }}
        </SectionHeading>

        <ManagerConnect class="mpage__conn" />

        <nav class="mg-tabs" aria-label="Manager tools">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="mg-tab"
            :class="{ 'mg-tab--on': active === tab.id }"
            @click="active = tab.id"
          >{{ tab.label }}</button>
        </nav>

        <div class="mpage__body">
          <ManagerFlash v-if="active === 'flash'" />
          <ManagerFiles v-else-if="active === 'files'" />
          <ManagerApps v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mpage {
  padding-block: clamp(2.5rem, 1.5rem + 4vw, 4.5rem) var(--section-y);
  background: var(--paper);
  min-height: 60vh;
}
.mpage__conn {
  margin: clamp(1.5rem, 1rem + 2vw, 2.5rem) 0;
}
.mg-tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--line);
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.mg-tab {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.7rem 1.1rem;
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
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
  padding: clamp(1.25rem, 1rem + 2vw, 2.5rem);
}
</style>
