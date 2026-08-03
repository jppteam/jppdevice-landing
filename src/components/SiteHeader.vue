<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import Wordmark from './Wordmark.vue'
import LocaleSwitcher from './LocaleSwitcher.vue'
import { site } from '../data/site.js'

const { t } = useI18n()
const route = useRoute()

const nav = computed(() => [
  { to: { path: '/', hash: '#what' }, label: t('nav.what') },
  { to: { path: '/', hash: '#apps' }, label: t('nav.apps') },
  { to: { path: '/', hash: '#developers' }, label: t('nav.developers') },
  { to: { path: '/', hash: '#specs' }, label: t('nav.specs') },
  { to: { path: '/', hash: '#open-source' }, label: t('nav.openSource') },
  { to: { path: '/', hash: '#get-one' }, label: t('nav.getOne') },
  { to: { path: '/manager' }, label: t('nav.manager'), manager: true },
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
      <router-link class="hd__brand" :to="{ path: '/', hash: '#top' }" :aria-label="t('common.brandHome')">
        <Wordmark :bar="false" title="J++ Device" />
      </router-link>

      <nav class="hd__nav" aria-label="Primary">
        <router-link
          v-for="item in nav"
          :key="item.to.path + (item.to.hash || '')"
          class="hd__link"
          :class="{ 'hd__link--cta': item.manager }"
          :to="item.to"
        >{{ item.label }}</router-link>
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
      <router-link
        v-for="item in nav"
        :key="item.to.path + (item.to.hash || '')"
        class="hd__mlink"
        :class="{ 'hd__mlink--cta': item.manager }"
        :to="item.to"
        @click="menuOpen = false"
      >{{ item.label }}</router-link>
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
.hd__link:hover,
.hd__link.router-link-active {
  color: var(--ink);
  border-bottom-color: var(--yellow);
}
.hd__link--cta {
  color: var(--ink);
  border-bottom-color: var(--yellow);
}
.hd__link--cta.router-link-active {
  color: var(--white);
  background: var(--ink);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
}
.hd__mobile .hd__mlink--cta {
  color: var(--ink);
  font-weight: 800;
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
