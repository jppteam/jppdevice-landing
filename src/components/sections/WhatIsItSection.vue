<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'
import IconGlyph from '../IconGlyph.vue'

const { t } = useI18n()

// Icon + order for the three-up; copy lives in i18n under whatIsIt.features.<icon>.
const features = [{ icon: 'open' }, { icon: 'radio' }, { icon: 'game' }]
</script>

<template>
  <section id="what" class="section">
    <div class="container">
      <SectionHeading :eyebrow="t('whatIsIt.eyebrow')" :title="t('whatIsIt.title')" align="center">
        {{ t('whatIsIt.lead') }}
      </SectionHeading>

      <div class="grid">
        <article v-for="f in features" :key="f.icon" class="card">
          <span class="card__icon"><IconGlyph :name="f.icon" /></span>
          <h3 class="card__title">{{ t(`whatIsIt.features.${f.icon}.title`) }}</h3>
          <p class="card__body" v-html="t(`whatIsIt.features.${f.icon}.body`, { strongStart: '<strong>', strongEnd: '</strong>' })"/>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
}
.card {
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 2rem 1.75rem;
  background: var(--white);
  transition: transform 0.2s var(--ease), box-shadow 0.2s var(--ease), border-color 0.2s;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
  border-color: transparent;
}
.card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  font-size: 1.6rem;
  border-radius: 12px;
  background: var(--yellow);
  color: var(--ink);
  margin-bottom: 1.25rem;
}
.card__title {
  font-size: var(--fs-h3);
  font-weight: 800;
  margin-bottom: 0.6rem;
}
.card__body {
  color: var(--ink-2);
}
@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
    max-width: 30rem;
    margin-inline: auto;
  }
}
</style>
