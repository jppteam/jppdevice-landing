<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import Wordmark from '../Wordmark.vue'
import DeviceFrame from '../DeviceFrame.vue'
import Badge from '../Badge.vue'
import GithubReposModal from '../GithubReposModal.vue'
import { site } from '../../data/site.js'

const { t } = useI18n()
const reposOpen = ref(false)
</script>

<template>
  <section id="top" class="hero">
    <div class="container hero__inner">
      <div class="hero__copy">
        <h1 class="hero__wm">
          <Wordmark :bar="true" :bleed-out="true" title="J++ Device" />
        </h1>

        <p class="hero__tag">{{ t('hero.tagline') }}</p>

        <p
          class="hero__lead"
          v-html="t('hero.lead', { strongStart: '<strong>', strongEnd: '</strong>' })"
        />

        <p class="hero__scarce">
          <span class="mark-bar">{{ t('hero.scarceBar') }}</span>
          {{ t('hero.scarceRest', { meetup: site.meetup.name }) }}
        </p>

        <div class="hero__cta">
          <button type="button" class="btn btn--yellow btn--lg" @click="reposOpen = true">
            {{ t('hero.ctaBuild') }}
          </button>
        </div>
      </div>

      <div class="hero__device">
        <DeviceFrame :start-scene="1" />
        <p class="hero__cap mono">{{ t('hero.caption') }}</p>
      </div>
    </div>

    <GithubReposModal v-model="reposOpen" />
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  padding-top: clamp(2.5rem, 1rem + 5vw, 5rem);
  padding-bottom: var(--section-y);
  overflow: hidden;
}
/* Full-bleed yellow highlight echoing the wordmark bar, behind the copy. */
.hero__bar {
  position: absolute;
  top: clamp(9rem, 8vw, 13rem);
  left: 0;
  width: min(46%, 640px);
  height: clamp(2.4rem, 4vw, 3.6rem);
  background: var(--yellow);
  z-index: 0;
}
.hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  align-items: center;
  gap: clamp(2rem, 1rem + 4vw, 4.5rem);
}
.hero__eyebrow {
  margin-bottom: 1.5rem;
}
.hero__wm {
  font-size: clamp(3rem, 1.5rem + 6.5vw, 6.2rem);
  color: var(--ink);
  margin-bottom: 1.25rem;
}
.hero__tag {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: clamp(1.25rem, 1rem + 1.4vw, 1.9rem);
  letter-spacing: -0.01em;
  color: var(--ink);
  margin-bottom: 1.1rem;
  max-width: 30rem;
}
.hero__lead {
  font-size: var(--fs-lead);
  color: var(--ink-2);
  max-width: 34rem;
}
.hero__lead strong {
  color: var(--ink);
  font-weight: 600;
}
.hero__scarce {
  margin-top: 1.4rem;
  font-size: 1.05rem;
  font-weight: 500;
  color: var(--ink);
  max-width: 32rem;
}
.hero__cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 2rem;
}
.hero__facts {
  list-style: none;
  padding: 0;
  margin-top: 2.25rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.75rem;
  border-top: 1px solid var(--line);
  padding-top: 1.5rem;
}
.hero__facts li {
  font-size: 0.95rem;
  color: var(--ink-3);
}
.hero__facts b {
  display: block;
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.1;
}
.hero__device {
  position: relative;
}
.hero__cap {
  text-align: center;
  margin-top: 1.25rem;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--ink-3);
  text-transform: uppercase;
}

@media (max-width: 940px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }
  .hero__device {
    order: -1;
    max-width: 420px;
    margin-inline: auto;
  }
  .hero__bar {
    display: none;
  }
}
</style>
