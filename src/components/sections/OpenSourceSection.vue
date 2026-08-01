<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'
import Badge from '../Badge.vue'
import IconGlyph from '../IconGlyph.vue'
import { site } from '../../data/site.js'

const { t } = useI18n()

// Copy lives in i18n under openSource.firmwares.<id>.
const firmwares = [
  { id: 'jppdos', status: 'shipped', link: site.links.firmware },
]

// Ecosystem roadmap. Copy lives in i18n under openSource.roadmap.<id> (hyphens
// in ids become underscores in the key lookup).
const roadmap = [
  { id: 'firmware', status: 'shipped', link: site.links.firmware },
  { id: 'docs', status: 'shipped', link: site.links.appDocs },
  { id: 'cad', status: 'shipped', link: site.links.cad },
  { id: 'web-flasher', status: 'soon', link: site.links.webFlasher },
  { id: 'web-ui', status: 'soon', link: site.links.webUi },
]

const iconFor = {
  firmware: 'chip',
  docs: 'code',
  cad: 'open',
  'web-flasher': 'flash',
  'web-ui': 'browser',
}
const key = (id) => id.replace(/-/g, '_')
</script>

<template>
  <section id="open-source" class="section section--paper">
    <div class="container">
      <SectionHeading :eyebrow="t('openSource.eyebrow')" :title="t('openSource.title')">
        {{ t('openSource.lead') }}
      </SectionHeading>

      <!-- Firmware switch story -->
      <div class="fw">
        <div v-for="f in firmwares" :key="f.id" class="fw__card" :class="{ 'fw__card--soon': f.status === 'soon' }">
          <div class="fw__head">
            <h3 class="fw__name">{{ t(`openSource.firmwares.${key(f.id)}.name`) }}</h3>
            <Badge v-if="f.status === 'soon'" tone="soon">{{ t('openSource.statusSoon') }}</Badge>
            <Badge v-else tone="yellow">{{ t('openSource.statusShipping') }}</Badge>
          </div>
          <p class="fw__role">{{ t(`openSource.firmwares.${key(f.id)}.role`) }}</p>
          <p class="fw__body">{{ t(`openSource.firmwares.${key(f.id)}.body`) }}</p>
        </div>
        <p class="fw__caption">
          {{ t('openSource.caption') }}
        </p>
      </div>

      <!-- Roadmap grid -->
      <div class="road">
        <a
          v-for="r in roadmap"
          :key="r.id"
          class="road__item"
          :class="{ 'road__item--soon': r.status === 'soon' }"
          :href="r.link"
          :target="r.link && r.link !== '#' ? '_blank' : null"
          rel="noopener"
        >
          <span class="road__icon"><IconGlyph :name="iconFor[r.id] || 'chip'" /></span>
          <div class="road__text">
            <div class="road__head">
              <h4 class="road__name">{{ t(`openSource.roadmap.${key(r.id)}.name`) }}</h4>
              <Badge :tone="r.status === 'soon' ? 'soon' : 'default'">
                {{ r.status === 'soon' ? t('openSource.statusSoon') : t('openSource.statusNow') }}
              </Badge>
            </div>
            <p class="road__body">{{ t(`openSource.roadmap.${key(r.id)}.body`) }}</p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fw {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}
.fw__caption {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--ink-3);
  font-size: 0.95rem;
  max-width: 40rem;
  margin-inline: auto;
  margin-top: 0.5rem;
}
.fw__card {
  background: var(--ink);
  color: var(--white);
  border-radius: var(--radius-lg);
  padding: 2rem;
}
.fw__card--soon {
  background: var(--white);
  color: var(--ink);
  border: 1px dashed var(--yellow-deep);
}
.fw__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}
.fw__name {
  font-size: var(--fs-h3);
  font-weight: 800;
}
.fw__role {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--yellow);
  margin-bottom: 0.9rem;
}
.fw__card--soon .fw__role {
  color: var(--orange-deep);
}
.fw__body {
  color: rgba(255, 255, 255, 0.78);
}
.fw__card--soon .fw__body {
  color: var(--ink-2);
}

.road {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
.road__item {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--white);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  transition: transform 0.15s var(--ease), border-color 0.15s, box-shadow 0.15s;
}
.road__item:hover {
  transform: translateY(-3px);
  border-color: var(--ink);
  box-shadow: var(--shadow-sm);
}
.road__item--soon {
  background: var(--paper-2);
}
.road__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  font-size: 1.25rem;
  border-radius: 10px;
  background: var(--yellow);
  color: var(--ink);
}
.road__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.road__name {
  font-size: 1.05rem;
  font-weight: 800;
}
.road__body {
  font-size: 0.9rem;
  color: var(--ink-2);
}
@media (max-width: 860px) {
  .fw {
    grid-template-columns: 1fr;
  }
  .road {
    grid-template-columns: 1fr;
  }
}
</style>
