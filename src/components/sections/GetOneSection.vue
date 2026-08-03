<script setup>
import { useI18n } from 'vue-i18n'
import SectionHeading from '../SectionHeading.vue'
import Badge from '../Badge.vue'
import IconGlyph from '../IconGlyph.vue'
import { site } from '../../data/site.js'

const { t } = useI18n()

// The Limited Run verification page ships later — render a non-clickable "soon"
// control until site.links.verify points somewhere real.
const verifyReady = site.links.verify && site.links.verify !== '#'
</script>

<template>
  <section id="get-one" class="section">
    <div class="container">
      <SectionHeading :eyebrow="t('getOne.eyebrow')" :title="t('getOne.title')" align="center">
        {{ t('getOne.lead') }}
      </SectionHeading>

      <div class="ways">
        <article class="way way--ink">
          <span class="way__num">01</span>
          <h3 class="way__title">{{ t('getOne.way1Title') }}</h3>
          <p class="way__body">
            {{ t('getOne.way1Body') }}
          </p>
          <a class="btn btn--yellow" :href="site.links.repos.cad.github" target="_blank" rel="noopener">{{ t('getOne.way1Cta') }}</a>
        </article>

        <article class="way">
          <span class="way__num">02</span>
          <h3 class="way__title">{{ t('getOne.way2Title') }}</h3>
          <p class="way__body">
            {{ t('getOne.way2Body', { meetup: site.meetup.name, city: t('site.meetupCity') }) }}
          </p>
        </article>
      </div>

      <!-- Provenance strip — the beak points up to the J++Meetup card -->
      <div class="prov">
        <div class="prov__unit">
          <span class="prov__label mono">{{ t('getOne.provLabel') }}</span>
          <span class="prov__num">{{ t('getOne.provUnitPrefix') }} <b>{{ site.run.exampleUnit }}</b></span>
        </div>
        <div class="prov__main">
          <p class="prov__body">{{ t('getOne.provBody') }}</p>
          <component
            :is="verifyReady ? 'a' : 'span'"
            class="prov__verify"
            :class="{ 'prov__verify--soon': !verifyReady }"
            :href="verifyReady ? site.links.verify : null"
            :target="verifyReady ? '_blank' : null"
            :rel="verifyReady ? 'noopener' : null"
            :aria-disabled="verifyReady ? null : 'true'"
          >
            <IconGlyph name="browser" />
            {{ t('getOne.verifyCta') }}
            <Badge tone="soon">{{ t('common.soon') }}</Badge>
          </component>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.ways {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}
.way {
  position: relative;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: clamp(1.75rem, 1rem + 2vw, 2.5rem);
  overflow: hidden;
}
.way--ink {
  background: var(--ink);
  color: var(--white);
  border-color: var(--ink);
}
.way__num {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 3rem;
  color: var(--ink); /* dark on the light card for contrast */
  line-height: 1;
  display: block;
  margin-bottom: 0.5rem;
}
.way--ink .way__num {
  color: var(--yellow); /* yellow reads well on the dark card */
}
.way__title {
  font-size: var(--fs-h3);
  font-weight: 800;
  margin-bottom: 0.7rem;
}
.way__body {
  color: var(--ink-2);
  margin-bottom: 1.5rem;
}
.way--ink .way__body {
  color: rgba(255, 255, 255, 0.78);
}
.way__meta {
  display: flex;
  gap: 0.6rem;
}
.way--ink .way__meta :deep(.badge--ink) {
  background: var(--white);
  color: var(--ink);
  border-color: var(--white);
}

.prov {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1rem, 0.5rem + 2vw, 2.5rem);
  align-items: center;
  background: var(--yellow-soft);
  border: 1.5px solid var(--yellow-deep);
  border-radius: var(--radius-lg);
  padding: clamp(1.25rem, 1rem + 1.5vw, 2rem);
}
/* Beak pointing up at the J++Meetup card (right column on desktop). */
.prov::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 75%;
  width: 18px;
  height: 18px;
  background: var(--yellow-soft);
  border-top: 1.5px solid var(--yellow-deep);
  border-left: 1.5px solid var(--yellow-deep);
  transform: translateX(-50%) rotate(45deg);
}
.prov__main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.prov__verify {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.15rem;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  padding: 0.5rem 0.9rem;
  border: 1.5px solid var(--yellow-deep);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  transition: background 0.15s, transform 0.12s var(--ease);
}
a.prov__verify:hover {
  background: #fff;
  transform: translateY(-1px);
}
.prov__verify--soon {
  cursor: default;
  color: #6b5d00;
}
.prov__verify :deep(.glyph) {
  font-size: 1.1rem;
}
.prov__unit {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-right: clamp(1rem, 2vw, 2.5rem);
  border-right: 1.5px dashed var(--yellow-deep);
}
.prov__label {
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8a7500;
}
.prov__num {
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}
.prov__num b {
  font-weight: 800;
}
.prov__body {
  color: #6b5d00;
  font-size: 0.95rem;
}
.prov__tbd {
  color: #8a7500;
  font-style: italic;
}
@media (max-width: 760px) {
  .ways {
    grid-template-columns: 1fr;
  }
  .prov {
    grid-template-columns: 1fr;
  }
  .prov::before {
    left: 50%;
  }
  .prov__unit {
    border-right: none;
    border-bottom: 1.5px dashed var(--yellow-deep);
    padding-right: 0;
    padding-bottom: 1rem;
  }
}
</style>
