<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'
import CodeBlock from '../CodeBlock.vue'
import { codeSamples, sdkGroups, capabilityTiers } from '../../data/codeSamples.js'
import { site } from '../../data/site.js'

const { t } = useI18n()
</script>

<template>
  <section id="developers" class="section section--ink">
    <div class="container">
      <SectionHeading :eyebrow="t('developers.eyebrow')" :title="`${t('developers.titlePre')} ${t('developers.titleHighlight')}`">
        <template #title>
          {{ t('developers.titlePre') }} <span class="hl">{{ t('developers.titleHighlight') }}</span>
        </template>
        {{ t('developers.lead') }}
      </SectionHeading>

      <div class="dev">
        <div class="dev__code">
          <CodeBlock :tabs="codeSamples" />
          <p class="dev__hint mono">
            {{ t('developers.hint') }}
          </p>
        </div>

        <aside class="dev__side">
          <h3 class="dev__h3">{{ t('developers.sdkGlance') }}</h3>
          <ul class="sdk">
            <li v-for="g in sdkGroups" :key="g.id" class="sdk__item">
              <span class="sdk__name">{{ t(`developers.sdkGroups.${g.id}`) }}</span>
              <span class="sdk__calls mono">{{ g.calls }}</span>
            </li>
          </ul>

          <h3 class="dev__h3">{{ t('developers.sandboxTitle') }}</h3>
          <ul class="tiers">
            <li v-for="tier in capabilityTiers" :key="tier.id" class="tier">
              <strong>{{ t(`developers.tiers.${tier.id}.tier`) }}</strong>
              <span>{{ t(`developers.tiers.${tier.id}.body`) }}</span>
            </li>
          </ul>

          <div class="dev__links">
            <a class="btn btn--on-ink btn--sm" :href="site.links.appDocs" target="_blank" rel="noopener">{{ t('developers.sdkReference') }}</a>
            <a class="btn btn--on-ink btn--ghost btn--sm" :href="site.links.repos.jppdos.github" target="_blank" rel="noopener">{{ t('developers.firmwareRepo') }}</a>
          </div>
        </aside>
      </div>

      <p class="dev__made">
        <span class="dev__made-dot" aria-hidden="true" />
        <span v-html="t('developers.madeBy', { os: site.os })" />
      </p>
    </div>
  </section>
</template>

<style scoped>
.section--ink :deep(.eyebrow) {
  color: var(--yellow);
}
.hl {
  color: var(--yellow);
}
.dev {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: clamp(1.5rem, 1rem + 3vw, 3rem);
  align-items: start;
}
.dev__code {
  min-width: 0; /* let the code block's internal overflow-x scroll */
}
.dev__hint {
  margin-top: 1rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
}
.dev__h3 {
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
  font-weight: 700;
  margin-bottom: 0.85rem;
}
.dev__h3:not(:first-child) {
  margin-top: 2rem;
}
.sdk {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.sdk__item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.sdk__name {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.95rem;
}
.sdk__calls {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.55);
}
.tiers {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.tier {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.tier strong {
  font-size: 0.95rem;
}
.tier span {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}
.dev__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
}
.dev__made {
  margin-top: clamp(2rem, 1rem + 3vw, 3.5rem);
  padding: 1.25rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.04);
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}
.dev__made strong {
  color: var(--yellow);
  font-weight: 700;
}
.dev__made-dot {
  flex-shrink: 0;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background: var(--yellow);
  transform: translateY(-0.05em);
}
@media (max-width: 860px) {
  .dev {
    grid-template-columns: 1fr;
  }
}
</style>
