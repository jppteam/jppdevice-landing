<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from '../Badge.vue'

const { t } = useI18n()

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['update:open'])

const releases = ref([])
const loading = ref(false)
const error = ref('')
const includePrereleases = ref(false)
let fetched = false

async function fetchReleases() {
  if (fetched || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('https://api.github.com/repos/jppteam/jppdos/releases', {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    releases.value = (await res.json()).filter((r) => !r.draft)
    fetched = true
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const visibleReleases = computed(() =>
  releases.value.filter((r) => includePrereleases.value || !r.prerelease)
)

function assetFor(release) {
  return release.assets.find((a) => /-merged\.bin$/i.test(a.name))
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString()
}

function close() {
  emit('update:open', false)
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      fetchReleases()
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
    <Transition name="relmodal-fade">
      <div v-if="open" class="relmodal" @click.self="close">
        <div class="relmodal__panel" role="dialog" aria-modal="true" :aria-label="t('manager.releases.title')">
          <button class="relmodal__close" type="button" :aria-label="t('manager.releases.close')" @click="close">&times;</button>

          <span class="eyebrow relmodal__eyebrow">JPPDOS</span>
          <h2 class="relmodal__title">{{ t('manager.releases.title') }}</h2>
          <p class="relmodal__lead">{{ t('manager.releases.lead') }}</p>

          <label class="relmodal__check">
            <input type="checkbox" v-model="includePrereleases" />
            {{ t('manager.releases.includePrereleases') }}
          </label>

          <div v-if="loading" class="relmodal__status">{{ t('manager.releases.loading') }}</div>
          <div v-else-if="error" class="relmodal__status relmodal__status--err">{{ t('manager.releases.error') }}: {{ error }}</div>
          <div v-else-if="!visibleReleases.length" class="relmodal__status">{{ t('manager.releases.empty') }}</div>

          <ul v-else class="relmodal__list">
            <li v-for="r in visibleReleases" :key="r.id" class="relmodal__item">
              <div class="relmodal__item-text">
                <div class="relmodal__item-head">
                  <strong>{{ r.name || r.tag_name }}</strong>
                  <Badge v-if="r.prerelease" tone="yellow">{{ t('manager.releases.prerelease') }}</Badge>
                </div>
                <span class="relmodal__date mono">{{ formatDate(r.published_at) }}</span>
              </div>
              <div class="relmodal__item-actions">
                <a
                  v-if="assetFor(r)"
                  class="btn btn--ink btn--sm"
                  :href="assetFor(r).browser_download_url"
                >{{ t('manager.releases.downloadBin') }}</a>
                <span v-else class="relmodal__noasset">{{ t('manager.releases.noAsset') }}</span>
                <a class="btn btn--ghost btn--sm" :href="r.html_url" target="_blank" rel="noopener">
                  {{ t('manager.releases.changelog') }} ↗
                </a>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.relmodal {
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
.relmodal__panel {
  position: relative;
  width: min(640px, 100%);
  max-height: min(85vh, 720px);
  overflow-y: auto;
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: clamp(1.75rem, 1.25rem + 2vw, 2.5rem);
  box-shadow: var(--shadow-lg);
}
.relmodal__close {
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
.relmodal__close:hover {
  background: var(--paper-2);
  color: var(--ink);
}
.relmodal__eyebrow {
  display: block;
  margin-bottom: 0.5rem;
}
.relmodal__title {
  font-size: var(--fs-h2);
  margin-bottom: 0.6rem;
  padding-right: 2rem;
}
.relmodal__lead {
  color: var(--ink-2);
  margin-bottom: 1.25rem;
  max-width: 34rem;
}
.relmodal__check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--ink-2);
  margin-bottom: 1.5rem;
  cursor: pointer;
  width: fit-content;
}
.relmodal__status {
  padding: 1.25rem;
  text-align: center;
  color: var(--ink-3);
  border: 1px dashed var(--line);
  border-radius: var(--radius);
}
.relmodal__status--err {
  color: var(--error-deep);
  border-color: var(--error);
}
.relmodal__list {
  all: unset;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.relmodal__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1rem 1.25rem;
}
.relmodal__item-text {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}
.relmodal__item-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.relmodal__date {
  font-size: 0.8rem;
  color: var(--ink-3);
}
.relmodal__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  flex-shrink: 0;
}
.relmodal__noasset {
  font-size: 0.82rem;
  color: var(--ink-3);
}

.relmodal-fade-enter-active,
.relmodal-fade-leave-active {
  transition: opacity 0.15s var(--ease);
}
.relmodal-fade-enter-from,
.relmodal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 560px) {
  .relmodal__panel {
    padding: 1.5rem;
  }
  .relmodal__item {
    flex-direction: column;
    align-items: stretch;
  }
  .relmodal__item-actions .btn {
    flex: 1;
  }
}
</style>
