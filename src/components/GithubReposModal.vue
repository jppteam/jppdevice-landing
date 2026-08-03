<script setup>
import { onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from './Badge.vue'
import IconGlyph from './IconGlyph.vue'
import { site } from '../data/site.js'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const repoIds = Object.keys(site.links.repos)
const ready = (url) => !!url && url !== '#'

const iconFor = {
  jppdos: 'chip',
  cad: 'tools',
  apps: 'game',
  landing: 'browser'
}

function close() {
  emit('update:modelValue', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeydown)
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="rmodal-fade">
      <div v-if="modelValue" class="rmodal" @click.self="close">
        <div class="rmodal__panel" role="dialog" aria-modal="true" :aria-label="t('repoModal.title')">
          <button class="rmodal__close" type="button" :aria-label="t('repoModal.close')" @click="close">&times;</button>

          <span class="eyebrow rmodal__eyebrow">{{ t('repoModal.eyebrow') }}</span>
          <h2 class="rmodal__title">{{ t('repoModal.title') }}</h2>
          <p class="rmodal__lead">{{ t('repoModal.lead') }}</p>

          <a class="rmodal__all" :href="site.links.jppgitOrg" target="_blank" rel="noopener">
            {{ t('repoModal.browseAll') }} →
          </a>

          <div class="rmodal__list">
            <div
              v-for="id in repoIds"
              :key="id"
              class="rmodal__item"
              :class="{ 'rmodal__item--soon': !ready(site.links.repos[id].github) }"
            >
              <span class="rmodal__icon"><IconGlyph :name="iconFor[id] || 'chip'" /></span>
              <div class="rmodal__text">
                <div class="rmodal__head">
                  <h3 class="rmodal__name">{{ t(`repoModal.repos.${id}.name`) }}</h3>
                  <Badge v-if="!ready(site.links.repos[id].github)" tone="soon">{{ t('common.soon') }}</Badge>
                </div>
                <p class="rmodal__body">{{ t(`repoModal.repos.${id}.body`) }}</p>
                <div class="rmodal__actions">
                  <a
                    v-if="ready(site.links.repos[id].github)"
                    class="btn btn--ink btn--sm"
                    :href="site.links.repos[id].github"
                    target="_blank"
                    rel="noopener"
                  >{{ t('repoModal.githubLabel') }} ↗</a>
                  <a
                    v-if="ready(site.links.repos[id].jppgit)"
                    class="btn btn--ghost btn--sm"
                    :href="site.links.repos[id].jppgit"
                    target="_blank"
                    rel="noopener"
                  >{{ t('repoModal.mirrorLabel') }} ↗</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.rmodal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(26, 26, 26, 0.55);
  backdrop-filter: blur(4px);
}
.rmodal__panel {
  position: relative;
  width: min(640px, 100%);
  max-height: min(85vh, 720px);
  overflow-y: auto;
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: clamp(1.75rem, 1.25rem + 2vw, 2.5rem);
  box-shadow: var(--shadow-lg);
}
.rmodal__close {
  position: absolute;
  top: 1.1rem;
  right: 1.1rem;
  width: 2.2rem;
  height: 2.2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  line-height: 1;
  color: var(--ink-3);
  border-radius: 50%;
  transition: background 0.15s, color 0.15s;
}
.rmodal__close:hover {
  background: var(--paper-2);
  color: var(--ink);
}
.rmodal__eyebrow {
  display: block;
  margin-bottom: 0.5rem;
}
.rmodal__title {
  font-size: var(--fs-h2);
  margin-bottom: 0.6rem;
  padding-right: 2rem;
}
.rmodal__lead {
  color: var(--ink-2);
  margin-bottom: 1.75rem;
  max-width: 34rem;
}
.rmodal__list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.rmodal__item {
  display: flex;
  gap: 1rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
}
.rmodal__item--soon {
  background: var(--paper-2);
  border-style: dashed;
  border-color: var(--yellow-deep);
}
.rmodal__icon {
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
.rmodal__item--soon .rmodal__icon {
  background: var(--white);
  border: 1.5px solid var(--yellow-deep);
}
.rmodal__text {
  min-width: 0;
  flex: 1;
}
.rmodal__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.35rem;
}
.rmodal__name {
  font-size: 1.05rem;
  font-weight: 800;
}
.rmodal__body {
  font-size: 0.92rem;
  color: var(--ink-2);
  margin-bottom: 1rem;
}
.rmodal__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}
.rmodal__all {
  display: inline-block;
  margin-bottom: 1.75rem;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ink);
  border-bottom: 2px solid var(--yellow);
}

.rmodal-fade-enter-active,
.rmodal-fade-leave-active {
  transition: opacity 0.15s var(--ease);
}
.rmodal-fade-enter-from,
.rmodal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .rmodal__panel {
    padding: 1.5rem;
  }
}
</style>
