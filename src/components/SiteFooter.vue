<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Wordmark from './Wordmark.vue'
import { site } from '../data/site.js'

const { t } = useI18n()

const cols = computed(() => [
  {
    title: t('footer.cols.openSource'),
    links: [
      { label: t('footer.links.firmware'), href: site.links.firmware, external: true },
      { label: t('footer.links.appDocs'), href: site.links.appDocs, external: true },
      { label: t('footer.links.cad'), href: site.links.cad, external: true },
    ],
  },
  {
    title: t('footer.cols.roadmap'),
    links: [
      { label: t('footer.links.webFlasher'), to: { path: '/manager' } },
      { label: t('footer.links.webUi'), to: { path: '/manager' } },
    ],
  },
  {
    title: t('footer.cols.thisPage'),
    links: [
      { label: t('footer.links.what'), to: { path: '/', hash: '#what' } },
      { label: t('footer.links.developers'), to: { path: '/', hash: '#developers' } },
      { label: t('footer.links.getOne'), to: { path: '/', hash: '#get-one' } },
    ],
  },
])
</script>

<template>
  <footer class="ft section--ink">
    <div class="container ft__inner">
      <div class="ft__brand">
        <router-link :to="{ path: '/', hash: '#top' }" :aria-label="t('common.brandHome')" class="ft__mark">
          <Wordmark :bar="false" title="J++ Device" />
        </router-link>
        <p class="ft__blurb">
          {{ t('footer.blurb') }}
        </p>
        <p class="ft__made" v-html="t('footer.madeBy', { os: site.os, fw: site.firmwareVersion })" />
      </div>

      <nav class="ft__cols" aria-label="Footer">
        <div v-for="col in cols" :key="col.title" class="ft__col">
          <h3 class="ft__coltitle">{{ col.title }}</h3>
          <ul>
            <li v-for="l in col.links" :key="l.label">
              <a v-if="l.external" :href="l.href" target="_blank" rel="noopener">{{ l.label }}</a>
              <router-link v-else :to="l.to">{{ l.label }}</router-link>
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="container ft__bottom">
      <span>{{ site.domain }}</span>
      <span>{{ t('footer.builtBy', { makers: site.makers }) }}</span>
    </div>
  </footer>
</template>

<style scoped>
.ft {
  padding-block: clamp(3rem, 2rem + 4vw, 5rem) 2rem;
}
.ft__inner {
  display: grid;
  grid-template-columns: 1.3fr 2fr;
  gap: clamp(2rem, 1rem + 5vw, 5rem);
}
.ft__mark {
  font-size: 30px;
  color: var(--white);
  display: inline-flex;
  --wm-ink: #ffffff;
}
.ft__blurb {
  margin-top: 1.1rem;
  color: rgba(255, 255, 255, 0.72);
  max-width: 26rem;
}
.ft__made {
  margin-top: 1rem;
  font-size: var(--fs-sm);
  color: rgba(255, 255, 255, 0.55);
  max-width: 26rem;
}
.ft__made strong {
  color: var(--yellow);
  font-weight: 700;
}
.ft__cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.ft__coltitle {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--yellow);
  font-weight: 700;
  margin-bottom: 0.9rem;
}
.ft__col ul {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.ft__col a {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
}
.ft__col a:hover {
  color: var(--white);
}
.ft__bottom {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: clamp(2.5rem, 1rem + 4vw, 4rem);
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  font-size: var(--fs-sm);
  color: rgba(255, 255, 255, 0.5);
}
@media (max-width: 760px) {
  .ft__inner {
    grid-template-columns: 1fr;
  }
  .ft__cols {
    grid-template-columns: repeat(2, 1fr);
  }
  .ft__bottom {
    flex-direction: column;
    gap: 0.4rem;
  }
}
</style>
