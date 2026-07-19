<script setup>
import { useI18n } from 'vue-i18n'
import { setLocale, SUPPORTED_LOCALES } from '../i18n/index.js'

const LABELS = { en: 'EN', ru: 'RU' }

const { locale } = useI18n()
</script>

<template>
  <div class="ls" role="group" aria-label="Language">
    <button
      v-for="l in SUPPORTED_LOCALES"
      :key="l"
      class="ls__btn"
      :class="{ 'is-active': locale === l }"
      :aria-pressed="locale === l"
      @click="setLocale(l)"
    >
      {{ LABELS[l] }}
    </button>
  </div>
</template>

<style scoped>
.ls {
  display: flex;
  border: 1.5px solid var(--ink);
  border-radius: 999px;
  overflow: hidden;
}
.ls__btn {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  padding: 0.4rem 0.7rem;
  color: var(--ink-2);
  transition: background-color 0.15s, color 0.15s;
}
.ls__btn.is-active {
  background: var(--ink);
  color: var(--white);
}
.ls__btn:not(.is-active):hover {
  color: var(--ink);
  background: var(--paper-2);
}
</style>
