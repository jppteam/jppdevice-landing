<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Wordmark from './Wordmark.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'
import { site } from '../data/site.js'

const { t } = useI18n()

const nav = computed(() => [
  { href: '#what', label: t('nav.what') },
  { href: '#apps', label: t('nav.apps') },
  { href: '#developers', label: t('nav.developers') },
  { href: '#specs', label: t('nav.specs') },
  { href: '#open-source', label: t('nav.openSource') },
  { href: '#get-one', label: t('nav.getOne') },
])

const scrolled = ref(false)
const menuOpen = ref(false)
function onScroll() { scrolled.value = window.scrollY > 8 }
onMounted(() => { window.addEventListener('scroll', onScroll, { passive: true }); onScroll() })
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="hd" :class="{ 'hd--scrolled': scrolled }">
    <div class="container hd__inner">
      <a class="hd__brand" href="#top" :aria-label="t('common.brandHome')">
        <Wordmark :bar="false" title="J++ Device" />
      </a>

      <nav class="hd__nav" aria-label="Primary">
        <a v-for="item in nav" :key="item.href" class="hd__link" :href="item.href">{{ item.label }}</a>
      </nav>

      <div class="hd__actions">
        <LocaleSwitcher />
        <a class="btn btn--ink btn--sm" :href="site.links.firmware" target="_blank" rel="noopener">
          {{ t('common.githubLabel') }}
        </a>
        <button
          class="hd__burger"
          :aria-expanded="menuOpen"
          :aria-label="t('nav.toggleMenu')"
          @click="menuOpen = !menuOpen"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>

    <div v-show="menuOpen" class="hd__mobile">
      <a
        v-for="item in nav"
        :key="item.href"
        class="hd__mlink"
        :href="item.href"
        @click="menuOpen = false"
      >{{ item.label }}</a>
    </div>
  </header>
</template>

<style scoped>
.hd {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: saturate(1.4) blur(10px);
  transition: box-shadow 0.2s, border-color 0.2s;
  border-bottom: 1px solid transparent;
}
.hd--scrolled {
  border-bottom-color: var(--line);
  box-shadow: 0 1px 0 rgba(26, 26, 26, 0.02), var(--shadow-sm);
}
.hd__inner {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  height: 64px;
}
.hd__brand {
  font-size: 26px; /* controls wordmark height */
  color: var(--ink);
  display: flex;
  flex-shrink: 0;
}
.hd__nav {
  display: flex;
  gap: 1.4rem;
  margin-left: auto;
}
.hd__link {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 0.92rem;
  color: var(--ink-2);
  padding: 0.3rem 0;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.hd__link:hover {
  color: var(--ink);
  border-bottom-color: var(--yellow);
}
.hd__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: 0.25rem;
}
.hd__burger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 40px;
  padding: 8px;
}
.hd__burger span {
  display: block;
  height: 2px;
  background: var(--ink);
  border-radius: 2px;
}
.hd__mobile {
  display: none;
  flex-direction: column;
  padding: 0.5rem var(--gutter) 1rem;
  border-top: 1px solid var(--line);
  background: var(--white);
}
.hd__mlink {
  font-family: var(--font-display);
  font-weight: 600;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--line);
}

@media (max-width: 860px) {
  .hd__nav { display: none; }
  .hd__burger { display: flex; }
  .hd__mobile { display: flex; }
}
</style>
